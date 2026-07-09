use serde::{Deserialize, Serialize};
use std::env;
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
    // PHP-specific fields (stored as php_version / entry_point by create_php_project,
    // serialized as phpVersion / entryPoint so the frontend Project type receives them)
    #[serde(rename = "phpVersion", alias = "php_version", default)]
    pub php_version: Option<String>,
    #[serde(rename = "entryPoint", alias = "entry_point", default)]
    pub entry_point: Option<String>,
    // Next.js-specific field (serialized as nodeVersion so the frontend Project type receives it)
    #[serde(rename = "nodeVersion", alias = "node_version", default)]
    pub node_version: Option<String>,
    #[serde(default)]
    pub port: Option<u16>,
    #[serde(default)]
    pub host: Option<String>,
    // WordPress-specific fields (serialized with camelCase keys so the frontend
    // Project type receives them directly)
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
    if let Ok(home) = env::var("HOME") {
        PathBuf::from(home).join(".hive").join("projects")
    } else {
        PathBuf::from(".")
    }
}

#[tauri::command]
pub fn list_all_projects() -> Result<Vec<ProjectInfo>, String> {
    let hive_dir = get_hive_projects_dir();

    if !hive_dir.exists() {
        return Ok(vec![]);
    }

    let mut projects = Vec::new();

    for entry in fs::read_dir(&hive_dir).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|ext| ext.to_str()) == Some("json") {
            let content = fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read file {}: {}", path.display(), e))?;

            match serde_json::from_str::<ProjectInfo>(&content) {
                Ok(mut project) => {
                    if project.project_type.is_empty() {
                        project.project_type = "unknown".to_string();
                    }
                    projects.push(project);
                }
                Err(e) => {
                    eprintln!("Failed to parse project file {}: {}", path.display(), e);
                }
            }
        }
    }

    projects.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(projects)
}
