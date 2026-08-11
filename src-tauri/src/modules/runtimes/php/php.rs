use crate::modules::common::path::home_dir;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhpIniInfo {
    pub path: String,
    pub content: String,
    pub is_writable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhpIniSetting {
    pub key: String,
    pub value: String,
}

fn get_php_ini_path_from_php() -> Option<String> {
    let output = Command::new("php").arg("-i").output().ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        if line.contains("Loaded Configuration File") {
            if let Some(path) = line.split(':').nth(1) {
                let path = path.trim();
                if !path.is_empty() && path != "(none)" {
                    return Some(path.to_string());
                }
            }
        }
    }
    None
}

fn get_php_ini_path_platform() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        // Windows
        let program_files =
            std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".to_string());
        let paths = vec![
            PathBuf::from(&program_files).join("PHP").join("php.ini"),
            PathBuf::from("C:\\").join("php").join("php.ini"),
            PathBuf::from("C:\\").join("php.ini"),
            home_dir().join("php.ini"),
        ];
        for path in paths {
            if path.exists() {
                return path;
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // macOS
        let paths = vec![
            PathBuf::from("/etc/php.ini"),
            PathBuf::from("/usr/local/etc/php/php.ini"),
            PathBuf::from("/opt/homebrew/etc/php/php.ini"),
            home_dir().join(".php.ini"),
        ];
        for path in paths {
            if path.exists() {
                return path;
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Linux
        let paths = vec![
            PathBuf::from("/etc/php.ini"),
            PathBuf::from("/etc/php/php.ini"),
            PathBuf::from("/etc/php/8.5/cli/php.ini"),
            PathBuf::from("/etc/php/8.4/cli/php.ini"),
            PathBuf::from("/etc/php/8.3/cli/php.ini"),
            PathBuf::from("/etc/php/8.2/cli/php.ini"),
            PathBuf::from("/etc/php/8.1/cli/php.ini"),
            PathBuf::from("/etc/php/8.0/cli/php.ini"),
            PathBuf::from("/usr/local/etc/php/php.ini"),
            home_dir().join(".php.ini"),
        ];
        for path in paths {
            if path.exists() {
                return path;
            }
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        return PathBuf::from("/etc/php.ini");
    }

    PathBuf::from("/etc/php.ini")
}

pub fn get_php_ini_path() -> String {
    if let Some(path) = get_php_ini_path_from_php() {
        return path;
    }
    get_php_ini_path_platform().to_string_lossy().to_string()
}

pub fn get_php_ini_content() -> Result<String, String> {
    let path = get_php_ini_path();
    fs::read_to_string(&path).map_err(|e| format!("Failed to read php.ini: {}", e))
}

pub fn save_php_ini_content(content: &str) -> Result<(), String> {
    let path = get_php_ini_path();
    fs::write(&path, content).map_err(|e| format!("Failed to write php.ini: {}", e))
}

pub fn get_php_ini_settings() -> Result<Vec<PhpIniSetting>, String> {
    let content = get_php_ini_content()?;
    let mut settings = Vec::new();

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with(';') || line.starts_with('#') {
            continue;
        }
        if let Some(equal_pos) = line.find('=') {
            let key = line[..equal_pos].trim().to_string();
            let value = line[equal_pos + 1..].trim().to_string();
            if !key.is_empty() && !key.starts_with('[') {
                settings.push(PhpIniSetting { key, value });
            }
        }
    }

    Ok(settings)
}

pub fn update_php_ini_setting(key: &str, value: &str) -> Result<(), String> {
    let content = get_php_ini_content()?;
    let mut lines: Vec<String> = content.lines().map(|l| l.to_string()).collect();
    let mut found = false;

    // Try to find and update the setting
    for line in &mut lines {
        if let Some(equal_pos) = line.find('=') {
            let current_key = line[..equal_pos].trim();
            if current_key == key {
                *line = format!("{} = {}", key, value);
                found = true;
                break;
            }
        }
    }

    // If not found, add it
    if !found {
        lines.push(format!("{} = {}", key, value));
    }

    let new_content = lines.join("\n");
    save_php_ini_content(&new_content)
}

pub fn is_php_ini_writable() -> bool {
    let path = get_php_ini_path();
    fs::metadata(&path)
        .and_then(|meta| {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mode = meta.permissions().mode();
                Ok(mode & 0o200 != 0)
            }
            #[cfg(windows)]
            {
                Ok(!meta.permissions().readonly())
            }
            #[cfg(not(any(unix, windows)))]
            {
                Ok(true)
            }
        })
        .unwrap_or(false)
}

pub fn get_php_ini_file_info() -> PhpIniInfo {
    let path = get_php_ini_path();
    let content = get_php_ini_content().unwrap_or_else(|_| "; php.ini not readable".to_string());
    let is_writable = is_php_ini_writable();

    PhpIniInfo {
        path,
        content,
        is_writable,
    }
}

pub fn validate_php_ini_content(content: &str) -> Result<Vec<String>, String> {
    let mut errors = Vec::new();
    let lines: Vec<&str> = content.lines().collect();

    for (i, line) in lines.iter().enumerate() {
        let line = line.trim();
        if line.is_empty() || line.starts_with(';') || line.starts_with('#') {
            continue;
        }
        if line.starts_with('[') && !line.ends_with(']') {
            errors.push(format!("Line {}: Invalid section header '{}'", i + 1, line));
        }
        if line.contains('=') {
            let parts: Vec<&str> = line.splitn(2, '=').collect();
            if parts.len() == 2 {
                let key = parts[0].trim();
                if key.is_empty() {
                    errors.push(format!("Line {}: Empty key", i + 1));
                }
            }
        } else if !line.starts_with('[') {
            errors.push(format!("Line {}: No '=' found in '{}'", i + 1, line));
        }
    }

    Ok(errors)
}
