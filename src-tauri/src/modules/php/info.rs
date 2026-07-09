use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;

use crate::modules::common::utils::setup_path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhpExtension {
    pub name: String,
    pub enabled: bool,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhpIniSetting {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhpInfo {
    pub version: String,
    pub sapi: String,
    pub extensions: Vec<PhpExtension>,
    pub ini_settings: Vec<PhpIniSetting>,
}

/// Parse `php -v` output to extract the version string, e.g. "8.3.12".
fn parse_php_version() -> String {
    let mut cmd = Command::new("php");
    cmd.arg("-v");
    setup_path(&mut cmd);

    if let Ok(out) = cmd.output() {
        let text = String::from_utf8_lossy(&out.stdout);
        // "PHP 8.3.12 (cli) ..."
        if let Some(line) = text.lines().next() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                return parts[1].to_string();
            }
        }
    }
    "unknown".to_string()
}

/// Parse `php -m` output to get loaded module names.
fn parse_php_modules() -> Vec<PhpExtension> {
    let mut cmd = Command::new("php");
    cmd.arg("-m");
    setup_path(&mut cmd);

    let mut extensions = Vec::new();
    if let Ok(out) = cmd.output() {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let trimmed = line.trim();
            // Skip section headers like "[PHP Modules]" and "[Zend Modules]"
            if trimmed.is_empty() || trimmed.starts_with('[') {
                continue;
            }
            extensions.push(PhpExtension {
                name: trimmed.to_lowercase(),
                enabled: true,
                version: None,
            });
        }
    }
    extensions
}

/// Parse key ini directives via `php -r`.
fn parse_ini_settings() -> Vec<PhpIniSetting> {
    let keys = [
        "memory_limit",
        "max_execution_time",
        "upload_max_filesize",
        "post_max_size",
        "display_errors",
        "error_reporting",
        "date.timezone",
        "opcache.enable",
        "default_charset",
        "max_input_time",
    ];

    let mut settings = Vec::new();
    for key in &keys {
        let script = format!("echo ini_get('{}');", key);
        let mut cmd = Command::new("php");
        cmd.args(["-r", &script]);
        setup_path(&mut cmd);

        let value = if let Ok(out) = cmd.output() {
            String::from_utf8_lossy(&out.stdout).trim().to_string()
        } else {
            String::new()
        };

        settings.push(PhpIniSetting {
            key: key.to_string(),
            value: if value.is_empty() {
                "—".to_string()
            } else {
                value
            },
        });
    }
    settings
}

#[command]
pub async fn get_php_info(_project_path: String) -> Result<PhpInfo, String> {
    let version = parse_php_version();
    let extensions = parse_php_modules();
    let ini_settings = parse_ini_settings();

    // Detect SAPI from `php -r "echo php_sapi_name();"`.
    let sapi = {
        let mut cmd = Command::new("php");
        cmd.args(["-r", "echo php_sapi_name();"]);
        setup_path(&mut cmd);
        if let Ok(out) = cmd.output() {
            String::from_utf8_lossy(&out.stdout).trim().to_string()
        } else {
            "cli".to_string()
        }
    };

    Ok(PhpInfo {
        version,
        sapi,
        extensions,
        ini_settings,
    })
}
