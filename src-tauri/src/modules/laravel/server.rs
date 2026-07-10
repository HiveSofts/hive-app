use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::command;

use crate::core::database::models;

lazy_static::lazy_static! {
    static ref PROCESSES: Mutex<HashMap<String, Child>> = Mutex::new(HashMap::new());
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ServerStatus {
    pub project_path: String,
    pub project_name: String,
    pub project_type: String,
    pub port: u16,
    pub pid: u32,
    pub url: String,
    pub started_at: String,
    pub is_running: bool,
}

impl From<models::ServerRecord> for ServerStatus {
    fn from(r: models::ServerRecord) -> Self {
        Self {
            project_path: r.project_path,
            project_name: r.project_name,
            project_type: r.project_type,
            port: r.port,
            pid: r.pid,
            url: r.url,
            started_at: r.started_at,
            is_running: r.is_running,
        }
    }
}

fn port_is_open(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(250)).is_ok()
}

fn server_alive(pid: u32, port: u16) -> bool {
    models::pid_alive(pid) || port_is_open(port)
}

pub fn cleanup_orphaned_servers() {
    if let Ok(servers) = models::get_all_running_servers() {
        for s in servers {
            if !server_alive(s.pid, s.port) {
                let _ = models::mark_stopped(&s.project_path);
            }
        }
    }
}

fn free_port(start: u16) -> u16 {
    (start..start + 100)
        .find(|&p| TcpListener::bind(("127.0.0.1", p)).is_ok())
        .unwrap_or(start)
}

fn kill_pid(pid: u32) {
    #[cfg(unix)]
    unsafe {
        libc::kill(pid as i32, libc::SIGKILL);
    }
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .output();
    }
}

fn log_dir(project_name: &str) -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home)
        .join(".hive")
        .join("logs")
        .join("projects")
        .join(project_name)
}

fn log_file_path(project_name: &str) -> PathBuf {
    log_dir(project_name).join("server.log")
}

fn open_log_file(project_name: &str) -> std::io::Result<File> {
    fs::create_dir_all(log_dir(project_name))?;
    OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_file_path(project_name))
}

fn pipe_to_log(stdout: std::process::ChildStdout, stderr: std::process::ChildStderr, name: String) {
    let name2 = name.clone();
    thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if let Ok(mut f) = open_log_file(&name) {
                let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
                let _ = writeln!(f, "[{ts}] {line}");
            }
        }
    });
    thread::spawn(move || {
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            if let Ok(mut f) = open_log_file(&name2) {
                let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
                let _ = writeln!(f, "[{ts}] [ERR] {line}");
            }
        }
    });
}

#[command]
pub async fn start_laravel_project(project_path: String) -> Result<ServerStatus, String> {
    let existing = models::get_server(&project_path).map_err(|e| e.to_string())?;

    if let Some(rec) = existing.clone() {
        if rec.is_running && server_alive(rec.pid, rec.port) {
            return Ok(rec.into());
        }
    }

    let _ = stop_laravel_project(project_path.clone()).await;

    let project_name = std::path::Path::new(&project_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let port = if let Some(rec) = existing {
        if !port_is_open(rec.port) {
            rec.port
        } else {
            free_port(8000)
        }
    } else {
        free_port(8000)
    };

    fs::create_dir_all(log_dir(&project_name)).map_err(|e| e.to_string())?;

    let started_at = chrono::Utc::now().to_rfc3339();
    if let Ok(mut f) = open_log_file(&project_name) {
        let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
        let _ = writeln!(f, "[{ts}] === Server starting on port {port} ===");
    }

    let composer_path = {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
            .join(".hive")
            .join("bin")
            .join("composer")
    };

    let composer_json_path = PathBuf::from(&project_path).join("composer.json");
    if composer_json_path.exists() {
        let content = fs::read_to_string(&composer_json_path).map_err(|e| e.to_string())?;
        let mut json: serde_json::Value =
            serde_json::from_str(&content).map_err(|e| e.to_string())?;
        let has_dev = json.get("scripts").and_then(|s| s.get("dev")).is_some();
        if !has_dev {
            let scripts = json.get_mut("scripts").and_then(|s| s.as_object_mut());
            if let Some(scripts_map) = scripts {
                scripts_map.insert(
                    "dev".to_string(),
                    serde_json::json!([
                        "Composer\\Config::disableProcessTimeout",
                        "npx concurrently -c \"#93c5fd,#c4b5fd,#fb7185,#fdba74\" \"php artisan serve\" \"php artisan queue:listen --tries=1 --timeout=0\" \"php artisan pail --timeout=0\" \"npm run dev\" --names=server,queue,logs,vite --kill-others"
                    ]),
                );
                fs::write(
                    &composer_json_path,
                    serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
            }
        }
    }

    let mut child = Command::new(&composer_path)
        .args(["run", "dev"])
        .current_dir(&project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let pid = child.id();
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    pipe_to_log(stdout, stderr, project_name.clone());

    let url = format!("http://localhost:{}", port);

    models::upsert_server(
        &project_path,
        &project_name,
        "laravel",
        port,
        pid,
        &url,
        &started_at,
        None,
    )
    .map_err(|e| e.to_string())?;

    PROCESSES
        .lock()
        .unwrap()
        .insert(project_path.clone(), child);

    Ok(ServerStatus {
        project_path,
        project_name,
        project_type: "laravel".into(),
        port,
        pid,
        url,
        started_at,
        is_running: true,
    })
}

#[command]
pub async fn stop_laravel_project(project_path: String) -> Result<String, String> {
    if let Some(mut child) = PROCESSES.lock().unwrap().remove(&project_path) {
        let _ = child.kill();
        let _ = child.wait();
    }

    if let Ok(Some(rec)) = models::get_server(&project_path) {
        if rec.is_running {
            kill_pid(rec.pid);
        }
    }

    models::mark_stopped(&project_path).map_err(|e| e.to_string())?;
    std::thread::sleep(std::time::Duration::from_millis(300));
    Ok(format!("stopped: {}", project_path))
}

#[command]
pub async fn restart_laravel_project(project_path: String) -> Result<ServerStatus, String> {
    let _ = Command::new("php")
        .args(["artisan", "optimize:clear"])
        .current_dir(&project_path)
        .output();

    stop_laravel_project(project_path.clone()).await?;
    std::thread::sleep(std::time::Duration::from_millis(800));
    start_laravel_project(project_path).await
}

#[command]
pub async fn is_laravel_running(project_path: String) -> Result<bool, String> {
    match models::get_server(&project_path).map_err(|e| e.to_string())? {
        Some(rec) if rec.is_running && server_alive(rec.pid, rec.port) => Ok(true),
        Some(rec) if port_is_open(rec.port) => {
            let started_at = chrono::Utc::now().to_rfc3339();
            models::upsert_server(
                &rec.project_path,
                &rec.project_name,
                &rec.project_type,
                rec.port,
                rec.pid,
                &rec.url,
                &started_at,
                rec.session_id.as_deref(),
            )
            .map_err(|e| e.to_string())?;
            Ok(true)
        }
        Some(rec) if rec.is_running => {
            models::mark_stopped(&project_path).ok();
            Ok(false)
        }
        _ => Ok(false),
    }
}

#[command]
pub async fn get_laravel_server_status(
    project_path: String,
) -> Result<Option<ServerStatus>, String> {
    match models::get_server(&project_path).map_err(|e| e.to_string())? {
        None => Ok(None),
        Some(mut rec) => {
            if rec.is_running && !server_alive(rec.pid, rec.port) {
                models::mark_stopped(&project_path).ok();
                rec.is_running = false;
            }

            if !rec.is_running && port_is_open(rec.port) {
                let started_at = chrono::Utc::now().to_rfc3339();
                models::upsert_server(
                    &rec.project_path,
                    &rec.project_name,
                    &rec.project_type,
                    rec.port,
                    rec.pid,
                    &rec.url,
                    &started_at,
                    rec.session_id.as_deref(),
                )
                .map_err(|e| e.to_string())?;
                rec.is_running = true;
                rec.started_at = started_at;
            }

            Ok(Some(rec.into()))
        }
    }
}

#[command]
pub async fn get_all_running_servers() -> Result<Vec<ServerStatus>, String> {
    models::get_all_running_servers()
        .map_err(|e| e.to_string())
        .map(|list| {
            list.into_iter()
                .map(|mut rec| {
                    if !server_alive(rec.pid, rec.port) {
                        models::mark_stopped(&rec.project_path).ok();
                        rec.is_running = false;
                    }
                    rec.into()
                })
                .filter(|s: &ServerStatus| s.is_running)
                .collect()
        })
}

#[command]
pub async fn get_server_logs(
    project_name: String,
    lines: Option<usize>,
) -> Result<Vec<String>, String> {
    let path = log_file_path(&project_name);
    if !path.exists() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let all: Vec<String> = content
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.to_string())
        .collect();

    let take = lines.unwrap_or(400);
    let skip = all.len().saturating_sub(take);
    Ok(all[skip..].to_vec())
}

#[command]
pub async fn clear_server_logs(project_name: String) -> Result<(), String> {
    let path = log_file_path(&project_name);
    if path.exists() {
        fs::write(&path, "").map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
pub async fn tail_server_logs(project_name: String) -> Result<Vec<String>, String> {
    let path = log_file_path(&project_name);
    if !path.exists() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let all: Vec<String> = content
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.to_string())
        .collect();

    let take = 50;
    let skip = all.len().saturating_sub(take);
    Ok(all[skip..].to_vec())
}
