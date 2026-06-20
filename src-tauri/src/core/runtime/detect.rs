use crate::core::system::os::get_hive_bin_path;
use std::process::Command;

#[derive(Debug, serde::Serialize, Clone)]
pub struct RuntimeInfo {
    pub found: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub is_hive: bool,
}

#[tauri::command]
pub fn detect_php() -> Result<RuntimeInfo, String> {
    let bin_dir = get_hive_bin_path();

    if bin_dir.join("php").exists() || bin_dir.join("php.sh").exists() {
        return Ok(RuntimeInfo {
            found: true,
            version: Some("hive".to_string()),
            path: Some(bin_dir.join("php").to_string_lossy().to_string()),
            is_hive: true,
        });
    }

    if let Ok(output) = Command::new("php").arg("-v").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Some(line) = stdout.lines().next() {
            let version = line.split(' ').nth(1).unwrap_or("unknown").to_string();
            return Ok(RuntimeInfo {
                found: true,
                version: Some(version),
                path: Some("system".to_string()),
                is_hive: false,
            });
        }
    }

    Ok(RuntimeInfo {
        found: false,
        version: None,
        path: None,
        is_hive: false,
    })
}

#[tauri::command]
pub fn detect_node() -> Result<RuntimeInfo, String> {
    let bin_dir = get_hive_bin_path();

    if bin_dir.join("node").exists() || bin_dir.join("node.sh").exists() {
        return Ok(RuntimeInfo {
            found: true,
            version: Some("hive".to_string()),
            path: Some(bin_dir.join("node").to_string_lossy().to_string()),
            is_hive: true,
        });
    }

    if let Ok(output) = Command::new("node").arg("-v").output() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !version.is_empty() {
            return Ok(RuntimeInfo {
                found: true,
                version: Some(version),
                path: Some("system".to_string()),
                is_hive: false,
            });
        }
    }

    Ok(RuntimeInfo {
        found: false,
        version: None,
        path: None,
        is_hive: false,
    })
}
