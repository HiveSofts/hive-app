use super::models::*;
use super::provider::DockerProviderTrait;
use crate::modules::docker::DockerInfo;
use std::process::Command;

#[derive(Debug, Clone, Default)]
pub struct DesktopDockerProvider;

impl DesktopDockerProvider {
    pub fn new() -> Self {
        Self
    }
}

impl DockerProviderTrait for DesktopDockerProvider {
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
        let output = Command::new("docker")
            .args(["version", "--format", "{{.Server.Version}}"])
            .output()
            .ok()?;

        if !output.status.success() {
            return None;
        }

        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if version.is_empty() {
            return None;
        }

        Some(version)
    }

    fn check_daemon(&self) -> bool {
        Command::new("docker")
            .args(["info"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    fn check_compose(&self) -> (bool, Option<String>) {
        let output = Command::new("docker")
            .args(["compose", "version", "--short"])
            .output()
            .ok();

        if let Some(out) = output {
            if out.status.success() {
                let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !version.is_empty() {
                    return (true, Some(version));
                }
            }
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
        "desktop".to_string()
    }
}
