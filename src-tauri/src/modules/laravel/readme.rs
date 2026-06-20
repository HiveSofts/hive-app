use std::fs;
use std::path::PathBuf;
use tauri::command;

#[command]
pub fn read_project_file(project_path: String, file_name: String) -> Result<String, String> {
    let path = PathBuf::from(&project_path).join(&file_name);

    // Try exact match first
    if path.exists() && path.is_file() {
        return fs::read_to_string(&path).map_err(|e| e.to_string());
    }

    // Try case-insensitive for README
    if file_name.to_lowercase().contains("readme") {
        if let Ok(entries) = fs::read_dir(&project_path) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_lowercase();
                if name.contains("readme") && (name.ends_with(".md") || name.ends_with(".markdown"))
                {
                    return fs::read_to_string(entry.path()).map_err(|e| e.to_string());
                }
            }
        }
    }

    Err("File not found".to_string())
}
