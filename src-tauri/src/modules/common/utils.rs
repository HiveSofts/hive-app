use std::process::Command;

/// Sets up the PATH environment variable for a command
pub fn setup_path(cmd: &mut Command) {
    let hive_bin = crate::modules::common::path::hive_bin_dir();
    let current_path = std::env::var("PATH").unwrap_or_default();
    let separator = if cfg!(windows) { ";" } else { ":" };
    let new_path = format!(
        "{}{}{}",
        hive_bin.to_string_lossy(),
        separator,
        current_path
    );
    cmd.env("PATH", new_path);
}

/// Checks if a package manager is valid
pub fn is_valid_package_manager(manager: &str) -> bool {
    matches!(manager, "npm" | "yarn" | "pnpm" | "bun")
}
