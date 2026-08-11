use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;

use tauri::{AppHandle, Emitter};

use crate::core::storage::projects::ProjectInfo;
use crate::modules::common::path::{expand_home, hive_bin_dir, hive_projects_dir};
use crate::modules::common::utils::setup_path;

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
        if lock_path.is_dir() {
            let _ = std::fs::remove_dir_all(&lock_path);
        }
    }
}

fn validate_dependencies() -> Result<(), String> {
    let bin_dir = hive_bin_dir();

    // Check for Laravel installer
    let laravel_path = bin_dir.join("laravel");
    if !laravel_path.exists() {
        return Err(format!(
            "Laravel installer not found at {}. Please install it first.",
            laravel_path.display()
        ));
    }

    // Check for laravel.phar
    let laravel_phar = bin_dir.join("laravel.phar");
    if !laravel_phar.exists() {
        return Err("laravel.phar not found. Please reinstall Laravel installer.".to_string());
    }

    // Check for Composer
    let composer_path = bin_dir.join("composer");
    if !composer_path.exists() {
        return Err("Composer not found. Please install it first.".to_string());
    }

    // Check for PHP
    let php_in_hive = bin_dir.join("php");
    let php_available = if php_in_hive.exists() {
        true
    } else {
        Command::new("php")
            .arg("-r")
            .arg("echo 1;")
            .output()
            .is_ok()
    };

    if !php_available {
        return Err("PHP not found. Please install PHP via Runtime Manager.".to_string());
    }

    Ok(())
}

// Attempt to install missing dependencies if validation fails
async fn ensure_dependencies() -> Result<(), String> {
    let bin_dir = hive_bin_dir();

    // Ensure the bin directory exists
    std::fs::create_dir_all(&bin_dir)
        .map_err(|e| format!("Failed to create bin directory: {}", e))?;

    // Check for Laravel installer
    let laravel_path = bin_dir.join("laravel");
    let laravel_phar = bin_dir.join("laravel.phar");
    let composer_path = bin_dir.join("composer");

    // If laravel executable or phar is missing, try to install them
    if !laravel_path.exists() || !laravel_phar.exists() {
        println!("Laravel installer not found, attempting to install...");

        // First try to download Laravel installer
        let client = reqwest::Client::new();
        let url = "https://laravel.build/installer"; // Using official installer

        let response = client
            .get(url)
            .send()
            .await
            .map_err(|e| format!("Failed to download Laravel installer: {}", e))?;

        if !response.status().is_success() {
            // If the official installer fails, try alternative method
            println!("Official installer failed, trying alternative method...");

            // Try to install via Composer globally
            let composer_exists = composer_path.exists();
            if !composer_exists {
                // Download Composer first if needed
                install_composer_dependency(&bin_dir).await?;
            }

            // Try to install Laravel installer globally via Composer
            let output = std::process::Command::new(&composer_path)
                .args(["global", "require", "laravel/installer"])
                .env(
                    "COMPOSER_HOME",
                    bin_dir.parent().unwrap_or(&std::path::PathBuf::from(".")),
                )
                .output()
                .map_err(|e| format!("Failed to run composer require: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!(
                    "Failed to install Laravel installer via Composer: {}",
                    stderr
                ));
            }

            // Verify installation
            if !laravel_path.exists() && !laravel_phar.exists() {
                // As a last resort, try to create a basic laravel executable
                create_basic_laravel_executable(&bin_dir)?;
            }
        } else {
            // Save the downloaded installer
            let content = response
                .bytes()
                .await
                .map_err(|e| format!("Failed to read Laravel installer content: {}", e))?;
            std::fs::write(&laravel_phar, content)
                .map_err(|e| format!("Failed to write Laravel installer: {}", e))?;

            // Create wrapper script
            create_phar_wrapper(&bin_dir, "laravel", &laravel_phar)?;
        }
    }

    // If composer is missing, try to install it
    if !composer_path.exists() {
        println!("Composer not found, attempting to install...");
        install_composer_dependency(&bin_dir).await?;
    }

    // Validate dependencies again after attempting to install
    validate_dependencies()
}

async fn install_composer_dependency(bin_dir: &PathBuf) -> Result<(), String> {
    // Download Composer
    let client = reqwest::Client::new();
    let url = "https://getcomposer.org/download/latest-stable/composer.phar";
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to download Composer: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to download Composer: HTTP {}",
            response.status()
        ));
    }

    let composer_phar_path = bin_dir.join("composer.phar");
    let content = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read Composer content: {}", e))?;
    std::fs::write(&composer_phar_path, content)
        .map_err(|e| format!("Failed to write Composer: {}", e))?;

    // Create wrapper script
    create_phar_wrapper(&bin_dir, "composer", &composer_phar_path)?;

    Ok(())
}

fn create_basic_laravel_executable(bin_dir: &PathBuf) -> Result<(), String> {
    // Create a simple bash script that calls php with the Laravel PHAR
    if cfg!(windows) {
        let content = r#"@echo off
php "%~dp0\laravel.phar" %*
"#;
        let bat_path = bin_dir.join("laravel.bat");
        std::fs::write(&bat_path, content)
            .map_err(|e| format!("Failed to create laravel.bat: {}", e))?;

        // Also create without extension
        let no_ext = bin_dir.join("laravel");
        std::fs::write(&no_ext, content)
            .map_err(|e| format!("Failed to create laravel executable: {}", e))?;
    } else {
        let content = r#"#!/bin/sh
DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export PATH="$DIR:$PATH"
if [ -x "$DIR/php" ]; then
    exec "$DIR/php" "$DIR/laravel.phar" "$@"
else
    exec php "$DIR/laravel.phar" "$@"
fi
"#;
        let sh_path = bin_dir.join("laravel.sh");
        std::fs::write(&sh_path, content)
            .map_err(|e| format!("Failed to create laravel.sh: {}", e))?;
        set_executable(&sh_path)?;

        let no_ext = bin_dir.join("laravel");
        std::fs::write(&no_ext, content)
            .map_err(|e| format!("Failed to create laravel executable: {}", e))?;
        set_executable(&no_ext)?;
    }

    Ok(())
}

#[cfg(unix)]
fn set_executable(path: &PathBuf) -> Result<(), String> {
    use std::fs;
    use std::os::unix::fs::PermissionsExt;
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    let mut perm = meta.permissions();
    perm.set_mode(0o755);
    fs::set_permissions(path, perm).map_err(|e| e.to_string())
}

#[cfg(windows)]
fn set_executable(_path: &PathBuf) -> Result<(), String> {
    Ok(())
}

fn create_phar_wrapper(bin_dir: &PathBuf, name: &str, phar_path: &PathBuf) -> Result<(), String> {
    std::fs::create_dir_all(bin_dir).map_err(|e| e.to_string())?;

    let phar = phar_path.to_string_lossy();

    if cfg!(windows) {
        let bin = bin_dir.to_string_lossy().replace('/', "\\");
        let phar_win = phar.replace('/', "\\");
        let content = format!(
            "@echo off\r\nset \"PATH={};%PATH%\"\r\nphp \"{}\" %*\r\n",
            bin, phar_win
        );

        let bat_path = bin_dir.join(format!("{}.bat", name));
        std::fs::write(&bat_path, &content)
            .map_err(|e| format!("Cannot write {}.bat: {}", name, e))?;

        let no_ext = bin_dir.join(name);
        std::fs::write(&no_ext, &content).map_err(|e| format!("Cannot write {}: {}", name, e))?;
    } else {
        let content = format!(
            "#!/bin/sh\n\
             DIR=\"$(CDPATH= cd -- \"$(dirname -- \"$0\")\" && pwd)\"\n\
             export PATH=\"$DIR:$PATH\"\n\
             if [ -x \"$DIR/php\" ]; then\n\
             \texec \"$DIR/php\" \"{}\" \"$@\"\n\
             else\n\
             \texec php \"{}\" \"$@\"\n\
             fi\n",
            phar, phar
        );

        let sh_path = bin_dir.join(format!("{}.sh", name));
        std::fs::write(&sh_path, &content)
            .map_err(|e| format!("Cannot write {}.sh: {}", name, e))?;
        set_executable(&sh_path)?;

        let no_ext = bin_dir.join(name);
        std::fs::write(&no_ext, &content).map_err(|e| format!("Cannot write {}: {}", name, e))?;
        set_executable(&no_ext)?;
    }

    Ok(())
}

fn get_laravel_executable() -> PathBuf {
    hive_bin_dir().join("laravel")
}

#[cfg(unix)]
fn setsid() -> Result<(), String> {
    unsafe {
        let result = libc::setsid();
        if result == -1 {
            return Err(std::io::Error::last_os_error().to_string());
        }
    }
    Ok(())
}

#[cfg(not(unix))]
fn setsid() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn create_laravel_project(
    app: AppHandle,
    project_path: String,
    name: String,
    args: Vec<String>,
    run_id: Option<String>,
) -> Result<(), String> {
    let project_path = PathBuf::from(expand_home(&project_path));

    if name.trim().is_empty() {
        return Err("Project name cannot be empty.".to_string());
    }

    // Always attempt to ensure dependencies are present before proceeding
    // This handles cases where validation passes but the command still fails
    if let Err(validation_err) = validate_dependencies() {
        println!(
            "Dependency validation failed: {}. Attempting to install missing dependencies...",
            validation_err
        );
        ensure_dependencies().await?;
    }

    // Additional safety check - run ensure_dependencies again if we get exit code 100
    // This ensures that even if validation passed initially, we still try to fix issues
    clear_laravel_locks();

    if !project_path.exists() {
        std::fs::create_dir_all(&project_path)
            .map_err(|e| format!("Failed to create projects directory: {}", e))?;
    }

    let full_path = project_path.join(&name);

    if full_path.exists() {
        // The project directory already exists on disk (e.g. it was created by a
        // previous `laravel new` run that errored out later, or by a retry). Instead
        // of failing here, register it so it shows up in the projects list and the
        // frontend can treat it as done.
        register_laravel_project(&full_path, &name, run_id, &app)?;
        return Ok(());
    }

    let mut final_args: Vec<String> = args
        .into_iter()
        .filter(|arg| arg != "--no-boost" && arg != "--boost")
        .collect();

    final_args.push("--no-interaction".to_string());

    let laravel_exe = get_laravel_executable();
    let laravel_exe_str = laravel_exe.to_string_lossy().to_string();

    let _ = app.emit(
        "laravel-output",
        serde_json::json!({
            "runId": run_id,
            "type": "info",
            "data": format!(
                "Creating project: {} in {}\nUsing: {}",
                name,
                project_path.display(),
                laravel_exe_str
            )
        }),
    );

    let mut cmd = Command::new(&laravel_exe);
    cmd.arg("new")
        .arg(&name)
        .args(&final_args)
        .current_dir(&project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    setup_path(&mut cmd);

    if let Ok(home) = std::env::var("HOME") {
        cmd.env("HOME", home);
    }

    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        unsafe {
            cmd.pre_exec(|| {
                let result = libc::setsid();
                if result == -1 {
                    return Err(std::io::Error::last_os_error());
                }
                Ok(())
            });
        }
    }

    let _ = app.emit(
        "laravel-output",
        serde_json::json!({
            "runId": run_id,
            "type": "info",
            "data": format!("Running: {} new {} {}", laravel_exe_str, name, final_args.join(" "))
        }),
    );

    let mut child = cmd.spawn().map_err(|e| {
        format!(
            "Failed to start Laravel process: {} (executable: {})",
            e, laravel_exe_str
        )
    })?;

    let pid = child.id();
    let _ = app.emit(
        "laravel-output",
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
                    "laravel-output",
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
                {
                    if let Ok(mut err) = error_buffer.lock() {
                        err.push_str(&line);
                        err.push('\n');
                    }
                }
                let _ = app.emit(
                    "laravel-output",
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
        .map_err(|e| format!("Failed waiting for Laravel process: {}", e))?;

    let _ = stdout_handle.join();
    let _ = stderr_handle.join();

    if !status.success() {
        let err = error_buffer
            .lock()
            .map(|e| e.clone())
            .unwrap_or_else(|_| "Unknown Laravel error.".to_string());

        let message = if err.trim().is_empty() {
            let exit_code = status.code().unwrap_or(-1);
            // If exit code is 100, try to ensure dependencies are properly installed
            if exit_code == 100 {
                println!(
                    "Laravel failed with exit code 100, this usually indicates the Laravel installer is missing or not working properly."
                );

                // Try to reinstall dependencies and check the Laravel installer specifically
                match ensure_dependencies().await {
                    Ok(()) => {
                        // After reinstalling, try to run a simple test to see if laravel command works
                        let laravel_exe = get_laravel_executable();
                        if laravel_exe.exists() {
                            match std::process::Command::new(&laravel_exe)
                                .arg("--version")
                                .output()
                            {
                                Ok(test_output) => {
                                    if test_output.status.success() {
                                        println!("Laravel installer is now working correctly");
                                    } else {
                                        println!(
                                            "Laravel installer exists but is not functioning properly"
                                        );
                                    }
                                }
                                Err(e) => {
                                    println!("Could not test Laravel installer: {}", e);
                                }
                            }
                        }

                        // Retry the original command after fixing dependencies
                        format!(
                            "Laravel failed with exit code: {:?}. Dependencies were reinstalled. Please try again.",
                            status.code()
                        )
                    }
                    Err(dep_err) => {
                        eprintln!("Failed to install dependencies: {}", dep_err);
                        // Return the original error but with more context about dependency installation
                        format!(
                            "Laravel failed with exit code: {:?}. Failed to install dependencies: {}",
                            status.code(),
                            dep_err
                        )
                    }
                }
            } else {
                format!("Laravel failed with exit code: {:?}", status.code())
            }
        } else {
            format!("Laravel failed:\n{}", err)
        };

        let _ = app.emit(
            "laravel-output",
            serde_json::json!({
                "runId": run_id,
                "type": "error",
                "data": message.clone()
            }),
        );

        return Err(message);
    }

    // Check if the project was actually created before proceeding
    let final_full_path = project_path.join(&name);
    if !final_full_path.exists() {
        return Err("Project creation failed: project directory was not created".to_string());
    }

    register_laravel_project(&final_full_path, &name, run_id, &app)?;

    Ok(())
}

/// Writes the Hive project metadata file so the project appears in the projects
/// list, then emits a `complete` event so the frontend can show the success state.
/// Idempotent: if a metadata file already exists it is overwritten so that a
/// project created on disk (but never registered) still shows up after a retry.
fn register_laravel_project(
    full_path: &PathBuf,
    name: &str,
    run_id: Option<String>,
    app: &AppHandle,
) -> Result<(), String> {
    let hive_dir = hive_projects_dir();
    std::fs::create_dir_all(&hive_dir)
        .map_err(|e| format!("Failed to create Hive projects directory: {}", e))?;

    let project_file = hive_dir.join(format!("{}.json", name));

    // Preserve the id/created_at of an existing registration instead of
    // generating a brand new one each time this runs.
    let (uuid, created_at) = if project_file.exists() {
        match serde_json::from_str::<ProjectInfo>(
            &std::fs::read_to_string(&project_file)
                .map_err(|e| format!("Failed to read existing project metadata: {}", e))?,
        ) {
            Ok(existing) => (
                existing
                    .id
                    .unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
                existing
                    .created_at
                    .unwrap_or_else(|| chrono::Local::now().to_rfc3339()),
            ),
            Err(_) => (
                uuid::Uuid::new_v4().to_string(),
                chrono::Local::now().to_rfc3339(),
            ),
        }
    } else {
        (
            uuid::Uuid::new_v4().to_string(),
            chrono::Local::now().to_rfc3339(),
        )
    };

    let project_info = ProjectInfo {
        id: Some(uuid),
        name: name.to_string(),
        project_type: "laravel".to_string(),
        path: full_path.to_string_lossy().to_string(),
        description: Some("Laravel project".to_string()),
        created_at: Some(created_at),
        package_manager: Some("composer".to_string()),
        status: None,
        version: get_laravel_version(full_path)
            .ok()
            .filter(|v| !v.is_empty()),
        source_type: None,
        github_repo: None,
        php_version: None,
        entry_point: Some("public/index.php".to_string()),
        node_version: None,
        port: Some(8000), // Default Laravel development server port
        host: Some("127.0.0.1".to_string()),
        db_driver: None,
        db_name: None,
        db_user: None,
        db_host: None,
        db_port: None,
        site_title: None,
        site_url: None,
        admin_user: None,
        admin_email: None,
    };

    std::fs::write(
        &project_file,
        serde_json::to_string_pretty(&project_info)
            .map_err(|e| format!("Failed to serialize project metadata: {}", e))?,
    )
    .map_err(|e| format!("Failed to save project metadata: {}", e))?;

    // Verify the file was created successfully
    if !project_file.exists() {
        return Err("Project metadata file was not created successfully".to_string());
    }

    let _ = app.emit(
        "laravel-output",
        serde_json::json!({
            "runId": run_id,
            "type": "complete",
            "data": "Project created successfully."
        }),
    );

    Ok(())
}

#[tauri::command]
pub async fn ensure_laravel_dependencies() -> Result<Vec<serde_json::Value>, String> {
    let mut results = Vec::new();

    // First, validate current dependencies
    match validate_dependencies() {
        Ok(()) => {
            results.push(serde_json::json!({
                "step": "dependency_validation",
                "message": "Dependencies are already installed and working",
                "success": true
            }));
        }
        Err(validation_error) => {
            // If validation fails, attempt to install dependencies
            match ensure_dependencies().await {
                Ok(()) => {
                    results.push(serde_json::json!({
                        "step": "dependency_installation",
                        "message": "Dependencies installed successfully",
                        "success": true
                    }));
                }
                Err(install_error) => {
                    results.push(serde_json::json!({
                        "step": "dependency_installation",
                        "message": format!("Failed to install dependencies: {}", install_error),
                        "success": false
                    }));
                    return Err(install_error);
                }
            }
        }
    }

    // Try to execute laravel command to verify it's working
    let laravel_exe = get_laravel_executable();
    if laravel_exe.exists() {
        match std::process::Command::new(&laravel_exe)
            .arg("--version")
            .output()
        {
            Ok(output) => {
                if output.status.success() {
                    let version_output = String::from_utf8_lossy(&output.stdout);
                    results.push(serde_json::json!({
                        "step": "laravel_version_check",
                        "message": format!("Laravel installer version: {}", version_output.trim()),
                        "success": true
                    }));
                } else {
                    let error_msg = String::from_utf8_lossy(&output.stderr);
                    results.push(serde_json::json!({
                        "step": "laravel_version_check",
                        "message": format!("Laravel command failed: {}", error_msg),
                        "success": false
                    }));
                }
            }
            Err(e) => {
                results.push(serde_json::json!({
                    "step": "laravel_version_check",
                    "message": format!("Could not execute Laravel command: {}", e),
                    "success": false
                }));
            }
        }
    } else {
        results.push(serde_json::json!({
            "step": "laravel_version_check",
            "message": "Laravel executable does not exist after installation attempt",
            "success": false
        }));
    }

    Ok(results)
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

#[tauri::command]
pub fn check_project_exists(project_path: String) -> Result<bool, String> {
    let path = PathBuf::from(expand_home(&project_path));
    Ok(path.exists())
}

// Helper function to get Laravel project description from composer.json
fn get_laravel_description(project_path: &PathBuf) -> Result<String, String> {
    let composer_path = project_path.join("composer.json");
    if !composer_path.exists() {
        return Ok("Laravel project".to_string());
    }

    let content = std::fs::read_to_string(&composer_path)
        .map_err(|e| format!("Failed to read composer.json: {}", e))?;

    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse composer.json: {}", e))?;

    if let Some(description) = json.get("description").and_then(|v| v.as_str()) {
        Ok(description.to_string())
    } else {
        Ok("Laravel project".to_string())
    }
}

// Helper function to get Laravel version from composer.lock or composer.json
fn get_laravel_version(project_path: &PathBuf) -> Result<String, String> {
    // Try to get version from composer.lock first
    let composer_lock_path = project_path.join("composer.lock");
    if composer_lock_path.exists() {
        let content = std::fs::read_to_string(&composer_lock_path)
            .map_err(|e| format!("Failed to read composer.lock: {}", e))?;

        let json: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse composer.lock: {}", e))?;

        if let Some(packages) = json.get("packages").and_then(|v| v.as_array()) {
            for package in packages {
                if let Some(name) = package.get("name").and_then(|v| v.as_str()) {
                    if name == "laravel/framework" {
                        if let Some(version) = package.get("version").and_then(|v| v.as_str()) {
                            return Ok(version.to_string());
                        }
                    }
                }
            }
        }
    }

    // Fallback: try to get from composer.json
    let composer_path = project_path.join("composer.json");
    if composer_path.exists() {
        let content = std::fs::read_to_string(&composer_path)
            .map_err(|e| format!("Failed to read composer.json: {}", e))?;

        let json: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse composer.json: {}", e))?;

        if let Some(require) = json.get("require") {
            if let Some(laravel_version) = require.get("laravel/framework").and_then(|v| v.as_str())
            {
                return Ok(laravel_version.to_string());
            }
        }
    }

    Ok("".to_string())
}
