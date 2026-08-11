use super::models::*;
use super::provider::DockerProviderTrait;
use crate::modules::docker::DockerInfo;

#[derive(Debug, Clone, Default)]
pub struct ApiDockerProvider;

impl ApiDockerProvider {
    pub fn new() -> Self {
        Self
    }
}

impl DockerProviderTrait for ApiDockerProvider {
    fn detect(&self) -> DockerInfo {
        DockerInfo {
            installed: false,
            version: None,
            daemon_running: false,
            compose_available: false,
            compose_version: None,
        }
    }

    fn get_docker_version(&self) -> Option<String> {
        None
    }

    fn check_daemon(&self) -> bool {
        false
    }

    fn check_compose(&self) -> (bool, Option<String>) {
        (false, None)
    }

    fn detect_linux_distro(&self) -> String {
        "unknown".to_string()
    }
}
