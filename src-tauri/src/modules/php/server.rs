use std::fs;
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;
use tauri::command;

use crate::core::database::models;
use crate::core::system::process::PROCESS_REGISTRY;
use crate::modules::common::path::expand_home;
use crate::modules::common::server::{
    append_log, ensure_log_dir, free_port, kill_pid_tree, pipe_to_log, port_is_open,
    project_name_from_path, server_alive,
};

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct PhpServerStatus {
    pub project_path: String,
    pub project_name: String,
    pub project_type: String,
    pub port: u16,
    pub pid: u32,
    pub url: String,
    pub started_at: String,
    pub is_running: bool,
}

impl From<models::ServerRecord> for PhpServerStatus {
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

/// Read the configured PHP entry point from the Hive project metadata
/// (`~/.hive/projects/<name>.json`), falling back to the framework default.
fn read_entry_point(project_path: &str) -> String {
    let project_name = project_name_from_path(project_path);
    let meta_path =
        crate::modules::common::path::hive_projects_dir().join(format!("{}.json", project_name));

    if let Ok(content) = fs::read_to_string(&meta_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(ep) = json.get("entry_point").and_then(|v| v.as_str()) {
                return ep.to_string();
            }
            if let Some(ep) = json.get("entryPoint").and_then(|v| v.as_str()) {
                return ep.to_string();
            }
        }
    }
    "public/index.php".to_string()
}

#[command]
pub async fn start_php_project(project_path: String) -> Result<PhpServerStatus, String> {
    let project_path = expand_home(&project_path);
    let project_path_str = project_path.to_string_lossy().to_string();
    let project_name = project_name_from_path(&project_path_str);
    ensure_log_dir(&project_name)?;

    let existing = models::get_server(&project_path_str).map_err(|e| e.to_string())?;

    if let Some(rec) = existing.clone() {
        if rec.is_running && server_alive(rec.pid, rec.port) {
            return Ok(rec.into());
        }
    }

    let _ = stop_php_project(project_path_str.clone()).await;

    let port = match existing {
        Some(rec) if !port_is_open(rec.port) => rec.port,
        _ => free_port(8000),
    };

    let entry_point = read_entry_point(&project_path_str);
    let started_at = chrono::Utc::now().to_rfc3339();
    append_log(
        &project_name,
        &format!("=== PHP server starting on port {port} ==="),
        false,
    );
    append_log(&project_name, &format!("Entry: {entry_point}"), false);

    let mut child = Command::new("php")
        .args(["-S", &format!("0.0.0.0:{}", port), &entry_point])
        .current_dir(&project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start PHP server: {}", e))?;

    let pid = child.id();
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture PHP server stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture PHP server stderr".to_string())?;
    pipe_to_log(stdout, stderr, project_name.clone());

    let url = format!("http://localhost:{}", port);
    models::upsert_server(
        &project_path_str,
        &project_name,
        "php",
        port,
        pid,
        &url,
        &started_at,
        None,
    )
    .map_err(|e| e.to_string())?;

    PROCESS_REGISTRY.insert(project_path_str.clone(), child);

    Ok(PhpServerStatus {
        project_path: project_path_str,
        project_name,
        project_type: "php".into(),
        port,
        pid,
        url,
        started_at,
        is_running: true,
    })
}

#[command]
pub async fn stop_php_project(project_path: String) -> Result<String, String> {
    let project_path = expand_home(&project_path);
    let project_path_str = project_path.to_string_lossy().to_string();

    PROCESS_REGISTRY.kill_tree(&project_path_str);

    if let Ok(Some(rec)) = models::get_server(&project_path_str) {
        if rec.is_running {
            kill_pid_tree(rec.pid);
        }
    }

    models::mark_stopped(&project_path_str).map_err(|e| e.to_string())?;
    thread::sleep(Duration::from_millis(300));
    Ok(format!("stopped: {}", project_path_str))
}

#[command]
pub async fn restart_php_project(project_path: String) -> Result<PhpServerStatus, String> {
    let project_path = expand_home(&project_path);
    let project_path_str = project_path.to_string_lossy().to_string();
    stop_php_project(project_path_str.clone()).await?;
    thread::sleep(Duration::from_millis(600));
    start_php_project(project_path_str).await
}

#[command]
pub async fn get_php_server_status(
    project_path: String,
) -> Result<Option<PhpServerStatus>, String> {
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
