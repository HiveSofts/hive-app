use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
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

fn hive_projects_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".hive").join("projects")
}

fn detect_laravel_command() -> Result<(String, Vec<String>), String> {
    let home = std::env::var("HOME").unwrap_or_default();

    let paths = vec![
        format!("{}/.config/composer/vendor/bin/laravel", home),
        format!("{}/.composer/vendor/bin/laravel", home),
        "/usr/local/bin/laravel".to_string(),
    ];

    for path in paths {
        if Path::new(&path).exists() {
            return Ok((path, vec!["new".to_string()]));
        }
    }

    if Command::new("laravel").arg("--version").output().is_ok() {
        return Ok(("laravel".to_string(), vec!["new".to_string()]));
    }

    if Command::new("composer").arg("--version").output().is_ok() {
        return Ok((
            "composer".to_string(),
            vec![
                "create-project".to_string(),
                "laravel/laravel".to_string(),
            ],
        ));
    }

    Err(
        "Laravel CLI or Composer not found. Please install Laravel CLI or Composer."
            .to_string(),
    )
}

#[tauri::command]
pub async fn create_laravel_project(
    app: AppHandle,
    project_path: String,
    name: String,
    args: Vec<String>,
) -> Result<(), String> {
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
        return Err(format!(
            "Project already exists: {}",
            full_path.display()
        ));
    }

    let (binary, mut command_args) = detect_laravel_command()?;

    command_args.push(name.clone());
    command_args.extend(args.clone());

    let _ = app.emit(
        "laravel-output",
        serde_json::json!({
            "type": "info",
            "data": format!("Using command: {} {}", binary, command_args.join(" "))
        }),
    );

    let mut cmd = Command::new(&binary);

    cmd.args(&command_args)
        .current_dir(&project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start Laravel process: {}", e))?;

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

        thread::spawn(move || {
            let reader = BufReader::new(stdout);

            for line in reader.lines().map_while(Result::ok) {
                let _ = app.emit(
                    "laravel-output",
                    serde_json::json!({
                        "type": "stdout",
                        "data": line
                    }),
                );
            }
        })
    };

    let stderr_handle = {
        let app = app.clone();
        let error_buffer = error_buffer.clone();

        thread::spawn(move || {
            let reader = BufReader::new(stderr);

            for line in reader.lines().map_while(Result::ok) {
                {
                    if let Ok(mut err) = error_buffer.lock() {
                        err.push_str(&line);
                        err.push('\n');
                    }
                }

                let _ = app.emit(
                    "laravel-output",
                    serde_json::json!({
                        "type": "stderr",
                        "data": line
                    }),
                );
            }
        })
    };

    let status = child
        .wait()
        .map_err(|e| format!("Failed waiting for Laravel process: {}", e))?;

    let _ = stdout_handle.join();
    let _ = stderr_handle.join();

    if !status.success() {
        let err = error_buffer
            .lock()
            .map(|e| e.clone())
            .unwrap_or_else(|_| "Unknown Laravel error.".to_string());

        if err.trim().is_empty() {
            return Err(format!(
                "Laravel failed with exit code: {:?}",
                status.code()
            ));
        }

        return Err(format!("Laravel failed:\n{}", err));
    }

    let hive_dir = hive_projects_dir();

    std::fs::create_dir_all(&hive_dir)
        .map_err(|e| format!("Failed to create Hive projects directory: {}", e))?;

    let project_info = serde_json::json!({
        "name": name,
        "type": "laravel",
        "path": full_path.to_string_lossy().to_string(),
        "created_at": chrono::Local::now().to_rfc3339(),
        "command": format!("{} {}", binary, command_args.join(" ")),
    });

    let project_file = hive_dir.join(format!("{}.json", name));

    std::fs::write(
        &project_file,
        serde_json::to_string_pretty(&project_info)
            .map_err(|e| format!("Failed to serialize project metadata: {}", e))?,
    )
    .map_err(|e| format!("Failed to save project metadata: {}", e))?;

    let _ = app.emit(
        "laravel-output",
        serde_json::json!({
            "type": "complete",
            "data": "Project created successfully."
        }),
    );

    Ok(())
}

#[tauri::command]
pub fn get_existing_projects() -> Result<Vec<String>, String> {
    let hive_dir = hive_projects_dir();

    if !hive_dir.exists() {
        return Ok(vec![]);
    }

    let entries = std::fs::read_dir(&hive_dir)
        .map_err(|e| format!("Failed to read Hive projects directory: {}", e))?;

    let mut projects = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();

        if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
            continue;
        }

        if let Some(name) = path.file_stem().and_then(|name| name.to_str()) {
            projects.push(name.to_string());
        }
    }

    projects.sort();

    Ok(projects)
}
