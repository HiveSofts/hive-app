use crate::core::database::{Event, EventCategory};
use crate::core::system::os::{get_hive_base_path, get_hive_bin_path, get_runtimes_path};
use std::{fs, path::PathBuf};
use tauri::AppHandle;

#[derive(Debug, serde::Serialize, Clone)]
pub struct InstallStatus {
    pub step: String,
    pub message: String,
    pub progress: Option<f32>,
    pub success: bool,
}

#[cfg(unix)]
fn set_executable(path: &PathBuf) -> Result<(), String> {
    use std::{fs, os::unix::fs::PermissionsExt};
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    let mut perm = meta.permissions();
    perm.set_mode(0o755);
    fs::set_permissions(path, perm).map_err(|e| e.to_string())
}

#[cfg(windows)]
fn set_executable(_path: &PathBuf) -> Result<(), String> {
    Ok(())
}

fn create_phar_wrappers(bin_dir: &PathBuf, name: &str, phar_path: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(bin_dir).map_err(|e| e.to_string())?;

    let phar = phar_path.to_string_lossy();

    if cfg!(windows) {
        let bin = bin_dir.to_string_lossy().replace('/', "\\");
        let phar_win = phar.replace('/', "\\");
        let content = format!(
            "@echo off\r\nset \"PATH={};%PATH%\"\r\nphp \"{}\" %*\r\n",
            bin, phar_win
        );

        let bat_path = bin_dir.join(format!("{}.bat", name));
        fs::write(&bat_path, &content).map_err(|e| format!("Cannot write {}.bat: {}", name, e))?;

        let no_ext = bin_dir.join(name);
        fs::write(&no_ext, &content).map_err(|e| format!("Cannot write {}: {}", name, e))?;
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
        fs::write(&sh_path, &content).map_err(|e| format!("Cannot write {}.sh: {}", name, e))?;
        set_executable(&sh_path)?;

        let no_ext = bin_dir.join(name);
        fs::write(&no_ext, &content).map_err(|e| format!("Cannot write {}: {}", name, e))?;
        set_executable(&no_ext)?;
    }

    Ok(())
}

async fn download_file(url: &str, output_path: &PathBuf) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to download {}: {}", url, e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {} for URL: {}", response.status(), url));
    }

    let content = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if content.len() < 100 {
        return Err(format!(
            "Downloaded file too small ({} bytes)",
            content.len()
        ));
    }

    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(output_path, content).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn check_and_install_dependencies(_app: AppHandle) -> Result<Vec<InstallStatus>, String> {
    let _ = Event::info(
        EventCategory::System,
        "dependencies.check.start",
        "Checking Dependencies",
        "Starting dependency check and installation",
    );

    let mut statuses = Vec::new();
    let bin_path = get_hive_bin_path();
    let base_path = get_hive_base_path();
    let runtimes_path = get_runtimes_path();

    for dir in [&base_path, &bin_path, &runtimes_path] {
        if !dir.exists() {
            fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        }
    }

    let dependencies = vec![
        (
            "composer",
            "https://raw.githubusercontent.com/HiveSofts/hive-runtimes/main/composer/composer.phar",
        ),
        (
            "laravel",
            "https://raw.githubusercontent.com/HiveSofts/hive-runtimes/main/laravel/laravel.phar",
        ),
    ];

    for (name, url) in dependencies {
        let phar_path = bin_path.join(format!("{}.phar", name));
        let no_ext_path = bin_path.join(name);
        let sh_path = bin_path.join(format!("{}.sh", name));

        let already_installed = phar_path.exists() && no_ext_path.exists() && sh_path.exists();

        if already_installed {
            statuses.push(InstallStatus {
                step: format!("check_{}", name),
                message: format!("{} already installed", name),
                progress: Some(100.0),
                success: true,
            });

            let _ = Event::info(
                EventCategory::Runtime,
                &format!("{}.already_installed", name),
                &format!("{} Already Installed", name),
                &format!("{} is already installed and ready to use", name),
            );

            continue;
        }

        statuses.push(InstallStatus {
            step: format!("download_{}", name),
            message: format!("Downloading {}...", name),
            progress: Some(0.0),
            success: true,
        });

        let _ = Event::info(
            EventCategory::Runtime,
            &format!("{}.downloading", name),
            &format!("Downloading {}", name),
            &format!("Downloading {} from {}", name, url),
        );

        match download_file(url, &phar_path).await {
            Ok(_) => {
                set_executable(&phar_path).ok();

                match create_phar_wrappers(&bin_path, name, &phar_path) {
                    Ok(_) => {
                        statuses.push(InstallStatus {
                            step: format!("complete_{}", name),
                            message: format!("{} installed successfully", name),
                            progress: Some(100.0),
                            success: true,
                        });

                        let _ = Event::success(
                            EventCategory::Runtime,
                            &format!("{}.installed", name),
                            &format!("{} Installed", name),
                            &format!("{} version installed successfully", name),
                        );
                    }
                    Err(e) => {
                        statuses.push(InstallStatus {
                            step: format!("wrapper_{}", name),
                            message: format!("Failed to create wrappers for {}: {}", name, e),
                            progress: Some(50.0),
                            success: false,
                        });

                        let _ = Event::error(
                            EventCategory::Runtime,
                            &format!("{}.wrapper.failed", name),
                            &format!("{} Wrapper Creation Failed", name),
                            &format!("Failed to create wrappers for {}: {}", name, e),
                        );
                    }
                }
            }
            Err(e) => {
                statuses.push(InstallStatus {
                    step: format!("failed_{}", name),
                    message: format!("Failed to download {}: {}", name, e),
                    progress: Some(0.0),
                    success: false,
                });

                let _ = Event::error(
                    EventCategory::Runtime,
                    &format!("{}.download.failed", name),
                    &format!("{} Download Failed", name),
                    &format!("Failed to download {}: {}", name, e),
                );
            }
        }
    }

    let all_ok = statuses.iter().all(|s| s.success);

    statuses.push(InstallStatus {
        step: if all_ok {
            "finished".to_string()
        } else {
            "warning".to_string()
        },
        message: if all_ok {
            "All dependencies installed successfully!".to_string()
        } else {
            "Some dependencies failed. Check logs.".to_string()
        },
        progress: Some(100.0),
        success: all_ok,
    });

    if all_ok {
        let _ = Event::success(
            EventCategory::System,
            "dependencies.install.complete",
            "All Dependencies Installed",
            "All dependencies installed successfully",
        );
    } else {
        let _ = Event::warning(
            EventCategory::System,
            "dependencies.install.incomplete",
            "Some Dependencies Failed",
            "Some dependencies failed to install. Check logs for details",
        );
    }

    Ok(statuses)
}
