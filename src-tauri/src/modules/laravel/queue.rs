use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use tauri::command;

lazy_static::lazy_static! {
    static ref WORKER_PIDS: Mutex<HashMap<String, u32>> = Mutex::new(HashMap::new());
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueWorker {
    pub name: String,
    pub pid: Option<u32>,
    pub jobs: u32,
    pub failed: u32,
    pub processed: u32,
    pub status: String,
    pub memory: Option<u32>,
    pub timeout: Option<u32>,
    pub tries: Option<u32>,
    pub queue: Option<String>,
    pub connection: Option<String>,
    pub started_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailedJob {
    pub id: String,
    pub connection: String,
    pub queue: String,
    pub payload: String,
    pub exception: String,
    pub failed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueCommandResult {
    pub success: bool,
    pub output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueStats {
    pub total_workers: u32,
    pub running_workers: u32,
    pub failed_jobs: u32,
    pub pending_jobs: u32,
    pub connection: String,
    pub queues: Vec<QueueInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueInfo {
    pub name: String,
    pub size: u32,
    pub status: String,
}

fn run_artisan(project_path: &str, args: &[&str]) -> Result<(String, String, bool), String> {
    let output = Command::new("php")
        .arg("artisan")
        .args(args)
        .current_dir(project_path)
        .output()
        .map_err(|e| format!("Failed to run artisan: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    Ok((stdout, stderr, output.status.success()))
}

fn get_running_worker_pids(project_path: &str) -> HashMap<String, u32> {
    let mut pids: HashMap<String, u32> = HashMap::new();
    let cmd = format!(
        "ps aux | grep 'queue:work' | grep '{}' | grep -v grep",
        project_path
    );
    let output = Command::new("sh").arg("-c").arg(&cmd).output();

    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() > 10 {
                let pid: u32 = parts[1].parse().unwrap_or(0);
                let cmd_str = parts[10..].join(" ");
                let queue_name = if cmd_str.contains("--queue=") {
                    cmd_str
                        .split("--queue=")
                        .nth(1)
                        .and_then(|q| q.split_whitespace().next())
                        .unwrap_or("default")
                        .to_string()
                } else {
                    "default".to_string()
                };
                if pid > 0 {
                    pids.insert(queue_name, pid);
                }
            }
        }
    }
    pids
}

fn get_queue_connection_from_env(project_path: &str) -> String {
    let env_path = PathBuf::from(project_path).join(".env");
    if let Ok(content) = fs::read_to_string(env_path) {
        for line in content.lines() {
            if line.starts_with("QUEUE_CONNECTION=") {
                return line
                    .split('=')
                    .nth(1)
                    .unwrap_or("database")
                    .trim()
                    .to_string();
            }
        }
    }
    "database".to_string()
}

#[command]
pub async fn get_queue_workers(project_path: String) -> Result<Vec<QueueWorker>, String> {
    if project_path.is_empty() {
        return Err("Project path is empty".to_string());
    }

    let artisan_path = PathBuf::from(&project_path).join("artisan");
    if !artisan_path.exists() {
        return Err("artisan file not found - is this a Laravel project?".to_string());
    }

    let running_pids = get_running_worker_pids(&project_path);
    let stored_pids = WORKER_PIDS.lock().unwrap().clone();
    let mut all_pids: HashMap<String, u32> = running_pids.clone();
    for (k, v) in stored_pids {
        all_pids.entry(k).or_insert(v);
    }

    let connection = get_queue_connection_from_env(&project_path);

    if all_pids.is_empty() {
        return Ok(vec![QueueWorker {
            name: "default".to_string(),
            pid: None,
            jobs: 0,
            failed: 0,
            processed: 0,
            status: "stopped".to_string(),
            memory: Some(128),
            timeout: Some(60),
            tries: Some(3),
            queue: Some("default".to_string()),
            connection: Some(connection),
            started_at: None,
        }]);
    }

    let mut workers = Vec::new();
    for (queue_name, pid) in &all_pids {
        let is_running = running_pids.contains_key(queue_name);
        workers.push(QueueWorker {
            name: queue_name.clone(),
            pid: Some(*pid),
            jobs: 0,
            failed: 0,
            processed: 0,
            status: if is_running { "running" } else { "stopped" }.to_string(),
            memory: Some(128),
            timeout: Some(60),
            tries: Some(3),
            queue: Some(queue_name.clone()),
            connection: Some(connection.clone()),
            started_at: None,
        });
    }

    Ok(workers)
}

#[command]
pub async fn start_queue_worker(
    project_path: String,
    worker_name: String,
    queue: Option<String>,
    memory: Option<u32>,
    timeout: Option<u32>,
    tries: Option<u32>,
    connection: Option<String>,
) -> Result<String, String> {
    if project_path.is_empty() {
        return Err("Project path is empty".to_string());
    }

    let artisan_path = PathBuf::from(&project_path).join("artisan");
    if !artisan_path.exists() {
        return Err("artisan not found in project".to_string());
    }

    let queue_str = queue.unwrap_or_else(|| worker_name.clone());
    let memory_val = memory.unwrap_or(128);
    let timeout_val = timeout.unwrap_or(60);
    let tries_val = tries.unwrap_or(3);

    let mut artisan_cmd = format!(
        "php artisan queue:work --queue={} --memory={} --timeout={} --tries={}",
        queue_str, memory_val, timeout_val, tries_val
    );

    if let Some(conn) = connection {
        if !conn.is_empty() {
            artisan_cmd.push_str(&format!(" {}", conn));
        }
    }

    open_terminal(&project_path, &artisan_cmd, &worker_name)
}

#[cfg(target_os = "macos")]
fn open_terminal(
    project_path: &str,
    artisan_cmd: &str,
    worker_name: &str,
) -> Result<String, String> {
    let script = format!(
        "tell application \"Terminal\"\nactivate\ndo script \"cd '{}' && {}\"\nend tell",
        project_path, artisan_cmd
    );
    Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .spawn()
        .map_err(|e| format!("Failed to open Terminal: {}", e))?;

    Ok(format!("Opened terminal for worker '{}'", worker_name))
}

#[cfg(target_os = "linux")]
fn open_terminal(
    project_path: &str,
    artisan_cmd: &str,
    worker_name: &str,
) -> Result<String, String> {
    let full_cmd = format!("cd '{}' && {}; exec bash", project_path, artisan_cmd);

    let terminals = [
        ("gnome-terminal", vec!["--", "bash", "-c"]),
        ("xterm", vec!["-e", "bash", "-c"]),
        ("konsole", vec!["--noclose", "-e", "bash", "-c"]),
        ("xfce4-terminal", vec!["--hold", "-e", "bash", "-c"]),
    ];

    for (term, args) in &terminals {
        let exists = Command::new("which")
            .arg(term)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

        if exists {
            let mut cmd = Command::new(term);
            for arg in args {
                cmd.arg(arg);
            }
            cmd.arg(&full_cmd)
                .spawn()
                .map_err(|e| format!("Failed to open {}: {}", term, e))?;
            return Ok(format!("Opened {} for worker '{}'", term, worker_name));
        }
    }

    Err(
        "No terminal emulator found (install gnome-terminal, xterm, konsole, or xfce4-terminal)"
            .to_string(),
    )
}

#[cfg(target_os = "windows")]
fn open_terminal(
    project_path: &str,
    artisan_cmd: &str,
    worker_name: &str,
) -> Result<String, String> {
    let full_cmd = format!("cd /d \"{}\" && {}", project_path, artisan_cmd);
    Command::new("cmd")
        .args(["/C", "start", "cmd", "/K", &full_cmd])
        .spawn()
        .map_err(|e| format!("Failed to open terminal: {}", e))?;

    Ok(format!("Opened cmd for worker '{}'", worker_name))
}

#[command]
pub async fn stop_queue_worker(
    project_path: String,
    worker_name: String,
) -> Result<String, String> {
    let running_pids = get_running_worker_pids(&project_path);

    if let Some(pid) = running_pids.get(&worker_name) {
        let _ = Command::new("kill")
            .arg("-SIGTERM")
            .arg(pid.to_string())
            .output();

        std::thread::sleep(std::time::Duration::from_millis(500));

        let still_running = Command::new("kill")
            .arg("-0")
            .arg(pid.to_string())
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

        if still_running {
            let _ = Command::new("kill")
                .arg("-SIGKILL")
                .arg(pid.to_string())
                .output();
            WORKER_PIDS.lock().unwrap().remove(&worker_name);
            return Ok(format!("Worker '{}' force stopped", worker_name));
        }

        WORKER_PIDS.lock().unwrap().remove(&worker_name);
        return Ok(format!("Worker '{}' stopped", worker_name));
    }

    let kill_cmd = format!(
        "pkill -f 'queue:work.*{}' || pkill -f 'queue:work' || true",
        worker_name
    );
    let _ = Command::new("sh").arg("-c").arg(&kill_cmd).output();

    WORKER_PIDS.lock().unwrap().remove(&worker_name);
    Ok(format!("Worker '{}' stopped", worker_name))
}

#[command]
pub async fn restart_queue_worker(project_path: String) -> Result<String, String> {
    let (stdout, stderr, success) = run_artisan(&project_path, &["queue:restart"])?;
    if success {
        Ok(format!(
            "Queue workers signaled to restart: {}",
            stdout.trim()
        ))
    } else {
        Err(format!("Failed to restart: {}", stderr))
    }
}

#[command]
pub async fn get_failed_jobs(project_path: String) -> Result<Vec<FailedJob>, String> {
    let (stdout, _stderr, _) = run_artisan(&project_path, &["queue:failed", "--no-ansi"])?;

    let mut jobs = Vec::new();
    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('|') && !trimmed.contains("---") && !trimmed.contains(" ID ") {
            let parts: Vec<&str> = trimmed.split('|').map(|p| p.trim()).collect();
            if parts.len() >= 6 {
                let id = parts[1].to_string();
                if id.is_empty() {
                    continue;
                }
                jobs.push(FailedJob {
                    id,
                    connection: parts[2].to_string(),
                    queue: parts[3].to_string(),
                    payload: parts[4].to_string(),
                    exception: parts[5].to_string(),
                    failed_at: parts.get(6).unwrap_or(&"").to_string(),
                });
            }
        }
    }

    Ok(jobs)
}

#[command]
pub async fn retry_failed_job(project_path: String, job_id: String) -> Result<String, String> {
    let (stdout, stderr, success) = run_artisan(&project_path, &["queue:retry", &job_id])?;
    if success {
        Ok(format!("Job {} retried: {}", job_id, stdout.trim()))
    } else {
        Err(format!("Failed to retry: {}", stderr))
    }
}

#[command]
pub async fn retry_all_failed_jobs(project_path: String) -> Result<String, String> {
    let (stdout, stderr, success) = run_artisan(&project_path, &["queue:retry", "all"])?;
    if success {
        Ok(format!("All jobs retried: {}", stdout.trim()))
    } else {
        Err(format!("Failed: {}", stderr))
    }
}

#[command]
pub async fn flush_failed_jobs(project_path: String) -> Result<String, String> {
    let (stdout, stderr, success) = run_artisan(&project_path, &["queue:flush"])?;
    if success {
        Ok(stdout.trim().to_string())
    } else {
        Err(format!("Failed to flush: {}", stderr))
    }
}

#[command]
pub async fn forget_failed_job(project_path: String, job_id: String) -> Result<String, String> {
    let (stdout, stderr, success) = run_artisan(&project_path, &["queue:forget", &job_id])?;
    if success {
        Ok(format!("Job {} deleted: {}", job_id, stdout.trim()))
    } else {
        Err(format!("Failed to delete: {}", stderr))
    }
}

#[command]
pub async fn clear_queue(
    project_path: String,
    queue_name: Option<String>,
) -> Result<String, String> {
    let mut args = vec!["queue:clear"];
    let name_owned;
    if let Some(ref name) = queue_name {
        args.push("--queue");
        name_owned = name.clone();
        args.push(name_owned.as_str());
    }
    args.push("--force");

    let (stdout, stderr, success) = run_artisan(&project_path, &args)?;
    if success {
        Ok(stdout.trim().to_string())
    } else {
        Err(format!("Failed to clear queue: {}", stderr))
    }
}

#[command]
pub async fn pause_queue(project_path: String, queue_name: String) -> Result<String, String> {
    let (_, stderr, success) =
        run_artisan(&project_path, &["queue:pause", "--queue", &queue_name])?;
    if success {
        Ok(format!("Queue '{}' paused", queue_name))
    } else {
        Err(format!("Failed: {}", stderr))
    }
}

#[command]
pub async fn resume_queue(project_path: String, queue_name: String) -> Result<String, String> {
    let (_, stderr, success) =
        run_artisan(&project_path, &["queue:resume", "--queue", &queue_name])?;
    if success {
        Ok(format!("Queue '{}' resumed", queue_name))
    } else {
        Err(format!("Failed: {}", stderr))
    }
}

#[command]
pub async fn get_queue_worker_logs(
    project_path: String,
    worker_name: String,
    lines: Option<usize>,
) -> Result<Vec<String>, String> {
    let max_lines = lines.unwrap_or(300);

    let paths = vec![
        PathBuf::from(&project_path)
            .join("storage")
            .join("logs")
            .join(format!("queue-{}.log", worker_name)),
        PathBuf::from(&project_path)
            .join("storage")
            .join("logs")
            .join("queue-worker.log"),
        PathBuf::from(&project_path)
            .join("storage")
            .join("logs")
            .join("laravel.log"),
    ];

    for path in paths {
        if path.exists() {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let all_lines: Vec<String> = content
                .lines()
                .filter(|l| !l.trim().is_empty())
                .map(|l| l.to_string())
                .collect();
            let start = all_lines.len().saturating_sub(max_lines);
            return Ok(all_lines[start..].to_vec());
        }
    }

    Ok(vec![])
}

#[command]
pub async fn get_queue_stats(project_path: String) -> Result<QueueStats, String> {
    let running_pids = get_running_worker_pids(&project_path);
    let connection = get_queue_connection_from_env(&project_path);

    let failed_count = run_artisan(&project_path, &["queue:failed", "--no-ansi"])
        .map(|(stdout, _, _)| {
            stdout
                .lines()
                .filter(|l| {
                    let t = l.trim();
                    t.starts_with('|') && !t.contains("---") && !t.contains(" ID ")
                })
                .count() as u32
        })
        .unwrap_or(0);

    let queues = running_pids
        .keys()
        .map(|name| QueueInfo {
            name: name.clone(),
            size: 0,
            status: "running".to_string(),
        })
        .collect();

    Ok(QueueStats {
        total_workers: running_pids.len() as u32,
        running_workers: running_pids.len() as u32,
        failed_jobs: failed_count,
        pending_jobs: 0,
        connection,
        queues,
    })
}

#[command]
pub async fn run_queue_command(
    project_path: String,
    command: String,
    args: Vec<String>,
) -> Result<QueueCommandResult, String> {
    let mut artisan_args = vec![command.as_str()];
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    artisan_args.extend_from_slice(&args_refs);

    let (stdout, stderr, success) = run_artisan(&project_path, &artisan_args)?;
    Ok(QueueCommandResult {
        success,
        output: if stdout.trim().is_empty() {
            stderr
        } else {
            stdout
        },
    })
}

#[command]
pub async fn get_queue_connection_info(
    project_path: String,
) -> Result<HashMap<String, String>, String> {
    let mut info = HashMap::new();
    let env_path = PathBuf::from(&project_path).join(".env");

    if let Ok(content) = fs::read_to_string(env_path) {
        for line in content.lines() {
            if line.starts_with("QUEUE_CONNECTION=")
                || line.starts_with("REDIS_HOST=")
                || line.starts_with("DB_CONNECTION=")
            {
                let mut parts = line.splitn(2, '=');
                if let (Some(k), Some(v)) = (parts.next(), parts.next()) {
                    info.insert(k.to_string(), v.trim().to_string());
                }
            }
        }
    }

    if !info.contains_key("QUEUE_CONNECTION") {
        info.insert("QUEUE_CONNECTION".to_string(), "database".to_string());
    }

    Ok(info)
}
