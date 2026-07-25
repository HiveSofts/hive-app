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
use crate::core::database::{Event, EventCategory};
use crate::modules::common::path::expand_home;

lazy_static::lazy_static! {
    static ref WORDPRESS_PROCESSES: Mutex<HashMap<String, Child>> = Mutex::new(HashMap::new());
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct WordPressServerStatus {
    pub project_path: String,
    pub project_name: String,
    pub project_type: String,
    pub port: u16,
    pub pid: u32,
    pub url: String,
    pub started_at: String,
    pub is_running: bool,
}

impl From<models::ServerRecord> for WordPressServerStatus {
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
pub async fn start_wordpress_project(
    project_path: String,
) -> Result<WordPressServerStatus, String> {
    let project_path = expand_home(&project_path);
    let project_path_str = project_path.to_string_lossy().to_string();
    let project_name = project_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let _ = Event::info(
        EventCategory::WordPress,
        "wordpress.server.starting",
        "Starting WordPress Server",
        &format!("Starting WordPress server for project: {}", project_name),
    );
    
    let existing = models::get_server(&project_path_str).map_err(|e| e.to_string())?;

    if let Some(rec) = existing.clone() {
        if rec.is_running && server_alive(rec.pid, rec.port) {
            let _ = Event::info(
                EventCategory::WordPress,
                "wordpress.server.already_running",
                "WordPress Server Already Running",
                &format!("WordPress server for '{}' is already running", project_name),
            );
            return Ok(rec.into());
        }
    }

    let _ = stop_wordpress_project(project_path_str.clone()).await;

    let port = if let Some(rec) = existing {
        if !port_is_open(rec.port) {
            rec.port
        } else {
            free_port(8080)
        }
    } else {
        free_port(8080)
    };

    fs::create_dir_all(log_dir(&project_name)).map_err(|e| e.to_string())?;

    let started_at = chrono::Utc::now().to_rfc3339();
    if let Ok(mut f) = open_log_file(&project_name) {
        let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
        let _ = writeln!(f, "[{ts}] === WordPress server starting on port {port} ===");
    }

    let mut child = Command::new("php")
        .args(["-S", &format!("0.0.0.0:{}", port), "index.php"])
        .current_dir(&project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            let _ = Event::error(
                EventCategory::WordPress,
                "wordpress.server.start.failed",
                "Failed to Start WordPress Server",
                &format!("Failed to start WordPress server: {}", e),
            );
            format!("Failed to start WordPress server: {}", e)
        })?;

    let pid = child.id();
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    pipe_to_log(stdout, stderr, project_name.clone());

    let url = format!("http://localhost:{}", port);
    models::upsert_server(
        &project_path_str,
        &project_name,
        "wordpress",
        port,
        pid,
        &url,
        &started_at,
        None,
    )
    .map_err(|e| e.to_string())?;

    WORDPRESS_PROCESSES
        .lock()
        .unwrap()
        .insert(project_path_str.clone(), child);

    let _ = Event::success(
        EventCategory::WordPress,
        "wordpress.server.started",
        "WordPress Server Started",
        &format!("WordPress server started for '{}' on port {}", project_name, port),
    );

    Ok(WordPressServerStatus {
        project_path: project_path_str,
        project_name,
        project_type: "wordpress".into(),
        port,
        pid,
        url,
        started_at,
        is_running: true,
    })
}

#[command]
pub async fn stop_wordpress_project(project_path: String) -> Result<String, String> {
    let project_path = expand_home(&project_path);
    let project_path_str = project_path.to_string_lossy().to_string();
    let project_name = project_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let _ = Event::info(
        EventCategory::WordPress,
        "wordpress.server.stopping",
        "Stopping WordPress Server",
        &format!("Stopping WordPress server for project: {}", project_name),
    );

    if let Some(mut child) = WORDPRESS_PROCESSES.lock().unwrap().remove(&project_path_str) {
        let _ = child.kill();
        let _ = child.wait();
    }

    if let Ok(Some(rec)) = models::get_server(&project_path_str) {
        if rec.is_running {
            kill_pid(rec.pid);
        }
    }

    models::mark_stopped(&project_path_str).map_err(|e| e.to_string())?;
    std::thread::sleep(std::time::Duration::from_millis(300));

    let _ = Event::success(
        EventCategory::WordPress,
        "wordpress.server.stopped",
        "WordPress Server Stopped",
        &format!("WordPress server stopped for project: {}", project_name),
    );

    Ok(format!("stopped: {}", project_path_str))
}

#[command]
pub async fn restart_wordpress_project(
    project_path: String,
) -> Result<WordPressServerStatus, String> {
    let project_path = expand_home(&project_path);
    let project_path_str = project_path.to_string_lossy().to_string();
    let project_name = project_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let _ = Event::info(
        EventCategory::WordPress,
        "wordpress.server.restarting",
        "Restarting WordPress Server",
        &format!("Restarting WordPress server for project: {}", project_name),
    );

    stop_wordpress_project(project_path_str.clone()).await?;
    std::thread::sleep(std::time::Duration::from_millis(600));
    start_wordpress_project(project_path_str).await
}

#[command]
pub async fn get_wordpress_server_status(
    project_path: String,
) -> Result<Option<WordPressServerStatus>, String> {
    let project_path = expand_home(&project_path);
    let project_path_str = project_path.to_string_lossy().to_string();
    
    match models::get_server(&project_path_str).map_err(|e| e.to_string())? {
        None => Ok(None),
        Some(mut rec) => {
            if rec.is_running && !server_alive(rec.pid, rec.port) {
                models::mark_stopped(&project_path_str).ok();
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