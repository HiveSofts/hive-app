use std::fs;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;
use tauri::command;

use crate::core::database::models;
use crate::core::database::{Event, EventCategory};
use crate::core::system::process::PROCESS_REGISTRY;
use crate::modules::common::server::{
    append_log, ensure_log_dir, free_port, kill_pid_tree, log_file_path, pipe_to_log, port_is_open,
    project_name_from_path, server_alive,
};

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

pub fn cleanup_orphaned_servers() {
    if let Ok(servers) = models::get_all_running_servers() {
        for s in servers {
            if !server_alive(s.pid, s.port) {
                let _ = models::mark_stopped(&s.project_path);
                let _ = Event::warning(
                    EventCategory::Laravel,
                    "server.orphaned.cleaned",
                    "Orphaned Server Cleaned",
                    &format!("Cleaned up orphaned server for project: {}", s.project_name),
                );
            }
        }
    }
}

/// Ensure the Laravel `composer.json` has a `scripts.dev` entry that starts
/// the dev stack (server, queue, logs, vite). Best-effort: if the file is
/// missing or unreadable the server still starts via the shared runner.
fn ensure_dev_script(project_path: &str) {
    if !project_path.is_empty() {
        if let Ok(mut json) = read_composer_json(project_path) {
            if let Some(scripts) = json.get_mut("scripts").and_then(|s| s.as_object_mut()) {
                if scripts.get("dev").is_none() {
                    scripts.insert(
                        "dev".to_string(),
                        serde_json::json!([
                            "Composer\\Config::disableProcessTimeout",
                            "npx concurrently -c \"#93c5fd,#c4b5fd,#fb7185,#fdba74\" \"php artisan serve\" \"php artisan queue:listen --tries=1 --timeout=0\" \"php artisan pail --timeout=0\" \"npm run dev\" --names=server,queue,logs,vite --kill-others"
                        ]),
                    );
                    if let Ok(content) = serde_json::to_string_pretty(&json) {
                        let _ =
                            fs::write(PathBuf::from(&project_path).join("composer.json"), content)
                                .and_then(|_| {
                                    let _ = fs::File::open(
                                        PathBuf::from(&project_path).join("composer.json"),
                                    );
                                    Ok(())
                                });
                    }
                }
            }
        }
    }
}

fn read_composer_json(project_path: &str) -> Result<serde_json::Value, String> {
    let composer_json_path = PathBuf::from(project_path).join("composer.json");
    let content = fs::read_to_string(&composer_json_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[command]
pub async fn start_laravel_project(project_path: String) -> Result<ServerStatus, String> {
    let project_name = project_name_from_path(&project_path);
    ensure_log_dir(&project_name)?;

    let _ = Event::info(
        EventCategory::Laravel,
        "server.starting",
        "Starting Laravel Server",
        &format!("Starting Laravel server for project: {}", project_name),
    );

    let existing = models::get_server(&project_path).map_err(|e| e.to_string())?;

    // If the recorded server is still alive, report it as already running.
    if let Some(rec) = existing.clone() {
        if rec.is_running && server_alive(rec.pid, rec.port) {
            let _ = Event::info(
                EventCategory::Laravel,
                "server.already_running",
                "Server Already Running",
                &format!("Laravel server for '{}' is already running", project_name),
            );
            return Ok(rec.into());
        }
    }

    // Stop any stale process under this project path before starting fresh.
    let _ = stop_laravel_project(project_path.clone()).await;

    let port = match existing {
        Some(rec) if !port_is_open(rec.port) => rec.port,
        _ => free_port(8000),
    };

    let started_at = chrono::Utc::now().to_rfc3339();
    append_log(
        &project_name,
        &format!("=== Server starting on port {port} ==="),
        false,
    );

    ensure_dev_script(&project_path);

    let composer_path = crate::modules::common::path::hive_bin_dir().join("composer");
    let mut child = Command::new(&composer_path)
        .args(["run", "dev"])
        .current_dir(&project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            let _ = Event::error(
                EventCategory::Laravel,
                "server.start.failed",
                "Failed to Start Server",
                &format!("Failed to start Laravel server: {}", e),
            );
            e.to_string()
        })?;

    let pid = child.id();
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture Laravel server stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture Laravel server stderr".to_string())?;
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

    PROCESS_REGISTRY.insert(project_path.clone(), child);

    let _ = Event::success(
        EventCategory::Laravel,
        "server.started",
        "Laravel Server Started",
        &format!(
            "Laravel server started for '{}' on port {}",
            project_name, port
        ),
    );

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
    let project_name = project_name_from_path(&project_path);
    let _ = Event::info(
        EventCategory::Laravel,
        "server.stopping",
        "Stopping Laravel Server",
        &format!("Stopping Laravel server for project: {}", project_name),
    );

    PROCESS_REGISTRY.kill_tree(&project_path);

    if let Ok(Some(rec)) = models::get_server(&project_path) {
        if rec.is_running {
            kill_pid_tree(rec.pid);
        }
    }

    models::mark_stopped(&project_path).map_err(|e| e.to_string())?;
    thread::sleep(Duration::from_millis(300));

    let _ = Event::success(
        EventCategory::Laravel,
        "server.stopped",
        "Laravel Server Stopped",
        &format!("Laravel server stopped for project: {}", project_name),
    );

    Ok(format!("stopped: {}", project_path))
}

#[command]
pub async fn restart_laravel_project(project_path: String) -> Result<ServerStatus, String> {
    let project_name = project_name_from_path(&project_path);
    let _ = Event::info(
        EventCategory::Laravel,
        "server.restarting",
        "Restarting Laravel Server",
        &format!("Restarting Laravel server for project: {}", project_name),
    );

    let _ = Command::new("php")
        .args(["artisan", "optimize:clear"])
        .current_dir(&project_path)
        .output();

    stop_laravel_project(project_path.clone()).await?;
    thread::sleep(Duration::from_millis(800));
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
    read_log_tail(&project_name, lines.unwrap_or(400))
}

#[command]
pub async fn clear_server_logs(project_name: String) -> Result<(), String> {
    let path = log_file_path(&project_name)?;
    if path.exists() {
        fs::write(&path, "").map_err(|e| e.to_string())?;
        let _ = Event::info(
            EventCategory::Laravel,
            "logs.cleared",
            "Server Logs Cleared",
            &format!("Cleared server logs for project: {}", project_name),
        );
    }
    Ok(())
}

#[command]
pub async fn tail_server_logs(project_name: String) -> Result<Vec<String>, String> {
    read_log_tail(&project_name, 50)
}

/// Read the last `max_lines` non-empty lines from a project's server log.
fn read_log_tail(project_name: &str, max_lines: usize) -> Result<Vec<String>, String> {
    let path = log_file_path(project_name)?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let all: Vec<String> = content
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.to_string())
        .collect();
    let skip = all.len().saturating_sub(max_lines);
    Ok(all[skip..].to_vec())
}
