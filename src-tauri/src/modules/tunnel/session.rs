use super::cloudflared::cloudflared_bin_path;
use super::db::{
    TunnelSession, tunnel_config_get, tunnel_session_create, tunnel_session_get,
    tunnel_session_get_active, tunnel_session_get_all_active, tunnel_session_history,
    tunnel_session_set_error, tunnel_session_set_url, tunnel_session_stop,
};
use crate::core::database::{Event, EventCategory};
use crate::core::system::process::PROCESS_REGISTRY;
use crate::modules::common::server::kill_pid_tree;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::Emitter;

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
    crate::modules::common::path::hive_base_dir()
        .join("logs")
        .join("tunnels")
}

fn get_log_file(session_id: i64) -> PathBuf {
    get_log_dir().join(format!("{}.log", session_id))
}

fn write_log(session_id: i64, line: &str, is_error: bool) {
    let log_file = get_log_file(session_id);
    if let Ok(mut file) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
    {
        let timestamp = chrono::Utc::now().to_rfc3339();
        let level = if is_error { "ERR" } else { "INF" };
        let _ = writeln!(file, "[{}] [{}] {}", timestamp, level, line);
    }
}

fn parse_log_line(raw: &str) -> (Option<String>, bool, String) {
    if !raw.starts_with('[') {
        return (None, false, raw.to_string());
    }

    let after_open = &raw[1..];
    let ts_end = match after_open.find(']') {
        Some(i) => i,
        None => return (None, false, raw.to_string()),
    };
    let timestamp_str = &after_open[..ts_end];
    if !timestamp_str.contains('T') && !timestamp_str.contains('-') {
        return (None, false, raw.to_string());
    }

    let rest = after_open[ts_end + 1..].trim_start();
    if !rest.starts_with('[') {
        return (Some(timestamp_str.to_string()), false, rest.to_string());
    }

    let after_level_open = &rest[1..];
    let level_end = match after_level_open.find(']') {
        Some(i) => i,
        None => return (Some(timestamp_str.to_string()), false, rest.to_string()),
    };
    let level = &after_level_open[..level_end];
    let is_error = level.eq_ignore_ascii_case("ERR");

    let message = after_level_open[level_end + 1..].trim_start().to_string();

    (Some(timestamp_str.to_string()), is_error, message)
}

#[tauri::command]
pub async fn start_tunnel(
    window: tauri::Window,
    request: StartTunnelRequest,
) -> Result<TunnelSession, String> {
    let _ = Event::info(
        EventCategory::Tunnel,
        "tunnel.starting",
        "Starting Tunnel",
        &format!("Starting tunnel for project: {}", request.project_name),
    );

    if let Some(existing) = tunnel_session_get_active(&request.project_path) {
        let _ = stop_tunnel(existing.id).await;
    }

    let bin = cloudflared_bin_path();
    let cloudflared_cmd = if bin.exists() {
        bin.to_string_lossy().to_string()
    } else {
        let sys = Command::new("cloudflared").arg("--version").output();
        let cloudflared_available = match sys {
            Ok(out) => out.status.success(),
            Err(_) => false,
        };
        if !cloudflared_available {
            let _ = Event::error(
                EventCategory::Tunnel,
                "tunnel.cloudflared.missing",
                "Cloudflared Not Installed",
                "cloudflared is not installed. Please install it first.",
            );
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
        write_log(session_id, &msg, true);
        let _ = Event::error(
            EventCategory::Tunnel,
            "tunnel.start.failed",
            "Failed to Start Tunnel",
            &msg,
        );
        msg
    })?;

    let pid = child.id();
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture cloudflared stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture cloudflared stderr".to_string())?;

    if let Ok(conn) = crate::core::database::db() {
        let _ = conn.execute(
            "UPDATE tunnel_sessions SET pid = ?1 WHERE id = ?2",
            rusqlite::params![pid as i64, session_id],
        );
    }

    PROCESS_REGISTRY.insert(session_id.to_string(), child);

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

    let _ = Event::success(
        EventCategory::Tunnel,
        "tunnel.started",
        "Tunnel Started",
        &format!("Tunnel started for project: {}", request.project_name),
    );

    Ok(session)
}

#[tauri::command]
pub async fn stop_tunnel(session_id: i64) -> Result<(), String> {
    write_log(session_id, "=== Stopping tunnel ===", false);

    let _ = Event::info(
        EventCategory::Tunnel,
        "tunnel.stopping",
        "Stopping Tunnel",
        &format!("Stopping tunnel session: {}", session_id),
    );

    // `kill_tree` only touches children currently held in the registry. A
    // tunnel that survived a previous app run lives on only in the DB, so
    // re-check the recorded PID as a fallback for orphaned cloudflared.
    let held = PROCESS_REGISTRY.kill_tree(&session_id.to_string());
    if !held {
        if let Some(session) = tunnel_session_get(session_id) {
            if let Some(pid) = session.pid {
                kill_pid_tree(pid as u32);
            }
        }
    }
    tunnel_session_stop(session_id);
    write_log(session_id, "=== Tunnel stopped successfully ===", false);

    let _ = Event::success(
        EventCategory::Tunnel,
        "tunnel.stopped",
        "Tunnel Stopped",
        &format!("Tunnel session {} stopped successfully", session_id),
    );

    Ok(())
}

#[tauri::command]
pub async fn stop_all_tunnels() -> Result<(), String> {
    let _ = Event::info(
        EventCategory::Tunnel,
        "tunnel.stopping_all",
        "Stopping All Tunnels",
        "Stopping all active tunnels",
    );

    let active = tunnel_session_get_all_active();
    for session in active {
        let _ = stop_tunnel(session.id).await;
    }

    let _ = Event::success(
        EventCategory::Tunnel,
        "tunnel.all_stopped",
        "All Tunnels Stopped",
        "All tunnels stopped successfully",
    );

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
    tunnel_session_get(session_id).ok_or_else(|| format!("Session {} not found", session_id))?;

    let log_file = get_log_file(session_id);

    if !log_file.exists() {
        return Ok(vec![]);
    }

    let content =
        fs::read_to_string(&log_file).map_err(|e| format!("Failed to read log file: {}", e))?;

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
        let _ = Event::info(
            EventCategory::Tunnel,
            "tunnel.logs.cleared",
            "Tunnel Logs Cleared",
            &format!("Cleared logs for tunnel session: {}", session_id),
        );
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
