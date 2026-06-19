
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::env;

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

#[tauri::command]
pub fn remove_project(project_path: String, delete_files: bool) -> Result<(), String> {
    let hive_dir = get_hive_projects_dir();

    for entry in fs::read_dir(&hive_dir).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|ext| ext.to_str()) == Some("json") {
            let content = fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read file: {}", e))?;

            if let Ok(project) = serde_json::from_str::<ProjectInfo>(&content) {
                if project.path == project_path {
                    fs::remove_file(&path)
                        .map_err(|e| format!("Failed to delete project file: {}", e))?;

                    if delete_files {
                        let project_dir = PathBuf::from(&project_path);
                        if project_dir.exists() {
                            fs::remove_dir_all(&project_dir)
                                .map_err(|e| format!("Failed to delete project directory: {}", e))?;
                        }
                    }

                    return Ok(());
                }
            }
        }
    }

    Err("Project not found".to_string())
}