use std::path::PathBuf;

/// Returns the Hive base directory.
pub fn get_hive_base_path() -> PathBuf {
    crate::modules::common::path::hive_base_dir()
}

/// Returns the Hive binary directory.
pub fn get_hive_bin_path() -> PathBuf {
    crate::modules::common::path::hive_bin_dir()
}

/// Returns the Hive runtimes directory.
pub fn get_runtimes_path() -> PathBuf {
    get_hive_base_path().join("runtimes")
}
#[tauri::command]
pub fn get_hive_projects_path() -> String {
    crate::modules::common::path::hive_projects_dir()
        .to_string_lossy()
        .into_owned()
}
#[tauri::command]
pub fn get_os() -> Result<String, String> {
    Ok(std::env::consts::OS.to_string())
}

#[tauri::command]
pub fn get_arch() -> Result<String, String> {
    Ok(std::env::consts::ARCH.to_string())
}

pub fn get_script_extension() -> &'static str {
    if cfg!(windows) {
        ".bat"
    } else {
        ".sh"
    }
}

#[tauri::command]
pub fn get_hive_base_path_string() -> String {
    get_hive_base_path().to_string_lossy().into_owned()
}

#[tauri::command]
pub fn get_hive_bin_path_string() -> String {
    get_hive_bin_path().to_string_lossy().into_owned()
}

#[tauri::command]
pub fn get_hive_runtimes_path() -> String {
    get_runtimes_path().to_string_lossy().into_owned()
}

#[tauri::command]
pub fn get_hive_runtime_path(runtime: String, version: String) -> String {
    get_runtimes_path()
        .join(runtime)
        .join(version)
        .to_string_lossy()
        .into_owned()
}