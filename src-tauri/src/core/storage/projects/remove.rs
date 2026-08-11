use std::fs;
use std::path::PathBuf;

use super::list::ProjectInfo;
use crate::core::database::{Event, EventCategory};
use crate::modules::common::path::hive_projects_dir;

#[tauri::command]
pub fn remove_project(project_path: String, delete_files: bool) -> Result<(), String> {
    let hive_dir = hive_projects_dir();

    for entry in fs::read_dir(&hive_dir).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|ext| ext.to_str()) == Some("json") {
            let content =
                fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;

            let Ok(project) = serde_json::from_str::<ProjectInfo>(&content) else {
                continue;
            };
            if project.path == project_path {
                fs::remove_file(&path)
                    .map_err(|e| format!("Failed to delete project file: {}", e))?;

                if delete_files {
                    let project_dir = PathBuf::from(&project_path);
                    // Belt-and-suspenders: never allow removing a mount-like root
                    // even if a registry file somehow points at one.
                    if project_dir.exists()
                        && project_dir.is_dir()
                        && !["", ".", "..", "/"].contains(&project_dir.to_string_lossy().as_ref())
                    {
                        fs::remove_dir_all(&project_dir)
                            .map_err(|e| format!("Failed to delete project directory: {}", e))?;
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

    let error_msg = format!("Project not found at path: {}", project_path);
    let _ = Event::error(
        EventCategory::Project,
        "project.remove.failed",
        "Failed to Remove Project",
        &error_msg,
    );

    Err(error_msg)
}
