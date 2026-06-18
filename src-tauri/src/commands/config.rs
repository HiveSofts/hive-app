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
        let config: UserConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(config)
    } else {
        Ok(UserConfig::default())
    }
}

#[tauri::command]
pub fn save_user_config(config: UserConfig) -> Result<(), String> {
    let config_path = get_config_path();

    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let metadata = fs::metadata(parent).map_err(|e| e.to_string())?;
            let mut permissions = metadata.permissions();
            permissions.set_mode(0o755);
            fs::set_permissions(parent, permissions).map_err(|e| e.to_string())?;
        }
    }

    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&config_path, content).map_err(|e| e.to_string())?;
    
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let metadata = fs::metadata(&config_path).map_err(|e| e.to_string())?;
        let mut permissions = metadata.permissions();
        permissions.set_mode(0o644);
        fs::set_permissions(&config_path, permissions).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn initialize_hive() -> Result<(), String> {
    let config_path = get_config_path();
    
    if let Some(parent) = config_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let metadata = fs::metadata(parent).map_err(|e| e.to_string())?;
                let mut permissions = metadata.permissions();
                permissions.set_mode(0o755);
                fs::set_permissions(parent, permissions).map_err(|e| e.to_string())?;
            }
        }
    }
    
    if !config_path.exists() {
        let default_config = UserConfig::default();
        let content = serde_json::to_string_pretty(&default_config).map_err(|e| e.to_string())?;
        fs::write(&config_path, content).map_err(|e| e.to_string())?;
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let metadata = fs::metadata(&config_path).map_err(|e| e.to_string())?;
            let mut permissions = metadata.permissions();
            permissions.set_mode(0o644);
            fs::set_permissions(&config_path, permissions).map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
}