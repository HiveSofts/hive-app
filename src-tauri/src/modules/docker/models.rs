use serde::{Deserialize, Serialize};
use crate::modules::docker::DockerInfo;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerInfo {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: String,
    pub state: String,
    pub ports: Vec<PortMapping>,
    pub created: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortMapping {
    pub host_port: u16,
    pub container_port: u16,
    pub protocol: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerDetails {
    pub id: String,
    pub name: String,
    pub image: String,
    pub image_id: String,
    pub status: String,
    pub state: String,
    pub created: String,
    pub started_at: String,
    pub finished_at: String,
    pub restart_count: u32,
    pub restart_policy: String,
    pub platform: String,
    pub ports: Vec<PortMapping>,
    pub env_vars: Vec<String>,
    pub labels: Vec<LabelEntry>,
    pub mounts: Vec<MountInfo>,
    pub networks: Vec<NetworkInfo>,
    pub cpu_shares: u64,
    pub memory_limit: u64,
    pub memory_swap: i64,
    pub hostname: String,
    pub ip_address: String,
    pub cmd: Vec<String>,
    pub entrypoint: Vec<String>,
    pub working_dir: String,
    pub user: String,
    pub privileged: bool,
    pub pid: u64,
    pub size_rw: Option<i64>,
    pub size_root_fs: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LabelEntry {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MountInfo {
    pub mount_type: String,
    pub source: String,
    pub destination: String,
    pub mode: String,
    pub rw: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInfo {
    pub name: String,
    pub ip_address: String,
    pub mac_address: String,
    pub gateway: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerStats {
    pub cpu: String,
    pub memory: String,
    pub memperc: String,
    pub net: String,
    pub block: String,
    pub pids: String,
    pub cpu_raw: f64,
    pub mem_used_mb: f64,
    pub mem_limit_mb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDatabaseContainerRequest {
    pub db_type: String,
    pub container_name: String,
    pub version: String,
    pub host_port: u16,
    pub root_password: String,
    pub database_name: String,
    pub username: String,
    pub password: String,
    pub data_volume: Option<String>,
    pub memory_limit: Option<String>,
    pub cpu_limit: Option<f32>,
    pub restart_policy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateContainerResult {
    pub success: bool,
    pub container_id: Option<String>,
    pub container_name: String,
    pub connection_string: Option<String>,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageInfo {
    pub id: String,
    pub repository: String,
    pub tag: String,
    pub created: String,
    pub size: String,
    pub digest: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkDetail {
    pub id: String,
    pub name: String,
    pub driver: String,
    pub scope: String,
    pub ipam_subnet: String,
    pub ipam_gateway: String,
    pub containers_count: u32,
    pub internal: bool,
    pub attachable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeInfo {
    pub name: String,
    pub driver: String,
    pub mountpoint: String,
    pub created: String,
    pub size: String,
    pub containers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub containers_total: u32,
    pub containers_running: u32,
    pub containers_paused: u32,
    pub containers_stopped: u32,
    pub images: u32,
    pub server_version: String,
    pub storage_driver: String,
    pub memory_total: u64,
    pub cpus: u32,
    pub os: String,
    pub kernel_version: String,
    pub architecture: String,
    pub disk_usage_images: String,
    pub disk_usage_containers: String,
    pub disk_usage_volumes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerProcess {
    pub pid: String,
    pub ppid: String,
    pub user: String,
    pub cpu: String,
    pub mem: String,
    pub vsz: String,
    pub rss: String,
    pub tty: String,
    pub stat: String,
    pub start: String,
    pub time: String,
    pub cmd: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenameRequest {
    pub old_name: String,
    pub new_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateContainerRequest {
    pub container_name: String,
    pub memory_limit: Option<String>,
    pub cpu_shares: Option<u64>,
    pub restart_policy: Option<String>,
}