use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageInfo {
    pub name: String,
    pub version: String,
    pub installed: String,
    pub package_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub name: String,
    pub description: String,
}

fn get_hive_bin_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".hive").join("bin")
}

fn get_composer_path() -> PathBuf {
    get_hive_bin_dir().join("composer")
}

fn get_project_composer_json(project_path: &str) -> PathBuf {
    PathBuf::from(project_path).join("composer.json")
}

#[command]
pub async fn get_installed_packages(project_path: String) -> Result<Vec<PackageInfo>, String> {
    let composer_path = get_composer_path();
    if !composer_path.exists() {
        return Err("Composer not found in Hive bin directory".to_string());
    }

    let composer_json = get_project_composer_json(&project_path);
    if !composer_json.exists() {
        return Ok(vec![]);
    }

    let output = Command::new(&composer_path)
        .arg("show")
        .arg("--format=json")
        .arg("--no-interaction")
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run composer show: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Composer show failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    #[derive(Deserialize)]
    struct ComposerShowOutput {
        installed: Vec<ComposerPackage>,
    }

    #[derive(Deserialize, Clone)]
    struct ComposerPackage {
        name: String,
        version: String,
        #[serde(rename = "type")]
        package_type: Option<String>,
        description: Option<String>,
    }

    let parsed: ComposerShowOutput = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse composer output: {}", e))?;

    let mut packages: Vec<PackageInfo> = Vec::new();

    for pkg in parsed.installed {
        let package_type = if is_dev_dependency(&project_path, &pkg.name) {
            "require-dev".to_string()
        } else {
            "require".to_string()
        };

        packages.push(PackageInfo {
            name: pkg.name.clone(),
            version: pkg.version.clone(),
            installed: pkg.version,
            package_type,
        });
    }

    Ok(packages)
}

#[command]
pub async fn search_packages(
    query: String,
    project_path: Option<String>,
) -> Result<Vec<SearchResult>, String> {
    let composer_path = get_composer_path();
    if !composer_path.exists() {
        return Err("Composer not found in Hive bin directory".to_string());
    }

    let mut cmd = Command::new(&composer_path);
    cmd.arg("search")
        .arg(&query)
        .arg("--no-interaction")
        .arg("--format=json");

    if let Some(path) = project_path {
        cmd.current_dir(&path);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run composer search: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Composer search failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Composer search returns different format
    // Sometimes it's a map, sometimes it's an array
    let results: Vec<SearchResult> =
        if let Ok(map) = serde_json::from_str::<serde_json::Value>(&stdout) {
            let mut results = Vec::new();

            // Try to parse as object/map
            if let Some(obj) = map.as_object() {
                for (name, value) in obj {
                    let description = value
                        .as_object()
                        .and_then(|v| v.get("description"))
                        .and_then(|d| d.as_str())
                        .unwrap_or("No description")
                        .to_string();

                    // Only include if name starts with query (for better results)
                    if name.to_lowercase().contains(&query.to_lowercase())
                        || description.to_lowercase().contains(&query.to_lowercase())
                    {
                        results.push(SearchResult {
                            name: name.clone(),
                            description,
                        });
                    }
                }
            } else {
                // Try to parse as array
                if let Some(arr) = map.as_array() {
                    for item in arr {
                        if let Some(obj) = item.as_object() {
                            let name = obj
                                .get("name")
                                .and_then(|n| n.as_str())
                                .unwrap_or("")
                                .to_string();
                            let description = obj
                                .get("description")
                                .and_then(|d| d.as_str())
                                .unwrap_or("No description")
                                .to_string();

                            if !name.is_empty() {
                                results.push(SearchResult { name, description });
                            }
                        }
                    }
                } else {
                    // Fallback: parse as array of arrays
                    if let Some(arr) = map.as_array() {
                        for item in arr {
                            if let Some(arr2) = item.as_array() {
                                if arr2.len() >= 2 {
                                    if let Some(name) = arr2[0].as_str() {
                                        let description = arr2
                                            .get(1)
                                            .and_then(|d| d.as_str())
                                            .unwrap_or("No description")
                                            .to_string();
                                        results.push(SearchResult {
                                            name: name.to_string(),
                                            description,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            results
        } else {
            // Last resort: parse line by line
            let mut results = Vec::new();
            for line in stdout.lines() {
                if let Some((name, desc)) = line.split_once(' ') {
                    if !name.is_empty() && !desc.is_empty() {
                        results.push(SearchResult {
                            name: name.trim().to_string(),
                            description: desc.trim().to_string(),
                        });
                    }
                }
            }
            results
        };

    // Limit results
    let limited_results: Vec<SearchResult> = results.into_iter().take(50).collect();
    Ok(limited_results)
}

fn is_dev_dependency(project_path: &str, package_name: &str) -> bool {
    let composer_json_path = get_project_composer_json(project_path);
    if !composer_json_path.exists() {
        return false;
    }

    if let Ok(content) = fs::read_to_string(&composer_json_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(dev_deps) = json.get("require-dev") {
                if let Some(obj) = dev_deps.as_object() {
                    if obj.contains_key(package_name) {
                        return true;
                    }
                }
            }
        }
    }
    false
}

#[command]
pub async fn install_package(project_path: String, package: String) -> Result<String, String> {
    let composer_path = get_composer_path();
    if !composer_path.exists() {
        return Err("Composer not found in Hive bin directory".to_string());
    }

    let composer_json = get_project_composer_json(&project_path);
    if !composer_json.exists() {
        return Err("composer.json not found in project".to_string());
    }

    let output = Command::new(&composer_path)
        .arg("require")
        .arg(&package)
        .arg("--no-interaction")
        .arg("--no-progress")
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run composer require: {}", e))?;

    if output.status.success() {
        Ok(format!("Package '{}' installed successfully", package))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to install package: {}", stderr))
    }
}

#[command]
pub async fn remove_package(project_path: String, package: String) -> Result<String, String> {
    let composer_path = get_composer_path();
    if !composer_path.exists() {
        return Err("Composer not found in Hive bin directory".to_string());
    }

    let composer_json = get_project_composer_json(&project_path);
    if !composer_json.exists() {
        return Err("composer.json not found in project".to_string());
    }

    let output = Command::new(&composer_path)
        .arg("remove")
        .arg(&package)
        .arg("--no-interaction")
        .arg("--no-progress")
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run composer remove: {}", e))?;

    if output.status.success() {
        Ok(format!("Package '{}' removed successfully", package))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to remove package: {}", stderr))
    }
}

#[command]
pub async fn update_package(project_path: String, package: String) -> Result<String, String> {
    let composer_path = get_composer_path();
    if !composer_path.exists() {
        return Err("Composer not found in Hive bin directory".to_string());
    }

    let composer_json = get_project_composer_json(&project_path);
    if !composer_json.exists() {
        return Err("composer.json not found in project".to_string());
    }

    let output = Command::new(&composer_path)
        .arg("update")
        .arg(&package)
        .arg("--no-interaction")
        .arg("--no-progress")
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run composer update: {}", e))?;

    if output.status.success() {
        Ok(format!("Package '{}' updated successfully", package))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to update package: {}", stderr))
    }
}

#[command]
pub async fn get_package_details(
    project_path: String,
    package: String,
) -> Result<PackageInfo, String> {
    let composer_path = get_composer_path();
    if !composer_path.exists() {
        return Err("Composer not found in Hive bin directory".to_string());
    }

    let output = Command::new(&composer_path)
        .arg("show")
        .arg(&package)
        .arg("--format=json")
        .arg("--no-interaction")
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run composer show: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to get package details: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    #[derive(Deserialize)]
    struct PackageDetail {
        name: String,
        version: String,
        #[serde(rename = "type")]
        package_type: Option<String>,
    }

    let parsed: PackageDetail = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse package details: {}", e))?;

    Ok(PackageInfo {
        name: parsed.name.clone(),
        version: parsed.version.clone(),
        installed: parsed.version,
        package_type: if is_dev_dependency(&project_path, &parsed.name) {
            "require-dev".to_string()
        } else {
            "require".to_string()
        },
    })
}
