use std::fs;
use std::path::PathBuf;

use serde::Serialize;

use crate::modules::common::path::expand_home;

#[derive(Debug, Clone, Serialize)]
pub struct WordPressExtension {
    pub slug: String,
    pub name: String,
    pub version: Option<String>,
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct WordPressLogResult {
    pub content: String,
    pub source: String,
}

/// Extract a `Name:` / `Version:` style header from the first PHP comment block
/// of a file (used for plugin and theme metadata).
fn parse_header(file_path: &PathBuf) -> (Option<String>, Option<String>) {
    let content = match fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return (None, None),
    };

    // Find the first /* ... */ block.
    let start = match content.find("/*") {
        Some(i) => i,
        None => return (None, None),
    };
    let rest = &content[start + 2..];
    let end = match rest.find("*/") {
        Some(i) => i,
        None => return (None, None),
    };
    let block = &rest[..end];

    let name = block
        .lines()
        .find_map(|line| {
            let line = line.trim_start_matches([' ', '*', '\t']);
            line.strip_prefix("Plugin Name:")
                .or_else(|| line.strip_prefix("Theme Name:"))
        })
        .map(|s| s.trim().to_string());

    let version = block
        .lines()
        .find_map(|line| {
            let line = line.trim_start_matches([' ', '*', '\t']);
            line.strip_prefix("Version:")
        })
        .map(|s| s.trim().to_string());

    (name, version)
}

fn list_extensions(base: &PathBuf, header_kind: &str) -> Vec<WordPressExtension> {
    if !base.exists() {
        return vec![];
    }

    let mut result = vec![];
    if let Ok(entries) = fs::read_dir(base) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let slug = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            // Locate the metadata file.
            let meta_file = if header_kind == "theme" {
                path.join("style.css")
            } else {
                // Prefer a .php file matching the slug, else the first .php file.
                let matching = path.join(format!("{}.php", slug));
                if matching.exists() {
                    matching
                } else {
                    fs::read_dir(&path)
                        .ok()
                        .and_then(|mut d| {
                            d.find_map(|e| {
                                let p = e.ok()?.path();
                                if p.extension().map(|x| x == "php").unwrap_or(false) {
                                    Some(p)
                                } else {
                                    None
                                }
                            })
                        })
                        .unwrap_or(matching)
                }
            };

            let (name, version) = if meta_file.exists() {
                parse_header(&meta_file)
            } else {
                (None, None)
            };

            result.push(WordPressExtension {
                slug: slug.clone(),
                name: name.unwrap_or_else(|| slug.clone()),
                version,
                path: path.to_string_lossy().to_string(),
            });
        }
    }

    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    result
}

#[tauri::command]
pub fn get_wordpress_plugins(project_path: String) -> Result<Vec<WordPressExtension>, String> {
    let project_path = PathBuf::from(expand_home(&project_path));
    let plugins_dir = project_path.join("wp-content").join("plugins");
    Ok(list_extensions(&plugins_dir, "plugin"))
}

#[tauri::command]
pub fn get_wordpress_themes(project_path: String) -> Result<Vec<WordPressExtension>, String> {
    let project_path = PathBuf::from(expand_home(&project_path));
    let themes_dir = project_path.join("wp-content").join("themes");
    Ok(list_extensions(&themes_dir, "theme"))
}

#[tauri::command]
pub fn get_wordpress_logs(project_path: String) -> Result<WordPressLogResult, String> {
    let project_path = PathBuf::from(expand_home(&project_path));

    // Prefer WordPress' own debug log.
    let debug_log = project_path.join("wp-content").join("debug.log");
    if debug_log.exists() {
        if let Ok(content) = fs::read_to_string(&debug_log) {
            return Ok(WordPressLogResult {
                content,
                source: "wp-content/debug.log".to_string(),
            });
        }
    }

    // Fall back to the Hive server log.
    let project_name = project_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let server_log = PathBuf::from(home)
        .join(".hive")
        .join("logs")
        .join("projects")
        .join(&project_name)
        .join("server.log");

    if server_log.exists() {
        if let Ok(content) = fs::read_to_string(&server_log) {
            return Ok(WordPressLogResult {
                content,
                source: "server.log".to_string(),
            });
        }
    }

    Ok(WordPressLogResult {
        content: "".to_string(),
        source: "none".to_string(),
    })
}
