use super::install::create_runtime_link;
use crate::core::system::os::{get_hive_bin_path, get_runtimes_path};
use std::fs;

#[tauri::command]
pub fn get_installed_runtimes(r#type: String) -> Result<Vec<String>, String> {
    let runtimes_dir = get_runtimes_path().join(&r#type);

    if !runtimes_dir.exists() {
        return Ok(vec![]);
    }

    let mut versions = vec![];

    for entry in fs::read_dir(&runtimes_dir).map_err(|e| e.to_string())? {
        if let Ok(entry) = entry {
            if entry.path().is_dir() {
                if let Some(name) = entry.file_name().to_str() {
                    versions.push(name.to_string());
                }
            }
        }
    }

    versions.sort();
    Ok(versions)
}

#[tauri::command]
pub fn get_available_links() -> Result<Vec<String>, String> {
    let bin_dir = get_hive_bin_path();

    if !bin_dir.exists() {
        return Ok(vec![]);
    }

    let mut links = vec![];

    for entry in fs::read_dir(&bin_dir).map_err(|e| e.to_string())? {
        if let Ok(entry) = entry {
            if let Some(name) = entry.file_name().to_str() {
                links.push(name.to_string());
            }
        }
    }

    links.sort();
    Ok(links)
}

#[tauri::command]
pub fn uninstall_runtime(runtime: String, version: String) -> Result<(), String> {
    let runtime_path = get_runtimes_path().join(&runtime).join(&version);

    if runtime_path.exists() {
        fs::remove_dir_all(&runtime_path).map_err(|e| e.to_string())?;
    }

    let bin_dir = get_hive_bin_path();

    if runtime == "composer" || runtime == "laravel" {
        let phar_link = bin_dir.join(format!("{}.phar", runtime));
        if phar_link.exists() {
            let _ = fs::remove_file(&phar_link);
        }

        let sh_link = bin_dir.join(format!(
            "{}{}",
            runtime,
            if cfg!(windows) { ".bat" } else { ".sh" }
        ));
        if sh_link.exists() {
            let _ = fs::remove_file(&sh_link);
        }

        let no_ext_link = bin_dir.join(&runtime);
        if no_ext_link.exists() {
            let _ = fs::remove_file(&no_ext_link);
        }
    } else {
        let sh_link = bin_dir.join(format!(
            "{}{}",
            runtime,
            if cfg!(windows) { ".bat" } else { ".sh" }
        ));
        if sh_link.exists() {
            let _ = fs::remove_file(&sh_link);
        }

        let no_ext_link = bin_dir.join(&runtime);
        if no_ext_link.exists() {
            let _ = fs::remove_file(&no_ext_link);
        }

        // Try to restore previous version
        let installed = get_installed_runtimes(runtime.clone())?;
        if !installed.is_empty() {
            let last_version = installed.last().unwrap();
            let first_path = get_runtimes_path().join(&runtime).join(last_version);
            let executable_name = match runtime.as_str() {
                "php" => {
                    if cfg!(windows) {
                        "php.exe"
                    } else {
                        "php"
                    }
                }
                "node" => {
                    if cfg!(windows) {
                        "node.exe"
                    } else {
                        "node"
                    }
                }
                _ => &runtime,
            };
            let executable_path = first_path.join(executable_name);

            if executable_path.exists() {
                create_runtime_link(&runtime, last_version, &first_path)?;
            }
        }
    }

    Ok(())
}
