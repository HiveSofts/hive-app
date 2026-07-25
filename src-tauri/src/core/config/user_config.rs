use crate::types::UserConfig;
use std::fs;
use std::path::{Path, PathBuf};

/// Returns the path to the Hive configuration file.
///
/// Windows:
/// C:\Users\<User>\.hive\config.json
///
/// Linux:
/// /home/<user>/.hive/config.json
///
/// macOS:
/// /Users/<user>/.hive/config.json
fn get_config_path() -> PathBuf {
    let home = dirs::home_dir().expect("Unable to determine user home directory");

    home.join(".hive").join("config.json")
}

#[tauri::command]
pub fn check_user_config_exists() -> bool {
    get_config_path().exists()
}

#[tauri::command]
pub fn get_user_config() -> Result<UserConfig, String> {
    let config_path = get_config_path();

    if !config_path.exists() {
        return Ok(UserConfig::default());
    }

    let content =
        fs::read_to_string(&config_path).map_err(|e| e.to_string())?;

    let config: UserConfig =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(config)
}

#[tauri::command]
pub fn save_user_config(config: UserConfig) -> Result<(), String> {
    let config_path = get_config_path();

    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        set_permissions(parent, 0o755)?;
    }

    let content =
        serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;

    fs::write(&config_path, content).map_err(|e| e.to_string())?;

    set_permissions(&config_path, 0o644)?;

    Ok(())
}

#[tauri::command]
pub fn initialize_hive() -> Result<(), String> {
    let config_path = get_config_path();

    if let Some(parent) = config_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            set_permissions(parent, 0o755)?;
        }
    }

    if !config_path.exists() {
        let default_config = UserConfig::default();

        let content = serde_json::to_string_pretty(&default_config)
            .map_err(|e| e.to_string())?;

        fs::write(&config_path, content).map_err(|e| e.to_string())?;

        set_permissions(&config_path, 0o644)?;
    }

    Ok(())
}

#[cfg(unix)]
fn set_permissions(path: &Path, mode: u32) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;

    let mut permissions = fs::metadata(path)
        .map_err(|e| e.to_string())?
        .permissions();

    permissions.set_mode(mode);

    fs::set_permissions(path, permissions).map_err(|e| e.to_string())
}

#[cfg(windows)]
fn set_permissions(_path: &Path, _mode: u32) -> Result<(), String> {
    Ok(())
}