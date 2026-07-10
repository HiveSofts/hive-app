use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;

use tauri::{AppHandle, Emitter};

use crate::modules::common::path::{expand_home, hive_projects_dir};
use crate::modules::common::utils::{is_valid_package_manager, setup_path};
use chrono::Local;

#[tauri::command]
pub async fn create_nodejs_project(
    app: AppHandle,
    project_path: String,
    name: String,
    package_manager: String,
    framework: String,
    entry_point: String,
    install_deps: bool,
    description: Option<String>,
    host: Option<String>,
    port: Option<u16>,
    node_version: Option<String>,
    git_init: bool,
    author_name: Option<String>,
    author_email: Option<String>,
    license: Option<String>,
    run_id: Option<String>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let project_path = PathBuf::from(expand_home(&project_path));

        if name.trim().is_empty() {
            return Err("Project name cannot be empty.".to_string());
        }

        if !is_valid_package_manager(&package_manager) {
            return Err(format!("Unknown package manager: {}", package_manager));
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
            "nodejs-output",
            serde_json::json!({
                "runId": run_id,
                "type": "info",
                "data": format!(
                    "Creating Node.js project: {} in {}\nUsing: {}",
                    name,
                    project_path.display(),
                    package_manager
                )
            }),
        );

        std::fs::create_dir_all(&full_path)
            .map_err(|e| format!("Failed to create project directory: {}", e))?;

        let author_str = match (author_name.as_deref(), author_email.as_deref()) {
            (Some(name), Some(email)) => format!("{} <{}>", name, email),
            (Some(name), None) => name.to_string(),
            (None, Some(email)) => email.to_string(),
            (None, None) => String::new(),
        };

        let description_str = description.unwrap_or_else(|| "A Node.js project".to_string());

        let package_json = serde_json::json!({
            "name": name,
            "version": "1.0.0",
            "description": description_str,
            "main": entry_point,
            "scripts": {
                "start": format!("node {}", entry_point),
                "dev": format!("nodemon {}", entry_point)
            },
            "keywords": [],
            "author": author_str,
            "license": license.unwrap_or_else(|| "MIT".to_string()),
            "dependencies": {},
            "devDependencies": {
                "nodemon": "^3.0.0"
            }
        });

        let package_json_path = full_path.join("package.json");
        std::fs::write(
            &package_json_path,
            serde_json::to_string_pretty(&package_json)
                .map_err(|e| format!("Failed to serialize package.json: {}", e))?,
        )
        .map_err(|e| format!("Failed to write package.json: {}", e))?;

        let _ = app.emit(
            "nodejs-output",
            serde_json::json!({
                "runId": run_id,
                "type": "stdout",
                "data": "✓ package.json created"
            }),
        );

        let port_val = port.unwrap_or(3000);
        let host_val = host.as_deref().unwrap_or("localhost");

        let entry_file_path = full_path.join(&entry_point);
        let entry_content = match framework.as_str() {
            "express" => {
                format!(r#"const express = require('express');
const app = express();
const port = process.env.PORT || {port};

app.use(express.json());
app.use(express.urlencoded({{ extended: true }}));

app.get('/', (req, res) => {{
  res.json({{ message: 'Hello from Express.js!' }});
}});

app.listen(port, () => {{
  console.log(`Server running on http://{host}:${{port}}`);
}});
"#, port = port_val, host = host_val)
            }
            "fastify" => {
                format!(r#"const fastify = require('fastify')({{ logger: true }});

fastify.get('/', async (request, reply) => {{
  return {{ message: 'Hello from Fastify!' }};
}});

const start = async () => {{
  try {{
    await fastify.listen({{ port: {port} }});
    console.log('Server running on http://{host}:{port}');
  }} catch (err) {{
    fastify.log.error(err);
    process.exit(1);
  }}
}};

start();
"#, port = port_val, host = host_val)
            }
            "koa" => {
                format!(r#"const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

router.get('/', (ctx) => {{
  ctx.body = {{ message: 'Hello from Koa!' }};
}});

app.use(router.routes());
app.use(router.allowedMethods());

const port = process.env.PORT || {port};
app.listen(port, () => {{
  console.log(`Server running on http://{host}:${{port}}`);
}});
"#, port = port_val, host = host_val)
            }
            _ => {
                r#"console.log('Hello from Node.js!');
"#
                .to_string()
            }
        };

        // Ensure the parent directory of the entry file exists (entry_point may
        // include subdirectories, e.g. "src/index.js" or "hive/index.js").
        if let Some(parent) = entry_file_path.parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create entry file directory: {}", e))?;
            }
        }

        std::fs::write(&entry_file_path, entry_content)
            .map_err(|e| format!("Failed to write entry file: {}", e))?;

        // Save project metadata before dependency installation
        // so the project appears in the list even if install fails
        let hive_dir = hive_projects_dir();
        std::fs::create_dir_all(&hive_dir)
            .map_err(|e| format!("Failed to create Hive projects directory: {}", e))?;

        let uuid = format!("{}-{}", name, Local::now().timestamp());
        let project_info = serde_json::json!({
            "id": uuid,
            "name": name,
            "type": "nodejs",
            "path": full_path.to_string_lossy().to_string(),
            "description": description_str,
            "framework": framework,
            "package_manager": package_manager,
            "entry_point": entry_point,
            "port": port_val,
            "host": host_val,
            "nodeVersion": node_version,
            "status": "stopped",
            "created_at": Local::now().to_rfc3339(),
        });

        let project_file = hive_dir.join(format!("{}.json", name));

        std::fs::write(
            &project_file,
            serde_json::to_string_pretty(&project_info)
                .map_err(|e| format!("Failed to serialize project metadata: {}", e))?,
        )
        .map_err(|e| format!("Failed to save project metadata: {}", e))?;

        let _ = app.emit(
            "nodejs-output",
            serde_json::json!({
                "runId": run_id,
                "type": "stdout",
                "data": format!("✓ {} created", entry_point)
            }),
        );

        if git_init {
            let _ = app.emit(
                "nodejs-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "info",
                    "data": "🔧 Initializing git repository..."
                }),
            );

            let mut git_cmd = Command::new("git");
            git_cmd
                .arg("init")
                .current_dir(&full_path)
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            setup_path(&mut git_cmd);

            let mut git_child = git_cmd
                .spawn()
                .map_err(|e| format!("Failed to run git init: {}", e))?;

            let git_status = git_child
                .wait()
                .map_err(|e| format!("Failed waiting for git init: {}", e))?;

            if git_status.success() {
                let _ = app.emit(
                    "nodejs-output",
                    serde_json::json!({
                        "runId": run_id,
                        "type": "stdout",
                        "data": "✓ Git repository initialized"
                    }),
                );
            } else {
                let _ = app.emit(
                    "nodejs-output",
                    serde_json::json!({
                        "runId": run_id,
                        "type": "stderr",
                        "data": "⚠️ Git init failed"
                    }),
                );
            }
        }

        if install_deps {
            let _ = app.emit(
                "nodejs-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "info",
                    "data": format!("📦 Installing dependencies with {}...", package_manager)
                }),
            );

            let install_cmd = if framework == "express" {
                vec![
                    package_manager.clone(),
                    "install".to_string(),
                    "express".to_string(),
                ]
            } else if framework == "fastify" {
                vec![
                    package_manager.clone(),
                    "install".to_string(),
                    "fastify".to_string(),
                ]
            } else if framework == "koa" {
                vec![
                    package_manager.clone(),
                    "install".to_string(),
                    "koa".to_string(),
                    "koa-router".to_string(),
                ]
            } else {
                vec![package_manager.clone(), "install".to_string()]
            };

            let mut cmd = Command::new(&install_cmd[0]);
            for arg in &install_cmd[1..] {
                cmd.arg(arg);
            }

            cmd.current_dir(&full_path)
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
                "nodejs-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "info",
                    "data": format!("Running: {} {}", package_manager, install_cmd[1..].join(" "))
                }),
            );

            let mut child = cmd
                .spawn()
                .map_err(|e| format!("Failed to start install process: {}", e))?;

            let pid = child.id();
            let _ = app.emit(
                "nodejs-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "started",
                    "pid": pid
                }),
            );

            let stdout = child
                .stdout
                .take()
                .ok_or_else(|| "Failed to capture stdout.")?;
            let stderr = child
                .stderr
                .take()
                .ok_or_else(|| "Failed to capture stderr.")?;

            let error_buffer = Arc::new(Mutex::new(String::new()));

            let stdout_handle = {
                let app = app.clone();
                let run_id = run_id.clone();
                thread::spawn(move || {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines().map_while(Result::ok) {
                        let _ = app.emit(
                            "nodejs-output",
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
                            "nodejs-output",
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
                let err = error_buffer
                    .lock()
                    .map(|e| e.clone())
                    .unwrap_or_else(|_| "Unknown install error.".to_string());

                let message = if err.trim().is_empty() {
                    format!("Dependency installation failed with exit code: {:?}", status.code())
                } else {
                    format!("Dependency installation failed:\n{}", err)
                };

                let _ = app.emit(
                    "nodejs-output",
                    serde_json::json!({
                        "runId": run_id,
                        "type": "error",
                        "data": message.clone()
                    }),
                );

                return Err(message);
            }

            let _ = app.emit(
                "nodejs-output",
                serde_json::json!({
                    "runId": run_id,
                    "type": "stdout",
                    "data": "✓ Dependencies installed successfully"
                }),
            );
        }

        let _ = app.emit(
            "nodejs-output",
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
