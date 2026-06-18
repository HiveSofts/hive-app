use std::io::{BufRead, BufReader};
use std::path::{ PathBuf};
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

/// FIX: PATH را روی command اعمال می‌کند تا subprocess بتواند laravel، composer و php را پیدا کند
fn setup_path(cmd: &mut Command) {
    let hive_bin = hive_bin_dir();
    let current_path = std::env::var("PATH").unwrap_or_default();
    let new_path = format!("{}:{}", hive_bin.to_string_lossy(), current_path);
    cmd.env("PATH", new_path);
}

/// FIX: lock file های قبلی Laravel installer را پاک می‌کند تا "Another installation in progress" نگیریم
fn clear_laravel_locks() {
    let home = std::env::var("HOME").unwrap_or_default();

    let lock_locations = [
        format!("{}/.config/laravel/installer/lock", home),
        format!("{}/.laravel/installer/lock", home),
        "/tmp/laravel-installer.lock".to_string(),
    ];

    for lock in &lock_locations {
        let lock_path = PathBuf::from(lock);
        if lock_path.exists() {
            let _ = std::fs::remove_file(&lock_path);
        }
        // اگر directory است
        if lock_path.is_dir() {
            let _ = std::fs::remove_dir_all(&lock_path);
        }
    }
}

/// FIX: قبل از اجرا وابستگی‌ها را چک می‌کند و خطای شفاف می‌دهد
fn validate_dependencies() -> Result<(), String> {
    let bin_dir = hive_bin_dir();

    // چک laravel
    let laravel_path = bin_dir.join("laravel");
    if !laravel_path.exists() {
        return Err(format!(
            "Laravel installer not found at {}. Please install it first via Runtime Manager.",
            laravel_path.display()
        ));
    }

    // چک executable bit
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = std::fs::metadata(&laravel_path) {
            let mode = meta.permissions().mode();
            if mode & 0o111 == 0 {
                return Err(format!(
                    "Laravel wrapper at {} is not executable. Run: chmod +x {}",
                    laravel_path.display(),
                    laravel_path.display()
                ));
            }
        }
    }

    // چک laravel.phar
    let laravel_phar = bin_dir.join("laravel.phar");
    if !laravel_phar.exists() {
        return Err(format!(
            "laravel.phar not found at {}. Please reinstall Laravel installer.",
            laravel_phar.display()
        ));
    }

    // چک composer
    let composer_path = bin_dir.join("composer");
    if !composer_path.exists() {
        return Err(format!(
            "Composer not found at {}. Please install it first via Runtime Manager.",
            composer_path.display()
        ));
    }

    // چک php (hive یا system)
    let php_in_hive = bin_dir.join("php");
    let php_available = if php_in_hive.exists() {
        true
    } else {
        // چک system php
        Command::new("php").arg("-r").arg("echo 1;").output().is_ok()
    };

    if !php_available {
        return Err(
            "PHP not found. Please install PHP via Runtime Manager or ensure system PHP is available."
                .to_string(),
        );
    }

    Ok(())
}

/// FIX: مستقیم با path کامل laravel را اجرا می‌کند، نه فقط نام
fn get_laravel_executable() -> PathBuf {
    hive_bin_dir().join("laravel")
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

    // FIX: اول همه dependency ها را چک می‌کنیم
    validate_dependencies()?;

    // FIX: lock file های قبلی را پاک می‌کنیم
    clear_laravel_locks();

    if !project_path.exists() {
        std::fs::create_dir_all(&project_path)
            .map_err(|e| format!("Failed to create projects directory: {}", e))?;
    }

    let full_path = project_path.join(&name);

    if full_path.exists() {
        return Err(format!("Project already exists: {}", full_path.display()));
    }

    // FIX: آرگومان‌های اضافه را فیلتر می‌کنیم
    let final_args: Vec<String> = args
        .into_iter()
        .filter(|arg| arg != "--no-boost" && arg != "--boost")
        .collect();

    // FIX: path کامل executable را می‌گیریم
    let laravel_exe = get_laravel_executable();
    let laravel_exe_str = laravel_exe.to_string_lossy().to_string();

    let _ = app.emit(
        "laravel-output",
        serde_json::json!({
            "type": "info",
            "data": format!(
                "Creating project: {} in {}\nUsing: {}",
                name,
                project_path.display(),
                laravel_exe_str
            )
        }),
    );

    // FIX: Command با path کامل ساخته می‌شود
    let mut cmd = Command::new(&laravel_exe);
    cmd.arg("new")
        .arg(&name)
        .args(&final_args)
        .current_dir(&project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    // FIX: PATH را روی همین command اعمال می‌کنیم
    setup_path(&mut cmd);

    // FIX: HOME را هم set می‌کنیم در صورتی که Tauri آن را inherit نکرده باشد
    if let Ok(home) = std::env::var("HOME") {
        cmd.env("HOME", home);
    }

    let _ = app.emit(
        "laravel-output",
        serde_json::json!({
            "type": "info",
            "data": format!("Running: {} new {}", laravel_exe_str, name)
        }),
    );

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start Laravel process: {} (executable: {})", e, laravel_exe_str))?;

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
            return Err(format!("Laravel failed with exit code: {:?}", status.code()));
        }
        return Err(format!("Laravel failed:\n{}", err));
    }

    // ذخیره metadata پروژه
    let hive_dir = hive_projects_dir();
    std::fs::create_dir_all(&hive_dir)
        .map_err(|e| format!("Failed to create Hive projects directory: {}", e))?;

    let project_info = serde_json::json!({
        "name": name,
        "type": "laravel",
        "path": full_path.to_string_lossy().to_string(),
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