use std::{env, path::PathBuf, process::Command};

/// Adds Hive's binary directory to the PATH of the spawned process.
/// This only affects the current command and does not modify the user's system PATH.
pub fn setup_path(cmd: &mut Command) {
    let hive_bin = crate::modules::common::path::hive_bin_dir();

    let mut paths: Vec<PathBuf> = vec![hive_bin];

    if let Some(current_path) = env::var_os("PATH") {
        paths.extend(env::split_paths(&current_path));
    }

    if let Ok(joined) = env::join_paths(paths) {
        cmd.env("PATH", joined);
    }
}

/// Returns true if the package manager is supported by Hive.
pub fn is_valid_package_manager(manager: &str) -> bool {
    matches!(
        manager.trim().to_ascii_lowercase().as_str(),
        "npm" | "yarn" | "pnpm" | "bun"
    )
}
