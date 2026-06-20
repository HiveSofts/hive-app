use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;

use tauri::{AppHandle, Emitter};

use crate::modules::common::path::{expand_home, hive_bin_dir, hive_projects_dir};
use crate::modules::common::templates::{css_template, html_template, js_template};
use crate::modules::common::utils::setup_path;

#[tauri::command]
pub async fn create_static_project(
    app: AppHandle,
    project_path: String,
    name: String,
    index_path: String,
    create_css: bool,
    create_js: bool,
    use_npm: bool,
    install_live_server: bool,
    github_repo: Option<String>,
    host: String,
    port: u16,
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
            "static-output",
            serde_json::json!({
                "runId": run_id,
                "type": "info",
                "data": format!(
                    "Creating Static project: {} in {}\nIndex: {}",
                    name,
                    project_path.display(),
                    index_path
                )
            }),
        );

        std::fs::create_dir_all(&full_path)
            .map_err(|e| format!("Failed to create project directory: {}", e))?;

        if let Some(ref repo) = github_repo {
            if !repo.is_empty() {
                let _ = app.emit(
                    "static-output",
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
                                "static-output",
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
                                "static-output",
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
                    "static-output",
                    serde_json::json!({
                        "runId": run_id,
                        "type": "stdout",
                        "data": "✓ Repository cloned successfully"
                    }),
                );
            }
        } else {
            let _ = app.emit(
                "static-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "stdout",
                    "data": "✓ Creating project structure"
                }),
            );

            let index_file_path = full_path.join(&index_path);
            let parent_dir = index_file_path.parent().unwrap_or(&full_path);
            std::fs::create_dir_all(parent_dir)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;

            let html_content = html_template(&name, create_css, create_js);
            std::fs::write(&index_file_path, html_content)
                .map_err(|e| format!("Failed to write index file: {}", e))?;

            let _ = app.emit(
                "static-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "stdout",
                    "data": format!("✓ {} created", index_path)
                }),
            );

            if create_css {
                let css_path = full_path.join("styles.css");
                std::fs::write(&css_path, css_template())
                    .map_err(|e| format!("Failed to write styles.css: {}", e))?;
                let _ = app.emit(
                    "static-output",
                    serde_json::json!({
                        "runId": run_id,
                        "type": "stdout",
                        "data": "✓ styles.css created"
                    }),
                );
            }

            if create_js {
                let js_path = full_path.join("script.js");
                std::fs::write(&js_path, js_template())
                    .map_err(|e| format!("Failed to write script.js: {}", e))?;
                let _ = app.emit(
                    "static-output",
                    serde_json::json!({
                        "runId": run_id,
                        "type": "stdout",
                        "data": "✓ script.js created"
                    }),
                );
            }

            if use_npm {
                let _ = app.emit(
                    "static-output",
                    serde_json::json!({
                        "runId": run_id,
                        "type": "info",
                        "data": "📦 Initializing npm project..."
                    }),
                );

                let mut cmd = Command::new("npm");
                cmd.arg("init")
                    .arg("-y")
                    .current_dir(&full_path)
                    .stdin(Stdio::null())
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped());

                setup_path(&mut cmd);

                let mut child = cmd
                    .spawn()
                    .map_err(|e| format!("Failed to start npm init: {}", e))?;

                let status = child
                    .wait()
                    .map_err(|e| format!("Failed waiting for npm init: {}", e))?;

                if !status.success() {
                    return Err("Failed to initialize npm project".to_string());
                }

                let _ = app.emit(
                    "static-output",
                    serde_json::json!({
                        "runId": run_id,
                        "type": "stdout",
                        "data": "✓ npm init completed"
                    }),
                );

                if install_live_server {
                    let _ = app.emit(
                        "static-output",
                        serde_json::json!({
                            "runId": run_id,
                            "type": "info",
                            "data": "📦 Installing live-server..."
                        }),
                    );

                    let mut cmd = Command::new("npm");
                    cmd.arg("install")
                        .arg("-D")
                        .arg("live-server")
                        .current_dir(&full_path)
                        .stdin(Stdio::null())
                        .stdout(Stdio::piped())
                        .stderr(Stdio::piped());

                    setup_path(&mut cmd);

                    let mut child = cmd
                        .spawn()
                        .map_err(|e| format!("Failed to install live-server: {}", e))?;

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
                                    "static-output",
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
                                    "static-output",
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
                        .map_err(|e| format!("Failed waiting for live-server install: {}", e))?;

                    let _ = stdout_handle.join();
                    let _ = stderr_handle.join();

                    if !status.success() {
                        return Err("Failed to install live-server".to_string());
                    }

                    let _ = app.emit(
                        "static-output",
                        serde_json::json!({
                            "runId": run_id,
                            "type": "stdout",
                            "data": "✓ live-server installed"
                        }),
                    );

                    let package_json_path = full_path.join("package.json");
                    if let Ok(content) = std::fs::read_to_string(&package_json_path) {
                        if let Ok(mut json) = serde_json::from_str::<serde_json::Value>(&content) {
                            if let Some(obj) = json.as_object_mut() {
                                let scripts = obj.entry("scripts").or_insert(serde_json::json!({}));
                                if let Some(scripts_obj) = scripts.as_object_mut() {
                                    scripts_obj.insert(
                                        "dev".to_string(),
                                        serde_json::Value::String(format!(
                                            "live-server --port={} --host={} --watch",
                                            port, host
                                        )),
                                    );
                                    scripts_obj.insert(
                                        "start".to_string(),
                                        serde_json::Value::String(format!(
                                            "live-server --port={} --host={}",
                                            port, host
                                        )),
                                    );
                                }
                            }
                            std::fs::write(
                                &package_json_path,
                                serde_json::to_string_pretty(&json).map_err(|e| {
                                    format!("Failed to serialize package.json: {}", e)
                                })?,
                            )
                            .map_err(|e| format!("Failed to write package.json: {}", e))?;
                        }
                    }
                }
            }
        }

        let hive_dir = hive_projects_dir();
        std::fs::create_dir_all(&hive_dir)
            .map_err(|e| format!("Failed to create Hive projects directory: {}", e))?;

        let uuid = format!("{}-{}", name, chrono::Local::now().timestamp());
        let project_info = serde_json::json!({
            "id": uuid,
            "name": name,
            "type": "html5",
            "path": full_path.to_string_lossy().to_string(),
            "index_path": index_path,
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
            "static-output",
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
