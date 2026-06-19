use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;

use tauri::{AppHandle, Emitter};

fn expand_home(path: &str) -> String {
    if path.starts_with("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return path.replacen("~", &home, 1);
        }
    }
    path.to_string()
}

fn hive_base_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".hive")
}

fn hive_projects_dir() -> PathBuf {
    hive_base_dir().join("projects")
}

fn hive_bin_dir() -> PathBuf {
    hive_base_dir().join("bin")
}

fn setup_path(cmd: &mut Command) {
    let hive_bin = hive_bin_dir();
    let current_path = std::env::var("PATH").unwrap_or_default();
    let separator = if cfg!(windows) { ";" } else { ":" };
    let new_path = format!("{}{}{}", hive_bin.to_string_lossy(), separator, current_path);
    cmd.env("PATH", new_path);
}

fn is_valid_package_name(name: &str) -> bool {
    let re = regex::Regex::new(r"^[a-z0-9]([_.-]?[a-z0-9]+)*/[a-z0-9](([_.]|-{1,2})?[a-z0-9]+)*$").unwrap();
    re.is_match(name)
}

fn sanitize_package_name(name: &str) -> String {
    name.to_lowercase()
        .replace(" ", "-")
        .replace("_", "-")
        .chars()
        .filter(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || *c == '-' || *c == '.')
        .collect()
}

#[tauri::command]
pub async fn create_php_project(
    app: AppHandle,
    project_path: String,
    name: String,
    description: String,
    php_version: String,
    entry_point: String,
    vendor_name: String,
    package_name: String,
    namespace: String,
    src_path: String,
    github_repo: Option<String>,
    run_id: Option<String>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let project_path = PathBuf::from(expand_home(&project_path));

        if name.trim().is_empty() {
            return Err("Project name cannot be empty.".to_string());
        }

        if !project_path.exists() {
            std::fs::create_dir_all(&project_path)
                .map_err(|e| format!("Failed to create projects directory: {}", e))?;
        }

        let full_path = project_path.join(&name);

        if full_path.exists() {
            return Err(format!("Project already exists: {}", full_path.display()));
        }

        let _ = app.emit(
            "php-output",
            serde_json::json!({
                "runId": run_id,
                "type": "info",
                "data": format!(
                    "Creating PHP project: {} in {}\nPHP Version: {}",
                    name,
                    project_path.display(),
                    php_version
                )
            }),
        );

        std::fs::create_dir_all(&full_path)
            .map_err(|e| format!("Failed to create project directory: {}", e))?;

        if let Some(ref repo) = github_repo {
            if !repo.is_empty() {
                let _ = app.emit(
                    "php-output",
                    serde_json::json!({
                        "runId": run_id,
                        "type": "info",
                        "data": format!("Cloning from GitHub: {}", repo)
                    }),
                );

                let mut cmd = Command::new("git");
                cmd.arg("clone")
                    .arg(repo)
                    .arg(&name)
                    .current_dir(&project_path)
                    .stdin(Stdio::null())
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped());

                setup_path(&mut cmd);

                let mut child = cmd
                    .spawn()
                    .map_err(|e| format!("Failed to clone repository: {}", e))?;

                let stdout = child
                    .stdout
                    .take()
                    .ok_or_else(|| "Failed to capture stdout.")?;
                let stderr = child
                    .stderr
                    .take()
                    .ok_or_else(|| "Failed to capture stderr.")?;

                let stdout_handle = {
                    let app = app.clone();
                    let run_id = run_id.clone();
                    thread::spawn(move || {
                        let reader = BufReader::new(stdout);
                        for line in reader.lines().map_while(Result::ok) {
                            let _ = app.emit(
                                "php-output",
                                serde_json::json!({
                                    "runId": run_id,
                                    "type": "stdout",
                                    "data": line
                                }),
                            );
                        }
                    })
                };

                let stderr_handle = {
                    let app = app.clone();
                    let run_id = run_id.clone();
                    thread::spawn(move || {
                        let reader = BufReader::new(stderr);
                        for line in reader.lines().map_while(Result::ok) {
                            let _ = app.emit(
                                "php-output",
                                serde_json::json!({
                                    "runId": run_id,
                                    "type": "stderr",
                                    "data": line
                                }),
                            );
                        }
                    })
                };

                let status = child
                    .wait()
                    .map_err(|e| format!("Failed waiting for git clone: {}", e))?;

                let _ = stdout_handle.join();
                let _ = stderr_handle.join();

                if !status.success() {
                    return Err("Failed to clone repository".to_string());
                }

                let _ = app.emit(
                    "php-output",
                    serde_json::json!({
                        "runId": run_id,
                        "type": "stdout",
                        "data": "✓ Repository cloned successfully"
                    }),
                );
            }
        } else {
            let _ = app.emit(
                "php-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "stdout",
                    "data": "✓ Creating project structure"
                }),
            );

            let src_dir = full_path.join(&src_path);
            std::fs::create_dir_all(&src_dir)
                .map_err(|e| format!("Failed to create src directory: {}", e))?;

            let public_dir = full_path.join("public");
            std::fs::create_dir_all(&public_dir)
                .map_err(|e| format!("Failed to create public directory: {}", e))?;

            let vendor = if vendor_name.trim().is_empty() {
                "vendor".to_string()
            } else {
                sanitize_package_name(&vendor_name)
            };

            let package = if package_name.trim().is_empty() {
                sanitize_package_name(&name)
            } else {
                sanitize_package_name(&package_name)
            };

            let full_package_name = format!("{}/{}", vendor, package);

            if !is_valid_package_name(&full_package_name) {
                return Err(format!(
                    "Invalid package name: '{}'. Must be in format 'vendor/package' with lowercase letters, numbers, dots, hyphens and underscores.",
                    full_package_name
                ));
            }

            let composer_json = serde_json::json!({
                "name": full_package_name,
                "description": if description.trim().is_empty() { "A PHP project" } else { &description },
                "type": "project",
                "require": {
                    "php": format!(">={}", php_version)
                },
                "autoload": {
                    "psr-4": {
                        format!("{}\\", namespace): src_path
                    }
                },
                "autoload-dev": {
                    "psr-4": {
                        format!("{}\\Tests\\", namespace): "tests/"
                    }
                },
                "authors": [
                    {
                        "name": vendor,
                        "email": "author@example.com"
                    }
                ],
                "license": "MIT"
            });

            let composer_path = full_path.join("composer.json");
            std::fs::write(
                &composer_path,
                serde_json::to_string_pretty(&composer_json)
                    .map_err(|e| format!("Failed to serialize composer.json: {}", e))?,
            )
            .map_err(|e| format!("Failed to write composer.json: {}", e))?;

            let _ = app.emit(
                "php-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "stdout",
                    "data": "✓ composer.json created"
                }),
            );

            let index_path = full_path.join(&entry_point);
            let parent_dir = index_path.parent().unwrap_or(&full_path);
            std::fs::create_dir_all(parent_dir)
                .map_err(|e| format!("Failed to create entry point directory: {}", e))?;

            let src_path_clean = src_path.trim_end_matches('/').trim_end_matches('\\');
            let index_content = format!(
                r#"<?php

require_once __DIR__ . '/../{}/autoload.php';

use {}\App;

$app = new App();
$app->run();
"#,
                src_path_clean, namespace
            );

            std::fs::write(&index_path, index_content)
                .map_err(|e| format!("Failed to write index file: {}", e))?;

            let _ = app.emit(
                "php-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "stdout",
                    "data": format!("✓ {} created", entry_point)
                }),
            );

            let app_path = src_dir.join("App.php");
            let app_content = format!(
                r#"<?php

namespace {};

class App
{{
    public function run(): void
    {{
        echo "Hello from PHP!\n";
        echo "Project: {}\n";
    }}
}}
"#,
                namespace, name
            );

            std::fs::write(&app_path, app_content)
                .map_err(|e| format!("Failed to write App.php: {}", e))?;

            let _ = app.emit(
                "php-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "stdout",
                    "data": "✓ App.php created"
                }),
            );

            let _ = app.emit(
                "php-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "info",
                    "data": "📦 Installing dependencies with composer..."
                }),
            );

            let mut cmd = Command::new("composer");
            cmd.arg("install")
                .arg("--no-progress")
                .arg("--no-interaction")
                .current_dir(&full_path)
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            setup_path(&mut cmd);

            let mut child = cmd
                .spawn()
                .map_err(|e| format!("Failed to start composer install: {}", e))?;

            let stdout = child
                .stdout
                .take()
                .ok_or_else(|| "Failed to capture stdout.")?;
            let stderr = child
                .stderr
                .take()
                .ok_or_else(|| "Failed to capture stderr.")?;

            let stdout_handle = {
                let app = app.clone();
                let run_id = run_id.clone();
                thread::spawn(move || {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines().map_while(Result::ok) {
                        let _ = app.emit(
                            "php-output",
                            serde_json::json!({
                                "runId": run_id,
                                "type": "stdout",
                                "data": line
                            }),
                        );
                    }
                })
            };

            let stderr_handle = {
                let app = app.clone();
                let run_id = run_id.clone();
                thread::spawn(move || {
                    let reader = BufReader::new(stderr);
                    for line in reader.lines().map_while(Result::ok) {
                        let _ = app.emit(
                            "php-output",
                            serde_json::json!({
                                "runId": run_id,
                                "type": "stderr",
                                "data": line
                            }),
                        );
                    }
                })
            };

            let status = child
                .wait()
                .map_err(|e| format!("Failed waiting for composer install: {}", e))?;

            let _ = stdout_handle.join();
            let _ = stderr_handle.join();

            if !status.success() {
                return Err("Failed to install composer dependencies".to_string());
            }

            let _ = app.emit(
                "php-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "stdout",
                    "data": "✓ Dependencies installed successfully"
                }),
            );
        }

        let hive_dir = hive_projects_dir();
        std::fs::create_dir_all(&hive_dir)
            .map_err(|e| format!("Failed to create Hive projects directory: {}", e))?;

        let uuid = format!("{}-{}", name, chrono::Local::now().timestamp());
        let project_info = serde_json::json!({
            "id": uuid,
            "name": name,
            "type": "php",
            "path": full_path.to_string_lossy().to_string(),
            "php_version": php_version,
            "entry_point": entry_point,
            "github_repo": github_repo,
            "created_at": chrono::Local::now().to_rfc3339(),
        });

        let project_file = hive_dir.join(format!("{}.json", name));

        std::fs::write(
            &project_file,
            serde_json::to_string_pretty(&project_info)
                .map_err(|e| format!("Failed to serialize project metadata: {}", e))?,
        )
        .map_err(|e| format!("Failed to save project metadata: {}", e))?;

        let _ = app.emit(
            "php-output",
            serde_json::json!({
                "runId": run_id,
                "type": "complete",
                "data": "Project created successfully."
            }),
        );

        Ok(())
    })
    .await
    .map_err(|e| format!("Join error: {}", e))?
}