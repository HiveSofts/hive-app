use std::fs;
use std::path::Path;

#[tauri::command]
pub fn list_directory_contents(path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&path);
    
    if !path.exists() {
        return Err("Path does not exist".to_string());
    }
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    
    let mut entries = Vec::new();
    
    for entry in fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        if let Some(file_name) = entry.file_name().to_str() {
            entries.push(file_name.to_string());
        }
    }
    
    entries.sort(); // Sort alphabetically for consistent output
    Ok(entries)
}