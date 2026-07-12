use std::env;
use std::path::PathBuf;

/// Returns the base Hive directory path
pub fn get_hive_base_path() -> PathBuf {
    let home = env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());

    PathBuf::from(home).join(".hive")
}

/// Returns the Hive bin directory path
pub fn get_hive_bin_path() -> PathBuf {
    get_hive_base_path().join("bin")
}

/// Returns the Hive runtimes directory path
pub fn get_runtimes_path() -> PathBuf {
    get_hive_base_path().join("runtimes")
}

#[tauri::command]
pub fn get_os() -> Result<String, String> {
    Ok(std::env::consts::OS.to_string())
}

#[tauri::command]
pub fn get_arch() -> Result<String, String> {
    Ok(std::env::consts::ARCH.to_string())
}

/// Returns the script extension for the current platform
pub fn get_script_extension() -> &'static str {
    if cfg!(windows) { ".bat" } else { ".sh" }
}
