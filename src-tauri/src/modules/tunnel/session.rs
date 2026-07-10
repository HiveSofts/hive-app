use super::cloudflared::cloudflared_bin_path;
use super::db::{
    TunnelSession, tunnel_config_get, tunnel_session_create, tunnel_session_get,
    tunnel_session_get_active, tunnel_session_get_all_active, tunnel_session_history,
    tunnel_session_set_error, tunnel_session_set_url, tunnel_session_stop,
};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Emitter;

static TUNNEL_PROCS: Lazy<Mutex<HashMap<i64, Child>>> = Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartTunnelRequest {
    pub project_path: String,
    pub project_name: String,
    pub local_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelStatus {
    pub session: Option<TunnelSession>,
    pub is_running: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelLog {
    pub session_id: i64,
    pub line: String,
    pub is_error: bool,
    pub timestamp: Option<String>,
}

fn kill_pid(pid: u32) {
    #[cfg(unix)]
    unsafe {
        libc::kill(-(pid as i32), libc::SIGTERM);
        std::thread::sleep(std::time::Duration::from_millis(200));
        libc::kill(-(pid as i32), libc::SIGKILL);
        libc::kill(pid as i32, libc::SIGKILL);
    }
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .output();
    }
}

fn extract_url(line: &str) -> Option<String> {
    if line.trim_start().starts_with('{') {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(url) = v.get("url").and_then(|u| u.as_str()) {
                if url.starts_with("https://") {
                    return Some(url.to_string());
                }
            }
        }
    }

    if let Some(pos) = line.find("https://") {
        let rest = &line[pos..];
        let end = rest
            .find(|c: char| c.is_whitespace() || c == '"' || c == '\'' || c == ',')
            .unwrap_or(rest.len());
        let url = &rest[..end];
        if url.contains('.')
            && (url.contains("trycloudflare.com") || url.contains("cfargotunnel.com"))
        {
            return Some(url.to_string());
        }
    }

    None
}

fn get_log_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home)
        .join(".hive")
        .join("logs")
        .join("tunnels")
}

fn get_log_file(session_id: i64) -> PathBuf {
    get_log_dir().join(format!("{}.log", session_id))
}

/// Write a structured log line:  [RFC3339_TIMESTAMP] [LEVEL] MESSAGE
fn write_log(session_id: i64, line: &str, is_error: bool) {
    let log_file = get_log_file(session_id);
    if let Ok(mut file) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
    {
        let timestamp = chrono::Utc::now().to_rfc3339();
        let level = if is_error { "ERR" } else { "INF" };
        // Format: [2024-01-01T12:00:00Z] [INF] message
        let _ = writeln!(file, "[{}] [{}] {}", timestamp, level, line);
    }
}

/// Parse a log file line back into (timestamp, level, message).
/// Line format: [2024-01-01T12:00:00Z] [INF] rest of message
fn parse_log_line(raw: &str) -> (Option<String>, bool, String) {
    // Must start with '[' for our structured format
    if !raw.starts_with('[') {
        return (None, false, raw.to_string());
    }

    // Extract timestamp between first [ and ]
    let after_open = &raw[1..];
    let ts_end = match after_open.find(']') {
        Some(i) => i,
        None => return (None, false, raw.to_string()),
    };
    let timestamp_str = &after_open[..ts_end];
    // Validate it looks like a timestamp
    if !timestamp_str.contains('T') && !timestamp_str.contains('-') {
        return (None, false, raw.to_string());
    }

    // After first '] ' should be '[LEVEL] message'
    let rest = after_open[ts_end + 1..].trim_start();
    if !rest.starts_with('[') {
        // No level tag – treat whole rest as message
        return (Some(timestamp_str.to_string()), false, rest.to_string());
    }

    let after_level_open = &rest[1..];
    let level_end = match after_level_open.find(']') {
        Some(i) => i,
        None => return (Some(timestamp_str.to_string()), false, rest.to_string()),
    };
    let level = &after_level_open[..level_end];
    let is_error = level.eq_ignore_ascii_case("ERR");

    // Everything after '] ' is the message
    let message = after_level_open[level_end + 1..].trim_start().to_string();

    (Some(timestamp_str.to_string()), is_error, message)
}

#[tauri::command]
pub async fn start_tunnel(
    window: tauri::Window,
    request: StartTunnelRequest,
) -> Result<TunnelSession, String> {
    if let Some(existing) = tunnel_session_get_active(&request.project_path) {
        let _ = stop_tunnel(existing.id).await;
    }

    let bin = cloudflared_bin_path();
    let cloudflared_cmd = if bin.exists() {
        bin.to_string_lossy().to_string()
    } else {
        let sys = Command::new("cloudflared").arg("--version").output();
        if sys.is_err() || !sys.unwrap().status.success() {
            return Err("cloudflared is not installed. Please install it first.".to_string());
        }
        "cloudflared".to_string()
    };

    let session_id = tunnel_session_create(
        &request.project_path,
        &request.project_name,
        &request.local_url,
        None,
    )
    .map_err(|e| e.to_string())?;

    fs::create_dir_all(get_log_dir()).ok();
    write_log(session_id, "=== Tunnel started ===", false);
    write_log(
        session_id,
        &format!("Local URL: {}", request.local_url),
        false,
    );

    let mut cmd = Command::new(&cloudflared_cmd);
    cmd.arg("tunnel").arg("--url").arg(&request.local_url);

    let full_command = format!("{} tunnel --url {}", cloudflared_cmd, request.local_url);
    println!("[TUNNEL] Executing: {}", full_command);
    write_log(session_id, &format!("Command: {}", full_command), false);

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        unsafe {
            cmd.pre_exec(|| {
                libc::setsid();
                Ok(())
            });
        }
    }

    let mut child = cmd.spawn().map_err(|e| {
        let msg = format!(
            "Failed to start cloudflared: {}\nCommand: {}",
            e, full_command
        );
        println!("[TUNNEL ERROR] {}", msg);
        write_log(session_id, &msg, true);
        msg
    })?;

    let pid = child.id();
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    {
        let conn = crate::core::database::DB.lock().unwrap();
        let _ = conn.execute(
            "UPDATE tunnel_sessions SET pid = ?1 WHERE id = ?2",
            rusqlite::params![pid as i64, session_id],
        );
    }

    TUNNEL_PROCS.lock().unwrap().insert(session_id, child);

    // ── stdout thread ──────────────────────────────────────────────────────
    let window_clone = window.clone();
    let sid = session_id;
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            println!("[TUNNEL STDOUT] {}", line);
            write_log(sid, &line, false);

            if let Some(url) = extract_url(&line) {
                println!("[TUNNEL] Found URL: {}", url);
                write_log(sid, &format!("Public URL: {}", url), false);
                tunnel_session_set_url(sid, &url);
                let _ = window_clone.emit(
                    "tunnel-event",
                    serde_json::json!({ "sessionId": sid, "type": "url", "url": url }),
                );
            }
            let _ = window_clone.emit(
                "tunnel-log",
                serde_json::json!({
                    "sessionId": sid,
                    "line": line,
                    "isError": false,
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                }),
            );
        }
    });

    // ── stderr thread ──────────────────────────────────────────────────────
    let window_clone = window.clone();
    let sid = session_id;
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            println!("[TUNNEL STDERR] {}", line);

            let is_error = line.to_lowercase().contains("error")
                || line.to_lowercase().contains("failed")
                || line.to_lowercase().contains("err");

            write_log(sid, &line, is_error);

            if let Some(url) = extract_url(&line) {
                println!("[TUNNEL] Found URL from stderr: {}", url);
                write_log(sid, &format!("Public URL: {}", url), false);
                tunnel_session_set_url(sid, &url);
                let _ = window_clone.emit(
                    "tunnel-event",
                    serde_json::json!({ "sessionId": sid, "type": "url", "url": url }),
                );
            }

            let _ = window_clone.emit(
                "tunnel-log",
                serde_json::json!({
                    "sessionId": sid,
                    "line": line,
                    "isError": is_error,
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                }),
            );
        }

        write_log(sid, "=== Tunnel stopped ===", false);
        tunnel_session_stop(sid);
        let _ = window_clone.emit(
            "tunnel-event",
            serde_json::json!({ "sessionId": sid, "type": "stopped" }),
        );
    });

    let session =
        tunnel_session_get(session_id).ok_or_else(|| "Failed to retrieve session".to_string())?;

    Ok(session)
}

#[tauri::command]
pub async fn stop_tunnel(session_id: i64) -> Result<(), String> {
    write_log(session_id, "=== Stopping tunnel ===", false);

    if let Some(mut child) = TUNNEL_PROCS.lock().unwrap().remove(&session_id) {
        let _ = child.kill();
        let _ = child.wait();
    }

    if let Some(session) = tunnel_session_get(session_id) {
        if let Some(pid) = session.pid {
            kill_pid(pid as u32);
        }
    }

    tunnel_session_stop(session_id);
    write_log(session_id, "=== Tunnel stopped successfully ===", false);
    Ok(())
}

#[tauri::command]
pub async fn stop_all_tunnels() -> Result<(), String> {
    let active = tunnel_session_get_all_active();
    for session in active {
        let _ = stop_tunnel(session.id).await;
    }
    Ok(())
}

#[tauri::command]
pub fn get_tunnel_status(project_path: String) -> TunnelStatus {
    let session = tunnel_session_get_active(&project_path);
    let is_running = session
        .as_ref()
        .map(|s| s.status == "active" || s.status == "connecting")
        .unwrap_or(false);
    TunnelStatus {
        session,
        is_running,
    }
}

#[tauri::command]
pub fn get_all_active_tunnels() -> Vec<TunnelSession> {
    tunnel_session_get_all_active()
}

#[tauri::command]
pub fn get_tunnel_history(limit: Option<usize>) -> Vec<TunnelSession> {
    tunnel_session_history(limit.unwrap_or(50))
}

#[tauri::command]
pub fn get_tunnel_session(session_id: i64) -> Option<TunnelSession> {
    tunnel_session_get(session_id)
}

#[tauri::command]
pub fn get_tunnel_logs(session_id: i64, limit: Option<usize>) -> Result<Vec<TunnelLog>, String> {
    // Verify session exists
    tunnel_session_get(session_id).ok_or_else(|| format!("Session {} not found", session_id))?;

    let log_file = get_log_file(session_id);

    if !log_file.exists() {
        return Ok(vec![]);
    }

    let content =
        fs::read_to_string(&log_file).map_err(|e| format!("Failed to read log file: {}", e))?;

    // Collect non-empty lines
    let all_lines: Vec<&str> = content.lines().filter(|l| !l.trim().is_empty()).collect();

    let limit = limit.unwrap_or(200);
    let start = all_lines.len().saturating_sub(limit);

    let logs = all_lines[start..]
        .iter()
        .map(|raw| {
            let (timestamp, is_error, message) = parse_log_line(raw);
            TunnelLog {
                session_id,
                line: message,
                is_error,
                timestamp,
            }
        })
        .collect();

    Ok(logs)
}

#[tauri::command]
pub fn clear_tunnel_logs(session_id: i64) -> Result<(), String> {
    let log_file = get_log_file(session_id);
    if log_file.exists() {
        fs::write(&log_file, "").map_err(|e| format!("Failed to clear logs: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn start_quick_tunnel(
    window: tauri::Window,
    local_url: String,
    project_name: String,
    project_path: String,
) -> Result<TunnelSession, String> {
    start_tunnel(
        window,
        StartTunnelRequest {
            project_path,
            project_name,
            local_url,
        },
    )
    .await
}
