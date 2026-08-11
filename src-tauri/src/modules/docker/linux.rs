use super::models::*;
use super::provider::DockerProviderTrait;
use crate::modules::docker::DockerInfo;
use std::fs;
use std::process::Command;
use tauri::Emitter;

#[derive(Debug, Clone, Default)]
pub struct LinuxDockerProvider;

impl LinuxDockerProvider {
    pub fn new() -> Self {
        Self
    }
}

impl DockerProviderTrait for LinuxDockerProvider {
    fn detect(&self) -> DockerInfo {
        let version = self.get_docker_version();
        let installed = version.is_some();
        let daemon_running = if installed {
            self.check_daemon()
        } else {
            false
        };
        let (compose_available, compose_version) = self.check_compose();

        DockerInfo {
            installed,
            version,
            daemon_running,
            compose_available,
            compose_version,
        }
    }

    fn get_docker_version(&self) -> Option<String> {
        Command::new("docker")
            .args(["version", "--format", "{{.Server.Version}}"])
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .filter(|s| !s.is_empty())
    }

    fn check_daemon(&self) -> bool {
        Command::new("docker")
            .args(["info"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    fn check_compose(&self) -> (bool, Option<String>) {
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

    fn detect_linux_distro(&self) -> String {
        if let Ok(content) = fs::read_to_string("/etc/os-release") {
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

    async fn install(&self, window: tauri::Window) -> Result<String, String> {
        let _ = window.emit("docker-install-log", "Detecting Linux distribution...");
        let distro = self.detect_linux_distro();
        let _ = window.emit("docker-install-log", format!("Distro: {}", distro));

        let script = match distro.as_str() {
            "ubuntu" | "debian" | "linuxmint" => self.install_script_debian(),
            "fedora" => self.install_script_fedora(),
            "centos" | "rhel" | "rocky" | "almalinux" => self.install_script_rhel(),
            "arch" | "manjaro" => self.install_script_arch(),
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
}

impl LinuxDockerProvider {
    fn install_script_debian(&self) -> String {
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
        "#
        .to_string()
    }

    fn install_script_fedora(&self) -> String {
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

    fn install_script_rhel(&self) -> String {
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

    fn install_script_arch(&self) -> String {
        r#"
        set -e
        pacman -Sy --noconfirm docker docker-compose
        systemctl enable docker
        systemctl start docker
        usermod -aG docker $USER
        "#
        .to_string()
    }
}
