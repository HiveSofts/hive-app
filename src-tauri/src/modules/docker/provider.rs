use crate::modules::docker::DockerInfo;
use crate::modules::docker::desktop::DesktopDockerProvider;
use crate::modules::docker::linux::LinuxDockerProvider;
use std::process::Command;

use crate::modules::docker::api::ApiDockerProvider;

#[derive(Debug, Clone)]
pub enum DockerProvider {
    Linux(LinuxDockerProvider),
    Desktop(DesktopDockerProvider),
    Api(ApiDockerProvider),
}

impl DockerProvider {
    pub fn new() -> Self {
        let os = std::env::consts::OS;

        if os == "linux" && Self::is_docker_running() {
            DockerProvider::Linux(LinuxDockerProvider::new())
        } else if Self::is_docker_running() {
            DockerProvider::Desktop(DesktopDockerProvider::new())
        } else {
            DockerProvider::Api(ApiDockerProvider::new())
        }
    }

    fn is_docker_running() -> bool {
        Command::new("docker")
            .args(["info"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    pub fn detect(&self) -> DockerInfo {
        match self {
            DockerProvider::Linux(p) => p.detect(),
            DockerProvider::Desktop(p) => p.detect(),
            DockerProvider::Api(p) => p.detect(),
        }
    }

    pub async fn install_linux(&self, window: tauri::Window) -> Result<String, String> {
        match self {
            DockerProvider::Linux(p) => p.install(window).await,
            _ => Err("Linux installation only available on Linux".to_string()),
        }
    }
}

pub trait DockerProviderTrait {
    fn detect(&self) -> DockerInfo;
    fn get_docker_version(&self) -> Option<String>;
    fn check_daemon(&self) -> bool;
    fn check_compose(&self) -> (bool, Option<String>);
    fn detect_linux_distro(&self) -> String;
    async fn install(&self, _window: tauri::Window) -> Result<String, String> {
        Err("Installation not supported on this platform".to_string())
    }
}

impl DockerProviderTrait for DockerProvider {
    fn detect(&self) -> DockerInfo {
        self.detect()
    }

    fn get_docker_version(&self) -> Option<String> {
        match self {
            DockerProvider::Linux(p) => p.get_docker_version(),
            DockerProvider::Desktop(p) => p.get_docker_version(),
            DockerProvider::Api(p) => p.get_docker_version(),
        }
    }

    fn check_daemon(&self) -> bool {
        match self {
            DockerProvider::Linux(p) => p.check_daemon(),
            DockerProvider::Desktop(p) => p.check_daemon(),
            DockerProvider::Api(p) => p.check_daemon(),
        }
    }

    fn check_compose(&self) -> (bool, Option<String>) {
        match self {
            DockerProvider::Linux(p) => p.check_compose(),
            DockerProvider::Desktop(p) => p.check_compose(),
            DockerProvider::Api(p) => p.check_compose(),
        }
    }

    fn detect_linux_distro(&self) -> String {
        match self {
            DockerProvider::Linux(p) => p.detect_linux_distro(),
            DockerProvider::Desktop(p) => p.detect_linux_distro(),
            DockerProvider::Api(p) => p.detect_linux_distro(),
        }
    }

    async fn install(&self, window: tauri::Window) -> Result<String, String> {
        match self {
            DockerProvider::Linux(p) => p.install(window).await,
            DockerProvider::Desktop(p) => p.install(window).await,
            DockerProvider::Api(p) => p.install(window).await,
        }
    }
}
