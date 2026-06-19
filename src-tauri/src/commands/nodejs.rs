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

#[tauri::command]
pub async fn create_nodejs_project(
    app: AppHandle,
    project_path: String,
    name: String,
    package_manager: String,
    framework: String,
    entry_point: String,
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

        let package_json = serde_json::json!({
            "name": name,
            "version": "1.0.0",
            "description": "A Node.js project",
            "main": entry_point,
            "scripts": {
                "start": format!("node {}", entry_point),
                "dev": format!("nodemon {}", entry_point)
            },
            "keywords": [],
            "author": "",
            "license": "MIT",
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

        let entry_file_path = full_path.join(&entry_point);
        let entry_content = match framework.as_str() {
            "express" => {
                r#"const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express.js!' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
"#
            }
            "fastify" => {
                r#"const fastify = require('fastify')({ logger: true });

fastify.get('/', async (request, reply) => {
  return { message: 'Hello from Fastify!' };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Server running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
"#
            }
            "koa" => {
                r#"const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

router.get('/', (ctx) => {
  ctx.body = { message: 'Hello from Koa!' };
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
"#
            }
            _ => {
                r#"console.log('Hello from Node.js!');
"#
            }
        };

        std::fs::write(&entry_file_path, entry_content)
            .map_err(|e| format!("Failed to write entry file: {}", e))?;

        let _ = app.emit(
            "nodejs-output",
            serde_json::json!({
                "runId": run_id,
                "type": "stdout",
                "data": format!("✓ {} created", entry_point)
            }),
        );

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
                thread::spawn(move || {
                    let reader = BufReader::new(stderr);
                    for line in reader.lines().map_while(Result::ok) {
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
                return Err(format!(
                    "Dependency installation failed with exit code: {:?}",
                    status.code()
                ));
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

        let hive_dir = hive_projects_dir();
        std::fs::create_dir_all(&hive_dir)
            .map_err(|e| format!("Failed to create Hive projects directory: {}", e))?;

        let uuid = format!("{}-{}", name, chrono::Local::now().timestamp());
        let project_info = serde_json::json!({
            "id": uuid,
            "name": name,
            "type": "nodejs",
            "path": full_path.to_string_lossy().to_string(),
            "framework": framework,
            "package_manager": package_manager,
            "entry_point": entry_point,
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