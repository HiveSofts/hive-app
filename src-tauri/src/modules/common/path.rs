use std::path::PathBuf;

/// Expands the user's home directory in a path.
pub fn expand_home(path: &str) -> PathBuf {
    if path == "~" {
        return home_dir();
    }

    if let Some(rest) = path.strip_prefix("~/") {
        return home_dir().join(rest);
    }

    if let Some(rest) = path.strip_prefix("~\\") {
        return home_dir().join(rest);
    }

    PathBuf::from(path)
}

/// Returns the current user's home directory.
pub fn home_dir() -> PathBuf {
    if let Some(home) = std::env::var_os("HOME") {
        return PathBuf::from(home);
    }

    if let Some(profile) = std::env::var_os("USERPROFILE") {
        return PathBuf::from(profile);
    }

    match (std::env::var_os("HOMEDRIVE"), std::env::var_os("HOMEPATH")) {
        (Some(drive), Some(path)) => {
            let mut home = PathBuf::from(drive);
            home.push(path);
            home
        }
        _ => PathBuf::from("."),
    }
}

/// Returns the Hive base directory.
pub fn hive_base_dir() -> PathBuf {
    home_dir().join(".hive")
}

/// Returns the Hive projects directory.
pub fn hive_projects_dir() -> PathBuf {
    hive_base_dir().join("projects")
}

/// Returns the Hive binary directory.
pub fn hive_bin_dir() -> PathBuf {
    hive_base_dir().join("bin")
}
