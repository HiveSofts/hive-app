use std::env;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Debug, serde::Serialize, Clone)]
pub struct InstallStatus {
    pub step: String,
    pub message: String,
    pub progress: Option<f32>,
    pub success: bool,
}

fn get_hive_bin_path() -> PathBuf {
    let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".hive").join("bin")
}

fn get_hive_base_path() -> PathBuf {
    let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".hive")
}

fn get_hive_runtimes_path() -> PathBuf {
    let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".hive").join("runtimes")
}

#[cfg(unix)]
fn set_executable(path: &PathBuf) -> Result<(), String> {
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

/// FIX: هم wrapper بدون پسوند (laravel, composer) هم با پسوند (laravel.sh, composer.sh) میسازه
/// wrapper از php داخل hive استفاده میکنه، اگر نبود از system php
fn create_phar_wrappers(bin_dir: &PathBuf, name: &str, phar_path: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(bin_dir).map_err(|e| e.to_string())?;

    let phar = phar_path.to_string_lossy();

    if cfg!(target_os = "windows") {
        let bin = bin_dir.to_string_lossy().replace('/', "\\");
        let phar_win = phar.replace('/', "\\");
        let content = format!(
            "@echo off\r\nset \"PATH={};%PATH%\"\r\nphp \"{}\" %*\r\n",
            bin, phar_win
        );

        // با پسوند .bat
        let bat_path = bin_dir.join(format!("{}.bat", name));
        fs::write(&bat_path, &content).map_err(|e| format!("Cannot write {}.bat: {}", name, e))?;

        // بدون پسوند (برای Command::new("laravel") در Rust)
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

        // با پسوند .sh
        let sh_path = bin_dir.join(format!("{}.sh", name));
        fs::write(&sh_path, &content).map_err(|e| format!("Cannot write {}.sh: {}", name, e))?;
        set_executable(&sh_path)?;

        // بدون پسوند — این مهم‌ترینه، Command::new("laravel") این رو پیدا میکنه
        let no_ext = bin_dir.join(name);
        fs::write(&no_ext, &content).map_err(|e| format!("Cannot write {}: {}", name, e))?;
        set_executable(&no_ext)?;

        // verify هر دو ساخته شدن
        if !sh_path.exists() {
            return Err(format!("{}.sh was not created", name));
        }
        if !no_ext.exists() {
            return Err(format!("{} (no-ext) was not created", name));
        }
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

    // چک میکنیم HTML نگرفتیم
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let content = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if content_type.contains("text/html") {
        return Err(format!(
            "Got HTML instead of file (redirect/error page). URL: {}",
            url
        ));
    }

    if content.len() < 100 {
        return Err(format!(
            "Downloaded file too small ({} bytes), likely invalid. URL: {}",
            content.len(),
            url
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
    let mut statuses = Vec::new();
    let bin_path = get_hive_bin_path();
    let base_path = get_hive_base_path();
    let runtimes_path = get_hive_runtimes_path();

    // ساخت دایرکتوری‌ها
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

        // چک میکنیم همه فایل‌های لازم هستن
        let already_installed = phar_path.exists() && no_ext_path.exists() && sh_path.exists();

        if already_installed {
            statuses.push(InstallStatus {
                step: format!("check_{}", name),
                message: format!("{} already installed", name),
                progress: Some(100.0),
                success: true,
            });
            continue;
        }

        // دانلود PHAR
        statuses.push(InstallStatus {
            step: format!("download_{}", name),
            message: format!("Downloading {}...", name),
            progress: Some(0.0),
            success: true,
        });

        match download_file(url, &phar_path).await {
            Ok(_) => {
                set_executable(&phar_path).ok();

                // FIX: ساخت هر دو wrapper — با پسوند و بدون پسوند
                match create_phar_wrappers(&bin_path, name, &phar_path) {
                    Ok(_) => {
                        statuses.push(InstallStatus {
                            step: format!("complete_{}", name),
                            message: format!(
                                "{} installed — created {}, {}.sh, {}.phar",
                                name, name, name, name
                            ),
                            progress: Some(100.0),
                            success: true,
                        });
                    }
                    Err(e) => {
                        statuses.push(InstallStatus {
                            step: format!("wrapper_{}", name),
                            message: format!("Failed to create wrappers for {}: {}", name, e),
                            progress: Some(50.0),
                            success: false,
                        });
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

    Ok(statuses)
}
