use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter};

use crate::modules::common::path::{expand_home, hive_projects_dir,};
use crate::modules::common::utils::{setup_path, is_valid_package_manager};

fn command_exists_with_timeout(
    program: &str,
    args: &[&str],
    timeout: Duration,
) -> Result<Option<String>, String> {
    let mut child = Command::new(program)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env("CI", "1")
        .env("npm_config_yes", "true")
        .env("npm_config_fund", "false")
        .env("npm_config_audit", "false")
        .env("npm_config_update_notifier", "false")
        .spawn()
        .map_err(|e| format!("Failed to start {}: {}", program, e))?;

    let start = Instant::now();

    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let output = child
                    .wait_with_output()
                    .map_err(|e| format!("Failed reading {} output: {}", program, e))?;

                if status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                    let version = if !stdout.is_empty() { stdout } else { stderr };
                    return Ok(Some(version));
                }
                return Ok(None);
            }
            Ok(None) => {
                if start.elapsed() >= timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Ok(None);
                }
                thread::sleep(Duration::from_millis(50));
            }
            Err(e) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("Failed waiting for {}: {}", program, e));
            }
        }
    }
}

#[tauri::command]
pub async fn check_package_manager(manager: String) -> Result<serde_json::Value, String> {
    if !is_valid_package_manager(&manager) {
        return Err(format!("Unknown package manager: {}", manager));
    }

    tauri::async_runtime::spawn_blocking(move || {
        match command_exists_with_timeout(&manager, &["--version"], Duration::from_secs(5)) {
            Ok(Some(version)) => Ok(serde_json::json!({
                "installed": true,
                "version": version
            })),
            Ok(None) => Ok(serde_json::json!({
                "installed": false,
                "version": null
            })),
            Err(_) => Ok(serde_json::json!({
                "installed": false,
                "version": null
            })),
        }
    })
    .await
    .map_err(|e| format!("Join error: {}", e))?
}

#[tauri::command]
pub async fn install_package_manager(manager: String) -> Result<(), String> {
    if !is_valid_package_manager(&manager) {
        return Err(format!("Unknown package manager: {}", manager));
    }

    if manager == "npm" {
        return Err("Automatic npm upgrade is disabled. Please update npm manually.".to_string());
    }

    if manager == "bun" {
        return Err("Automatic Bun installation is disabled. Please install Bun manually.".to_string());
    }

    tauri::async_runtime::spawn_blocking(move || {
        match command_exists_with_timeout("npm", &["--version"], Duration::from_secs(5)) {
            Ok(Some(_)) => {}
            _ => return Err("npm is required but it is not installed or not available in PATH.".to_string()),
        }

        let package_name = match manager.as_str() {
            "yarn" => "yarn",
            "pnpm" => "pnpm",
            _ => return Err(format!("Automatic install is not supported for {}", manager)),
        };

        let mut cmd = Command::new("npm");
        cmd.arg("install")
            .arg("-g")
            .arg(package_name)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        setup_path(&mut cmd);

        cmd.env("CI", "1");
        cmd.env("npm_config_yes", "true");
        cmd.env("npm_config_fund", "false");
        cmd.env("npm_config_audit", "false");
        cmd.env("npm_config_update_notifier", "false");

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to start npm install -g {}: {}", package_name, e))?;

        let start = Instant::now();
        let timeout = Duration::from_secs(300);

        loop {
            match child.try_wait() {
                Ok(Some(status)) => {
                    let output = child
                        .wait_with_output()
                        .map_err(|e| format!("Failed to read npm output: {}", e))?;

                    if status.success() {
                        return Ok(());
                    }

                    let stdout = String::from_utf8_lossy(&output.stdout);
                    let stderr = String::from_utf8_lossy(&output.stderr);

                    return Err(format!(
                        "Failed to install {}.\nstdout:\n{}\nstderr:\n{}",
                        manager, stdout, stderr
                    ));
                }
                Ok(None) => {
                    if start.elapsed() > timeout {
                        let _ = child.kill();
                        let _ = child.wait();
                        return Err(format!("Installing {} timed out.", manager));
                    }
                    thread::sleep(Duration::from_millis(100));
                }
                Err(e) => {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(format!("Failed while waiting for npm install: {}", e));
                }
            }
        }
    })
    .await
    .map_err(|e| format!("Join error: {}", e))?
}

#[tauri::command]
pub async fn create_nextjs_project(
    app: AppHandle,
    project_path: String,
    name: String,
    package_manager: String,
    args: Vec<String>,
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
            "nextjs-output",
            serde_json::json!({
                "runId": run_id,
                "type": "info",
                "data": format!(
                    "Creating Next.js project: {} in {}\nUsing: {}",
                    name,
                    project_path.display(),
                    package_manager
                )
            }),
        );

        let mut cmd = Command::new(&package_manager);

        match package_manager.as_str() {
            "npm" => {
                cmd.arg("create")
                    .arg("next-app")
                    .arg(&name)
                    .arg("--")
                    .args(&args);
            }
            "yarn" | "pnpm" | "bun" => {
                cmd.arg("create")
                    .arg("next-app")
                    .arg(&name)
                    .args(&args);
            }
            _ => return Err(format!("Unknown package manager: {}", package_manager)),
        }

        cmd.current_dir(&project_path)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        setup_path(&mut cmd);

        cmd.env("CI", "1");
        cmd.env("NEXT_TELEMETRY_DISABLED", "1");
        cmd.env("npm_config_yes", "true");
        cmd.env("npm_config_fund", "false");
        cmd.env("npm_config_audit", "false");
        cmd.env("npm_config_update_notifier", "false");

        if let Ok(home) = std::env::var("HOME") {
            cmd.env("HOME", home);
        }

        let _ = app.emit(
            "nextjs-output",
            serde_json::json!({
                "runId": run_id,
                "type": "info",
                "data": format!("Running: {} create next-app {} {}", package_manager, name, args.join(" "))
            }),
        );

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to start Next.js process: {}", e))?;

        let pid = child.id();
        let _ = app.emit(
            "nextjs-output",
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
                        "nextjs-output",
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
                        "nextjs-output",
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
            .map_err(|e| format!("Failed waiting for Next.js process: {}", e))?;

        let _ = stdout_handle.join();
        let _ = stderr_handle.join();

        if !status.success() {
            let err = error_buffer
                .lock()
                .map(|e| e.clone())
                .unwrap_or_else(|_| "Unknown Next.js error.".to_string());

            let message = if err.trim().is_empty() {
                format!("Next.js failed with exit code: {:?}", status.code())
            } else {
                format!("Next.js failed:\n{}", err)
            };

            let _ = app.emit(
                "nextjs-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "error",
                    "data": message.clone()
                }),
            );

            return Err(message);
        }

        let hive_dir = hive_projects_dir();
        std::fs::create_dir_all(&hive_dir)
            .map_err(|e| format!("Failed to create Hive projects directory: {}", e))?;

        let uuid = format!("{}-{}", name, chrono::Local::now().timestamp());
        let project_info = serde_json::json!({
            "id": uuid,
            "name": name,
            "type": "nextjs",
            "path": full_path.to_string_lossy().to_string(),
            "package_manager": package_manager,
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
            "nextjs-output",
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