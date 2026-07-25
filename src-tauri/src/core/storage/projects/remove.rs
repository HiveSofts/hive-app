use std::env;
use std::fs;
use std::path::PathBuf;

use super::list::ProjectInfo;
use crate::core::database::{Event, EventCategory};

fn get_hive_projects_dir() -> PathBuf {
    if let Ok(home) = env::var("HOME") {
        PathBuf::from(home).join(".hive").join("projects")
    } else {
        PathBuf::from(".")
    }
}

#[tauri::command]
pub fn remove_project(project_path: String, delete_files: bool) -> Result<(), String> {
    let hive_dir = get_hive_projects_dir();

    for entry in fs::read_dir(&hive_dir).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|ext| ext.to_str()) == Some("json") {
            let content =
                fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;

            if let Ok(project) = serde_json::from_str::<ProjectInfo>(&content) {
                if project.path == project_path {
                    fs::remove_file(&path)
                        .map_err(|e| format!("Failed to delete project file: {}", e))?;

                    if delete_files {
                        let project_dir = PathBuf::from(&project_path);
                        if project_dir.exists() {
                            fs::remove_dir_all(&project_dir).map_err(|e| {
                                format!("Failed to delete project directory: {}", e)
                            })?;
                        }
                    }

                    let _ = Event::success(
                        EventCategory::Project,
                        "project.removed",
                        "Project Removed",
                        &format!("Project '{}' removed successfully", project.name),
                    );

                    return Ok(());
                }
            }
        }
    }

    let error_msg = format!("Project not found at path: {}", project_path);
    let _ = Event::error(
        EventCategory::Project,
        "project.remove.failed",
        "Failed to Remove Project",
        &error_msg,
    );
    
    Err(error_msg)
}