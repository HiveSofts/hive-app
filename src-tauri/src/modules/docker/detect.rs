use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::Emitter;

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
    let version = get_docker_version();
    let installed = version.is_some();
    let daemon_running = if installed { check_daemon() } else { false };
    let (compose_available, compose_version) = check_compose();

    DockerInfo {
        installed,
        version,
        daemon_running,
        compose_available,
        compose_version,
    }
}

fn get_docker_version() -> Option<String> {
    Command::new("docker")
        .args(["version", "--format", "{{.Server.Version}}"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .filter(|s| !s.is_empty())
}

fn check_daemon() -> bool {
    Command::new("docker")
        .args(["info"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn check_compose() -> (bool, Option<String>) {
    let v2 = Command::new("docker")
        .args(["compose", "version", "--short"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());

    if v2.is_some() {
        return (true, v2);
    }

    let v1 = Command::new("docker-compose")
        .args(["--version"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());

    (v1.is_some(), v1)
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

    let _ = window.emit("docker-install-log", "Detecting Linux distribution...");

    let distro = detect_linux_distro();
    let _ = window.emit("docker-install-log", format!("Distro: {}", distro));

    let script = match distro.as_str() {
        "ubuntu" | "debian" | "linuxmint" => install_script_debian(),
        "fedora" => install_script_fedora(),
        "centos" | "rhel" | "rocky" | "almalinux" => install_script_rhel(),
        "arch" | "manjaro" => install_script_arch(),
        _ => {
            return Ok("https://docs.docker.com/engine/install/".to_string());
        }
    };

    let _ = window.emit("docker-install-log", "Running install script...");

    let output = Command::new("bash")
        .arg("-c")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to run install script: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    for line in stdout.lines() {
        let _ = window.emit("docker-install-log", line.to_string());
    }
    for line in stderr.lines() {
        let _ = window.emit("docker-install-log", format!("[ERR] {}", line));
    }

    if output.status.success() {
        Ok("Docker installed successfully. Please restart to apply changes.".to_string())
    } else {
        Err(format!("Installation failed: {}", stderr))
    }
}

fn detect_linux_distro() -> String {
    if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
        for line in content.lines() {
            if line.starts_with("ID=") {
                return line
                    .trim_start_matches("ID=")
                    .trim_matches('"')
                    .to_lowercase();
            }
        }
    }
    "unknown".to_string()
}

fn install_script_debian() -> String {
    r#"
    set -e
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    usermod -aG docker $USER
    "#.to_string()
}

fn install_script_fedora() -> String {
    r#"
    set -e
    dnf -y install dnf-plugins-core
    dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
    dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    usermod -aG docker $USER
    "#
    .to_string()
}

fn install_script_rhel() -> String {
    r#"
    set -e
    yum install -y yum-utils
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    usermod -aG docker $USER
    "#
    .to_string()
}

fn install_script_arch() -> String {
    r#"
    set -e
    pacman -Sy --noconfirm docker docker-compose
    systemctl enable docker
    systemctl start docker
    usermod -aG docker $USER
    "#
    .to_string()
}
