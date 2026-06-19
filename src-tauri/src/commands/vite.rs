use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
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

#[tauri::command]
pub async fn create_vite_project(
    app: AppHandle,
    project_path: String,
    name: String,
    package_manager: String,
    template: String,
    install_deps: bool,
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
            "vite-output",
            serde_json::json!({
                "runId": run_id,
                "type": "info",
                "data": format!(
                    "Creating Vite project: {} in {}\nUsing: {}\nTemplate: {}",
                    name,
                    project_path.display(),
                    package_manager,
                    template
                )
            }),
        );

        let mut cmd = Command::new(&package_manager);

        cmd.arg("create")
            .arg("vite@latest")
            .arg(&name)
            .arg("--")
            .arg("--template")
            .arg(&template)
            .current_dir(&project_path)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        setup_path(&mut cmd);

        cmd.env("CI", "1");
        cmd.env("npm_config_yes", "true");
        cmd.env("npm_config_fund", "false");
        cmd.env("npm_config_audit", "false");
        cmd.env("npm_config_update_notifier", "false");

        if let Ok(home) = std::env::var("HOME") {
            cmd.env("HOME", home);
        }

        let _ = app.emit(
            "vite-output",
            serde_json::json!({
                "runId": run_id,
                "type": "info",
                "data": format!("Running: {} create vite@latest {} --template {}", package_manager, name, template)
            }),
        );

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to start Vite process: {}", e))?;

        let pid = child.id();
        let _ = app.emit(
            "vite-output",
            serde_json::json!({
                "runId": run_id,
                "type": "started",
                "pid": pid
            }),
        );

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Failed to capture stdout.".to_string())?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| "Failed to capture stderr.".to_string())?;

        let error_buffer = Arc::new(Mutex::new(String::new()));

        let stdout_handle = {
            let app = app.clone();
            let run_id = run_id.clone();
            thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines().map_while(Result::ok) {
                    let _ = app.emit(
                        "vite-output",
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
            let error_buffer = error_buffer.clone();
            thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines().map_while(Result::ok) {
                    if let Ok(mut err) = error_buffer.lock() {
                        err.push_str(&line);
                        err.push('\n');
                    }

                    let _ = app.emit(
                        "vite-output",
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
            .map_err(|e| format!("Failed waiting for Vite process: {}", e))?;

        let _ = stdout_handle.join();
        let _ = stderr_handle.join();

        if !status.success() {
            let err = error_buffer
                .lock()
                .map(|e| e.clone())
                .unwrap_or_else(|_| "Unknown Vite error.".to_string());

            let message = if err.trim().is_empty() {
                format!("Vite failed with exit code: {:?}", status.code())
            } else {
                format!("Vite failed:\n{}", err)
            };

            let _ = app.emit(
                "vite-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "error",
                    "data": message.clone()
                }),
            );

            return Err(message);
        }

        if install_deps {
            let _ = app.emit(
                "vite-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "info",
                    "data": format!("📦 Installing dependencies with {}...", package_manager)
                }),
            );

            let mut cmd = Command::new(&package_manager);
            cmd.arg("install")
                .current_dir(&full_path)
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            setup_path(&mut cmd);

            let mut child = cmd
                .spawn()
                .map_err(|e| format!("Failed to start install process: {}", e))?;

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
                            "vite-output",
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
                            "vite-output",
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
                .map_err(|e| format!("Failed waiting for install: {}", e))?;

            let _ = stdout_handle.join();
            let _ = stderr_handle.join();

            if !status.success() {
                return Err(format!(
                    "Dependency installation failed with exit code: {:?}",
                    status.code()
                ));
            }

            let _ = app.emit(
                "vite-output",
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
            "type": "vite",
            "path": full_path.to_string_lossy().to_string(),
            "package_manager": package_manager,
            "template": template,
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
            "vite-output",
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