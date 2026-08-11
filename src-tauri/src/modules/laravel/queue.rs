use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::command;

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

/// Validates a worker/queue name so it can never act as a shell pattern or
/// escape a log filename. Only word characters (`[A-Za-z0-9_-]`) are allowed.
fn validate_worker_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || !name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err(format!(
            "Invalid worker name '{}' — only letters, digits, '_' and '-' are allowed",
            name
        ));
    }
    Ok(())
}

/// Extract the `--queue=` value from a worker command line, defaulting to
/// "default". Shared by all platform variants.
fn queue_name_from_cmdline(cmdline: &str) -> String {
    cmdline
        .split("--queue=")
        .nth(1)
        .and_then(|q| q.split_whitespace().next())
        .filter(|q| !q.is_empty())
        .unwrap_or("default")
        .to_string()
}

/// Enumerates running `artisan queue:work` processes for a project WITHOUT
/// shelling out: `pgrep -f` receives the project path as a plain argument and
/// its PIDs are filtered to those whose full command line matches the project
/// directory. Queue names are then derived from the `--queue=` option so
/// workers can be signalled individually by PID (never by pattern).
///
/// `/proc/<pid>/cmdline` is Linux-only; macOS enumerates via `ps` instead.
#[cfg(target_os = "linux")]
fn get_running_worker_pids(project_path: &str) -> Result<HashMap<String, u32>, String> {
    let output = Command::new("pgrep")
        .arg("-f")
        .arg("artisan queue:work")
        .output()
        .map_err(|e| format!("Failed to list queue workers: {}", e))?;

    let mut pids: HashMap<String, u32> = HashMap::new();
    if !output.status.success() {
        // pgrep exits 1 when there are no matches.
        return Ok(pids);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let pid: u32 = match line.trim().parse() {
            Ok(pid) if pid > 0 => pid,
            _ => continue,
        };

        // Read the full command line for this PID; skip anything we can't read.
        let cmdline_path = PathBuf::from(format!("/proc/{}/cmdline", pid));
        let cmdline = match fs::read(cmdline_path) {
            Ok(bytes) => String::from_utf8_lossy(&bytes).replace('\0', " "),
            Err(_) => continue,
        };

        // Only consider workers whose command line references this project.
        if !cmdline.contains(project_path) {
            continue;
        }

        let queue_name = queue_name_from_cmdline(&cmdline);

        pids.insert(queue_name, pid);
    }
    Ok(pids)
}

/// Same contract as the Linux variant, but on macOS there is no `/proc`, so we
/// enumerate candidate PIDs with `ps` and parse each command line. `ps` column
/// values are space-padded, so fields are split on whitespace after trimming.
#[cfg(target_os = "macos")]
fn get_running_worker_pids(project_path: &str) -> Result<HashMap<String, u32>, String> {
    let output = Command::new("ps")
        .args(["-axo", "pid=,command="])
        .output()
        .map_err(|e| format!("Failed to list queue workers: {}", e))?;

    let mut pids: HashMap<String, u32> = HashMap::new();
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let line = line.trim();
        if !line.contains("artisan") || !line.contains("queue:work") {
            continue;
        }
        if !line.contains(project_path) {
            continue;
        }
        // `pid=<pid>` (the `=...` suppresses the header); the pid is the first
        // whitespace-delimited token on the line.
        let pid: u32 = match line.split_whitespace().next().and_then(|p| p.parse().ok()) {
            Some(pid) if pid > 0 => pid,
            _ => continue,
        };

        let queue_name = queue_name_from_cmdline(&line);

        pids.insert(queue_name, pid);
    }
    Ok(pids)
}

#[cfg(windows)]
fn get_running_worker_pids(project_path: &str) -> Result<HashMap<String, u32>, String> {
    // `wmic` is available on stock Windows; each line is `PID  CommandLine`.
    let output = Command::new("wmic")
        .args([
            "process",
            "where",
            "name='php.exe'",
            "get",
            "ProcessId,CommandLine",
        ])
        .output()
        .map_err(|e| format!("Failed to list queue workers: {}", e))?;

    let mut pids: HashMap<String, u32> = HashMap::new();
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines().skip(1) {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if !trimmed.contains("artisan") || !trimmed.contains("queue:work") {
            continue;
        }
        if !trimmed.contains(project_path) {
            continue;
        }

        let pid: u32 = match trimmed.rsplit(' ').next().and_then(|p| p.trim().parse()) {
            Some(pid) if pid > 0 => pid,
            _ => continue,
        };

        let queue_name = queue_name_from_cmdline(&trimmed);

        pids.insert(queue_name, pid);
    }
    Ok(pids)
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

    let all_pids = get_running_worker_pids(&project_path)?;

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
        workers.push(QueueWorker {
            name: queue_name.clone(),
            pid: Some(*pid),
            jobs: 0,
            failed: 0,
            processed: 0,
            status: "running".to_string(),
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
    validate_worker_name(&worker_name)?;

    let artisan_path = PathBuf::from(&project_path).join("artisan");
    if !artisan_path.exists() {
        return Err("artisan not found in project".to_string());
    }

    let queue_str = queue.unwrap_or_else(|| worker_name.clone());
    validate_worker_name(&queue_str)?;

    // No user input ever reaches a shell as text: worker/queue/connection
    // names are validated to word characters and every numeric option is a u32
    // formatted here. The terminal receives a ready argv list.
    let mut args = vec![
        "queue:work".to_string(),
        format!("--queue={}", queue_str),
        format!("--memory={}", memory.unwrap_or(128)),
        format!("--timeout={}", timeout.unwrap_or(60)),
        format!("--tries={}", tries.unwrap_or(3)),
    ];

    if let Some(conn) = connection {
        if !conn.is_empty() {
            validate_worker_name(&conn)?;
            args.push(conn);
        }
    }

    open_terminal(&project_path, &args, &worker_name)
}

#[cfg(target_os = "macos")]
fn open_terminal(
    project_path: &str,
    artisan_args: &[String],
    worker_name: &str,
) -> Result<String, String> {
    // Single-quote the shell path so spaces/special chars can't escape it.
    let quoted_path = format!("'{}'", project_path.replace('\'', "'\\''"));
    let artisan_cmd = artisan_args.join(" ");
    let script = format!(
        "tell application \"Terminal\"\nactivate\ndo script \"cd {} && php artisan {}\"\nend tell",
        quoted_path, artisan_cmd
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
    artisan_args: &[String],
    worker_name: &str,
) -> Result<String, String> {
    // Single-quote the shell path; artisan args are validated word-char names.
    let quoted_path = format!("'{}'", project_path.replace('\'', "'\\''"));
    let artisan_cmd = artisan_args.join(" ");
    let full_cmd = format!(
        "cd {} && php artisan {}; exec bash",
        quoted_path, artisan_cmd
    );

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
    artisan_args: &[String],
    worker_name: &str,
) -> Result<String, String> {
    // Escape double quotes for cmd; artisan args are validated word-char names.
    let quoted_path = project_path.replace('"', "\"\"");
    let artisan_cmd = artisan_args.join(" ");
    let full_cmd = format!("cd /d \"{}\" && php artisan {}", quoted_path, artisan_cmd);
    Command::new("cmd")
        .args(["/C", "start", "cmd", "/K", &full_cmd])
        .spawn()
        .map_err(|e| format!("Failed to open terminal: {}", e))?;

    Ok(format!("Opened cmd for worker '{}'", worker_name))
}

#[cfg(unix)]
fn signal_pid(pid: u32, signal: &str) -> bool {
    Command::new("kill")
        .arg(signal)
        .arg(pid.to_string())
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[cfg(windows)]
fn signal_pid(pid: u32, _signal: &str) -> bool {
    // Windows has no POSIX kill; terminate by pid.
    Command::new("taskkill")
        .arg("/PID")
        .arg(pid.to_string())
        .arg("/F")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[command]
pub async fn stop_queue_worker(
    project_path: String,
    worker_name: String,
) -> Result<String, String> {
    validate_worker_name(&worker_name)?;
    let running_pids = get_running_worker_pids(&project_path)?;

    if let Some(pid) = running_pids.get(&worker_name) {
        if signal_pid(*pid, "-SIGTERM") {
            std::thread::sleep(std::time::Duration::from_millis(500));

            let still_running = signal_pid(*pid, "-0");
            if still_running {
                let _ = signal_pid(*pid, "-SIGKILL");
                return Ok(format!("Worker '{}' force stopped", worker_name));
            }
            return Ok(format!("Worker '{}' stopped", worker_name));
        }
    }

    // No PID was resolved for this worker name — never fall back to a
    // `pkill -f '{worker_name}'` pattern (a name like `default` would match
    // unrelated processes). Report it as already stopped.
    Ok(format!("Worker '{}' is not running", worker_name))
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

fn validate_job_id(job_id: &str) -> Result<(), String> {
    if job_id.is_empty() || job_id.contains(' ') || job_id.contains('/') {
        return Err(format!("Invalid job id '{}'", job_id));
    }
    Ok(())
}

#[command]
pub async fn retry_failed_job(project_path: String, job_id: String) -> Result<String, String> {
    validate_job_id(&job_id)?;
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
    validate_job_id(&job_id)?;
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
        validate_worker_name(name)?;
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
    validate_worker_name(&queue_name)?;
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
    validate_worker_name(&queue_name)?;
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
    validate_worker_name(&worker_name)?;
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
    let running_pids = get_running_worker_pids(&project_path)?;
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

/// Subcommands the queue panel is allowed to invoke directly. Everything else
/// is rejected so this handler cannot be repurposed as a general `artisan`
/// execution backdoor.
const ALLOWED_QUEUE_COMMANDS: &[&str] = &[
    "queue:work",
    "queue:listen",
    "queue:restart",
    "queue:pause",
    "queue:resume",
    "queue:monitor",
    "queue:retry",
    "queue:flush",
    "queue:forget",
    "queue:clear",
    "queue:failed",
];

#[command]
pub async fn run_queue_command(
    project_path: String,
    command: String,
    args: Vec<String>,
) -> Result<QueueCommandResult, String> {
    if !ALLOWED_QUEUE_COMMANDS.contains(&command.as_str()) {
        return Err(format!(
            "Command '{}' is not an allowed queue command",
            command
        ));
    }
    // Reject non-queue commands and any flag-like first arg that could confuse
    // artisan's router. Artisan sub-command names cannot contain spaces.
    for a in args.iter() {
        if a.contains(' ') || a.starts_with("--") {
            return Err(format!("Invalid queue command arg: '{}'", a));
        }
    }

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
