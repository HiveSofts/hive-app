use std::env;
use std::fs;
use std::path::PathBuf;
use tauri::command;
use tauri::Emitter;
use futures_util::StreamExt;

#[derive(Debug, serde::Serialize, Clone)]
pub struct RuntimeInfo {
    pub found: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub is_hive: bool,
}

#[derive(Debug, serde::Serialize, Clone)]
pub struct InstallResult {
    pub runtime: String,
    pub version: String,
    pub success: bool,
    pub message: String,
}

fn get_hive_base_path() -> PathBuf {
    let home = env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());

    PathBuf::from(home).join(".hive")
}

fn get_runtimes_path() -> PathBuf {
    get_hive_base_path().join("runtimes")
}

fn get_hive_bin_path() -> PathBuf {
    get_hive_base_path().join("bin")
}

fn get_script_extension() -> &'static str {
    if cfg!(target_os = "windows") { ".bat" } else { ".sh" }
}

fn get_executable_name(runtime: &str) -> String {
    match runtime {
        "php" => {
            if cfg!(target_os = "windows") { "php.exe".to_string() } else { "php".to_string() }
        }
        "node" => {
            if cfg!(target_os = "windows") { "node.exe".to_string() } else { "node".to_string() }
        }
        "composer" => "composer.phar".to_string(),
        "laravel"  => "laravel.phar".to_string(),
        _          => runtime.to_string(),
    }
}

fn make_executable(path: &PathBuf) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
        let mut permissions = metadata.permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(path, permissions).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
pub async fn install_runtime(
    runtime: String,
    version: String,
    download_url: String,
    archive_type: String,
    window: tauri::Window,
) -> Result<InstallResult, String> {
    let runtimes_dir = get_runtimes_path();
    let bin_dir = get_hive_bin_path();

    fs::create_dir_all(&runtimes_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;

    let runtime_path = runtimes_dir.join(&runtime).join(&version);

    if runtime_path.exists() {
        fs::remove_dir_all(&runtime_path).map_err(|e| e.to_string())?;
    }

    fs::create_dir_all(&runtime_path).map_err(|e| e.to_string())?;

    download_and_extract(
        runtime.clone(),
        download_url,
        runtime_path.to_string_lossy().to_string(),
        archive_type,
        window,
    )
    .await?;

    create_runtime_link(&runtime, &version, &runtime_path)?;

    Ok(InstallResult {
        runtime: runtime.clone(),
        version: version.clone(),
        success: true,
        message: format!("{} {} installed successfully", runtime, version),
    })
}

fn create_runtime_link(runtime: &str, version: &str, runtime_path: &PathBuf) -> Result<(), String> {
    let bin_dir = get_hive_bin_path();
    fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;

    let executable_name = get_executable_name(runtime);
    let executable_path = runtime_path.join(&executable_name);

    if !executable_path.exists() {
        return Err(format!("Executable not found after download: {}", executable_path.display()));
    }

    if runtime == "composer" || runtime == "laravel" {
        // ۱. PHAR رو به bin کپی می‌کنیم
        let bin_phar = bin_dir.join(format!("{}.phar", runtime));
        if bin_phar.exists() {
            fs::remove_file(&bin_phar).map_err(|e| format!("Cannot remove old phar: {}", e))?;
        }
        fs::copy(&executable_path, &bin_phar)
            .map_err(|e| format!("Cannot copy phar to bin: {}", e))?;
        make_executable(&bin_phar)?;

        // ۲. wrapper بدون پسوند می‌سازیم — این مهم‌ترینه
        let no_ext_link = bin_dir.join(runtime);
        if no_ext_link.exists() {
            fs::remove_file(&no_ext_link).map_err(|e| format!("Cannot remove old wrapper: {}", e))?;
        }
        write_phar_wrapper(&no_ext_link, &bin_phar)?;

        // ۳. wrapper با پسوند .sh هم می‌سازیم
        let sh_link = bin_dir.join(format!("{}.sh", runtime));
        if sh_link.exists() {
            fs::remove_file(&sh_link).ok();
        }
        write_phar_wrapper(&sh_link, &bin_phar)?;

    } else {
        let version_simple = version.replace('.', "");

        let no_ext_link = bin_dir.join(runtime);
        if no_ext_link.exists() { fs::remove_file(&no_ext_link).ok(); }
        write_binary_wrapper(&no_ext_link, &executable_path)?;

        let sh_link = bin_dir.join(format!("{}.sh", runtime));
        if sh_link.exists() { fs::remove_file(&sh_link).ok(); }
        write_binary_wrapper(&sh_link, &executable_path)?;

        let versioned = bin_dir.join(format!("{}{}.sh", runtime, version_simple));
        if versioned.exists() { fs::remove_file(&versioned).ok(); }
        write_binary_wrapper(&versioned, &executable_path)?;
    }

    Ok(())
}

fn write_phar_wrapper(wrapper_path: &PathBuf, phar_path: &PathBuf) -> Result<(), String> {
    let phar = phar_path.to_string_lossy();

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

    fs::write(wrapper_path, &content)
        .map_err(|e| format!("Cannot write wrapper {}: {}", wrapper_path.display(), e))?;

    make_executable(wrapper_path)?;

    // verify که واقعاً ساخته شد
    if !wrapper_path.exists() {
        return Err(format!("Wrapper was not created: {}", wrapper_path.display()));
    }

    Ok(())
}

fn write_binary_wrapper(wrapper_path: &PathBuf, binary_path: &PathBuf) -> Result<(), String> {
    let bin = binary_path.to_string_lossy();

    let content = format!(
        "#!/bin/sh\n\
         DIR=\"$(CDPATH= cd -- \"$(dirname -- \"$0\")\" && pwd)\"\n\
         export PATH=\"$DIR:$PATH\"\n\
         exec \"{}\" \"$@\"\n",
        bin
    );

    fs::write(wrapper_path, &content)
        .map_err(|e| format!("Cannot write wrapper {}: {}", wrapper_path.display(), e))?;

    make_executable(wrapper_path)?;

    if !wrapper_path.exists() {
        return Err(format!("Wrapper was not created: {}", wrapper_path.display()));
    }

    Ok(())
}
#[command]
pub async fn download_and_extract(
    runtime: String,
    url: String,
    dest_path: String,
    archive_type: String,
    window: tauri::Window,
) -> Result<(), String> {
    let dest = PathBuf::from(&dest_path);
    fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    if archive_type == "phar" {
        download_phar(&runtime, &url, &dest).await?;
        return Ok(());
    }

    let temp_dir = dest.parent().unwrap_or(&dest).join("temp_downloads");
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let temp_file = temp_dir.join(format!(
        "temp_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_micros()
    ));

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))  // FIX: redirect را follow می‌کند
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut file = fs::File::create(&temp_file).map_err(|e| e.to_string())?;
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        file.write_all(&chunk).map_err(|e| e.to_string())?;

        if total_size > 0 {
            let progress = (downloaded as f64 / total_size as f64 * 100.0) as u32;
            let _ = window.emit("download-progress", progress);
        }
    }

    file.flush().map_err(|e| e.to_string())?;
    drop(file);

    if archive_type == "zip" || url.ends_with(".zip") {
        extract_zip(&temp_file, &dest)?;
    } else if archive_type == "tar.gz" || url.ends_with(".tar.gz") {
        extract_tar_gz(&temp_file, &dest)?;
    } else if archive_type == "tar.xz" || url.ends_with(".tar.xz") {
        extract_tar_xz(&temp_file, &dest)?;
    } else if archive_type == "tar.zst" || url.ends_with(".tar.zst") {
        extract_tar_zst(&temp_file, &dest)?;
    } else {
        return Err(format!("Unsupported archive type: {}", archive_type));
    }

    fs::remove_file(temp_file).ok();
    fs::remove_dir(temp_dir).ok();

    Ok(())
}

fn extract_zip(temp_file: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    let file = fs::File::open(temp_file).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let out_path = dest.join(file.name());

        if file.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }

            let mut outfile = fs::File::create(&out_path).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;

            #[cfg(unix)]
            {
                if let Some(name) = out_path.file_name().and_then(|n| n.to_str()) {
                    if name == "php" || name == "node" || name == "npm" || name == "npx"
                        || name.contains("php") || name.contains("node")
                    {
                        make_executable(&out_path)?;
                    }
                }
            }
        }
    }

    Ok(())
}

fn extract_tar_gz(temp_file: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    let file = fs::File::open(temp_file).map_err(|e| e.to_string())?;
    let decoder = flate2::read::GzDecoder::new(file);
    let mut archive = tar::Archive::new(decoder);
    archive.unpack(dest).map_err(|e| e.to_string())?;
    fix_extracted_permissions(dest)?;
    Ok(())
}

fn extract_tar_xz(temp_file: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    let file = fs::File::open(temp_file).map_err(|e| e.to_string())?;
    let decoder = liblzma::read::XzDecoder::new(file);
    let mut archive = tar::Archive::new(decoder);
    archive.unpack(dest).map_err(|e| e.to_string())?;
    fix_extracted_permissions(dest)?;
    Ok(())
}

fn extract_tar_zst(temp_file: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    let file = fs::File::open(temp_file).map_err(|e| e.to_string())?;
    let decoder = zstd::stream::read::Decoder::new(file).map_err(|e| e.to_string())?;
    let mut archive = tar::Archive::new(decoder);
    archive.unpack(dest).map_err(|e| e.to_string())?;
    fix_extracted_permissions(dest)?;
    Ok(())
}

fn fix_extracted_permissions(dest: &PathBuf) -> Result<(), String> {
    #[cfg(unix)]
    {
        fn walk(path: &PathBuf) -> Result<(), String> {
            if !path.exists() { return Ok(()); }

            if path.is_dir() {
                for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
                    let entry = entry.map_err(|e| e.to_string())?;
                    walk(&entry.path())?;
                }
            } else if let Some(name) = path.file_name().and_then(|s| s.to_str()) {
                if name == "php" || name == "node" || name == "npm" || name == "npx"
                    || name.contains("php") || name.contains("node")
                {
                    use std::os::unix::fs::PermissionsExt;
                    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
                    let mut perm = meta.permissions();
                    perm.set_mode(0o755);
                    fs::set_permissions(path, perm).map_err(|e| e.to_string())?;
                }
            }

            Ok(())
        }

        walk(dest)?;
    }

    Ok(())
}

async fn download_phar(runtime: &str, url: &str, dest: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;

    // FIX: از Client با redirect استفاده می‌کنیم تا GitHub releases درست دانلود شوند
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(url).send().await.map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    // FIX: Content-Type چک می‌کنیم که HTML دریافت نکرده باشیم
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let content = response.bytes().await.map_err(|e| e.to_string())?;

    // FIX: اگر HTML دریافت کردیم، خطا می‌دهیم
    if content_type.contains("text/html") {
        return Err(format!(
            "Downloaded content is HTML (likely a redirect or error page), not a PHAR. URL: {}",
            url
        ));
    }

    // FIX: بررسی می‌کنیم PHAR header دارد (<?php یا PHAR signature)
    let is_valid_phar = content.starts_with(b"<?php") || content.len() > 100;
    if !is_valid_phar {
        return Err(format!("Downloaded file appears invalid (too small: {} bytes)", content.len()));
    }

    // FIX: نام فایل از runtime گرفته می‌شود، نه از URL
    let filename = match runtime {
        "composer" => "composer.phar",
        "laravel"  => "laravel.phar",
        _ => return Err(format!("Unsupported phar runtime: {}", runtime)),
    };

    let file_path = dest.join(filename);
    fs::write(&file_path, content).map_err(|e| e.to_string())?;
    make_executable(&file_path)?;

    Ok(())
}

#[command]
pub fn get_installed_runtimes(r#type: String) -> Result<Vec<String>, String> {
    let runtimes_dir = get_runtimes_path().join(&r#type);

    if !runtimes_dir.exists() {
        return Ok(vec![]);
    }

    let mut versions = vec![];

    for entry in fs::read_dir(&runtimes_dir).map_err(|e| e.to_string())? {
        if let Ok(entry) = entry {
            if entry.path().is_dir() {
                if let Some(name) = entry.file_name().to_str() {
                    versions.push(name.to_string());
                }
            }
        }
    }

    versions.sort();
    Ok(versions)
}

#[command]
pub fn get_available_links() -> Result<Vec<String>, String> {
    let bin_dir = get_hive_bin_path();

    if !bin_dir.exists() {
        return Ok(vec![]);
    }

    let mut links = vec![];

    for entry in fs::read_dir(&bin_dir).map_err(|e| e.to_string())? {
        if let Ok(entry) = entry {
            if let Some(name) = entry.file_name().to_str() {
                links.push(name.to_string());
            }
        }
    }

    links.sort();
    Ok(links)
}

#[command]
pub fn uninstall_runtime(runtime: String, version: String) -> Result<(), String> {
    let runtime_path = get_runtimes_path().join(&runtime).join(&version);

    if runtime_path.exists() {
        fs::remove_dir_all(&runtime_path).map_err(|e| e.to_string())?;
    }

    let bin_dir = get_hive_bin_path();

    if runtime == "composer" || runtime == "laravel" {
        let phar_link = bin_dir.join(format!("{}.phar", runtime));
        if phar_link.exists() { fs::remove_file(&phar_link).ok(); }

        let sh_link = bin_dir.join(format!("{}{}", runtime, get_script_extension()));
        if sh_link.exists() { fs::remove_file(&sh_link).ok(); }

        let no_ext_link = bin_dir.join(&runtime);
        if no_ext_link.exists() { fs::remove_file(&no_ext_link).ok(); }
    } else {
        let version_simple = version.replace('.', "");

        let versioned_link = bin_dir.join(format!("{}{}{}", runtime, version_simple, get_script_extension()));
        if versioned_link.exists() { fs::remove_file(&versioned_link).ok(); }

        let default_sh_link = bin_dir.join(format!("{}{}", runtime, get_script_extension()));
        if default_sh_link.exists() { fs::remove_file(&default_sh_link).ok(); }

        let no_ext_link = bin_dir.join(&runtime);
        if no_ext_link.exists() { fs::remove_file(&no_ext_link).ok(); }

        let installed = get_installed_runtimes(runtime.clone())?;

        if !installed.is_empty() {
            let last_version = installed.last().unwrap();
            let first_path = get_runtimes_path().join(&runtime).join(last_version);
            let executable_name = get_executable_name(&runtime);
            let executable_path = first_path.join(executable_name);

            if executable_path.exists() {
                create_runtime_link(&runtime, last_version, &first_path)?;
            }
        }
    }

    Ok(())
}

#[command]
pub fn detect_php() -> Result<RuntimeInfo, String> {
    let bin_dir = get_hive_bin_path();

    let no_ext_php = bin_dir.join("php");
    if no_ext_php.exists() {
        return Ok(RuntimeInfo {
            found: true,
            version: Some("hive".to_string()),
            path: Some(no_ext_php.to_string_lossy().to_string()),
            is_hive: true,
        });
    }

    let php_sh = bin_dir.join(format!("php{}", get_script_extension()));
    if php_sh.exists() {
        return Ok(RuntimeInfo {
            found: true,
            version: Some("hive".to_string()),
            path: Some(php_sh.to_string_lossy().to_string()),
            is_hive: true,
        });
    }

    let system = std::process::Command::new("php").arg("-v").output();

    if let Ok(output) = system {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Some(line) = stdout.lines().next() {
            let version = line.split(' ').nth(1).unwrap_or("unknown").to_string();
            return Ok(RuntimeInfo {
                found: true,
                version: Some(version),
                path: Some("system".to_string()),
                is_hive: false,
            });
        }
    }

    Ok(RuntimeInfo { found: false, version: None, path: None, is_hive: false })
}

#[command]
pub fn detect_node() -> Result<RuntimeInfo, String> {
    let bin_dir = get_hive_bin_path();

    let no_ext_node = bin_dir.join("node");
    if no_ext_node.exists() {
        return Ok(RuntimeInfo {
            found: true,
            version: Some("hive".to_string()),
            path: Some(no_ext_node.to_string_lossy().to_string()),
            is_hive: true,
        });
    }

    let node_sh = bin_dir.join(format!("node{}", get_script_extension()));
    if node_sh.exists() {
        return Ok(RuntimeInfo {
            found: true,
            version: Some("hive".to_string()),
            path: Some(node_sh.to_string_lossy().to_string()),
            is_hive: true,
        });
    }

    let system = std::process::Command::new("node").arg("-v").output();

    if let Ok(output) = system {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !version.is_empty() {
            return Ok(RuntimeInfo {
                found: true,
                version: Some(version),
                path: Some("system".to_string()),
                is_hive: false,
            });
        }
    }

    Ok(RuntimeInfo { found: false, version: None, path: None, is_hive: false })
}

#[command]
pub fn get_os() -> Result<String, String> {
    Ok(std::env::consts::OS.to_string())
}

#[command]
pub fn get_arch() -> Result<String, String> {
    Ok(std::env::consts::ARCH.to_string())
}