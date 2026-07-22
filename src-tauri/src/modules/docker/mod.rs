mod provider;
mod models;
mod linux;
mod desktop;
mod api;
mod container;

pub use models::*;
pub use provider::*;
pub use container::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub daemon_running: bool,
    pub compose_available: bool,
    pub compose_version: Option<String>,
}

#[tauri::command]
pub fn detect_docker() -> DockerInfo {
    let provider = DockerProvider::new();
    provider.detect()
}

#[tauri::command]
pub fn get_docker_install_url() -> String {
    let os = std::env::consts::OS;
    match os {
        "windows" => "https://docs.docker.com/desktop/setup/install/windows-install/".to_string(),
        "macos" => "https://docs.docker.com/desktop/setup/install/mac-install/".to_string(),
        _ => "https://docs.docker.com/engine/install/".to_string(),
    }
}

#[tauri::command]
pub async fn install_docker_linux(window: tauri::Window) -> Result<String, String> {
    if std::env::consts::OS != "linux" {
        return Err("This command is only for Linux".to_string());
    }

    let provider = DockerProvider::new();
    provider.install_linux(window).await
}