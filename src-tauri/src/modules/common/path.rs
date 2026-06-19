use std::path::PathBuf;

/// Expands the tilde (~) in a path to the user's home directory
pub fn expand_home(path: &str) -> String {
    if path.starts_with("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return path.replacen("~", &home, 1);
        }
    }
    path.to_string()
}

/// Returns the Hive base directory
pub fn hive_base_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".hive")
}

/// Returns the Hive projects directory
pub fn hive_projects_dir() -> PathBuf {
    hive_base_dir().join("projects")
}

/// Returns the Hive bin directory
pub fn hive_bin_dir() -> PathBuf {
    hive_base_dir().join("bin")
}