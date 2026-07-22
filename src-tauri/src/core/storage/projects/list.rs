use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub id: Option<String>,
    pub name: String,
    #[serde(rename = "type")]
    pub project_type: String,
    pub path: String,
    pub description: Option<String>,
    pub created_at: Option<String>,
    pub package_manager: Option<String>,
    pub status: Option<String>,
    pub version: Option<String>,
    pub source_type: Option<String>,
    pub github_repo: Option<String>,

    #[serde(rename = "phpVersion", alias = "php_version", default)]
    pub php_version: Option<String>,

    #[serde(rename = "entryPoint", alias = "entry_point", default)]
    pub entry_point: Option<String>,

    #[serde(rename = "nodeVersion", alias = "node_version", default)]
    pub node_version: Option<String>,

    #[serde(default)]
    pub port: Option<u16>,

    #[serde(default)]
    pub host: Option<String>,

    #[serde(rename = "dbDriver", default)]
    pub db_driver: Option<String>,

    #[serde(rename = "dbName", default)]
    pub db_name: Option<String>,

    #[serde(rename = "dbUser", default)]
    pub db_user: Option<String>,

    #[serde(rename = "dbHost", default)]
    pub db_host: Option<String>,

    #[serde(rename = "dbPort", default)]
    pub db_port: Option<u16>,

    #[serde(rename = "siteTitle", default)]
    pub site_title: Option<String>,

    #[serde(rename = "siteUrl", default)]
    pub site_url: Option<String>,

    #[serde(rename = "adminUser", default)]
    pub admin_user: Option<String>,

    #[serde(rename = "adminEmail", default)]
    pub admin_email: Option<String>,
}

fn get_hive_projects_dir() -> PathBuf {
    crate::modules::common::path::hive_projects_dir()
}

#[tauri::command]
pub fn list_all_projects() -> Result<Vec<ProjectInfo>, String> {
    let projects_dir = get_hive_projects_dir();

    if !projects_dir.exists() {
        return Ok(Vec::new());
    }

    let entries =
        fs::read_dir(&projects_dir).map_err(|e| format!("Failed to read projects directory: {e}"))?;

    let mut projects = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }

        let Ok(content) = fs::read_to_string(&path) else {
            eprintln!("Failed to read {}", path.display());
            continue;
        };

        let Ok(mut project) = serde_json::from_str::<ProjectInfo>(&content) else {
            eprintln!("Failed to parse {}", path.display());
            continue;
        };

        if project.project_type.trim().is_empty() {
            project.project_type = "unknown".to_string();
        }

        projects.push(project);
    }

    projects.sort_by(|a, b| {
        a.name
            .to_ascii_lowercase()
            .cmp(&b.name.to_ascii_lowercase())
    });

    Ok(projects)
}