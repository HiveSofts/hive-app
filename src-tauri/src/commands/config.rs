use std::fs;
use std::path::PathBuf;
use crate::types::UserConfig;

fn get_config_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".hive").join("config.json")
}

#[tauri::command]
pub fn check_user_config_exists() -> bool {
    get_config_path().exists()
}

#[tauri::command]
pub fn get_user_config() -> Result<UserConfig, String> {
    let config_path = get_config_path();

    if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(UserConfig::default())
    }
}

#[tauri::command]
pub fn save_user_config(config: UserConfig) -> Result<(), String> {
    let config_path = get_config_path();

    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&config_path, content).map_err(|e| e.to_string())
}
