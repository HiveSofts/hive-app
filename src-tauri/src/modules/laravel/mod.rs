mod artisan;
mod create;
mod database;
mod deploy;
mod log;
mod metrics;
mod package;
mod queue;
mod readme;
mod schedule;
mod server;

pub use artisan::*;
pub use create::*;
pub use database::*;
pub use deploy::*;
pub use log::*;
pub use metrics::*;
pub use package::*;
pub use queue::*;
pub use readme::*;
pub use schedule::*;
pub use server::*;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaravelProject {
    pub id: String,
    pub name: String,
    pub path: String,
    pub version: String,
    pub php_version: String,
    pub port: u16,
    pub status: String,
    pub database: Option<DatabaseInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub driver: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtisanCommand {
    pub name: String,
    pub description: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueWorker {
    pub name: String,
    pub jobs: u32,
    pub failed: u32,
    pub processed: u32,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleTask {
    pub command: String,
    pub cron: String,
    pub next_run: String,
    pub last_run: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: u32,
    pub level: String,
    pub message: String,
    pub context: String,
    pub time: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Package {
    pub name: String,
    pub version: String,
    pub installed: String,
    pub package_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeployConfig {
    pub host: String,
    pub user: String,
    pub path: String,
    pub repo: String,
    pub key_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu: f32,
    pub memory: f32,
    pub memory_total: f32,
    pub requests: u32,
    pub timestamp: String,
}
