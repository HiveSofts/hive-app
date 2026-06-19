use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::Emitter;
use futures_util::StreamExt;
use crate::core::system::os::{get_runtimes_path, get_hive_bin_path};

#[derive(Debug, serde::Serialize, Clone)]
pub struct InstallResult {
    pub runtime: String,
    pub version: String,
    pub success: bool,
    pub message: String,
}

fn get_executable_name(runtime: &str) -> String {
    match runtime {
        "php" => if cfg!(windows) { "php.exe".to_string() } else { "php".to_string() },
        "node" => if cfg!(windows) { "node.exe".to_string() } else { "node".to_string() },
        "composer" => "composer.phar".to_string(),
        "laravel" => "laravel.phar".to_string(),
        _ => runtime.to_string(),
    }
}

#[cfg(unix)]
pub fn make_executable(path: &PathBuf) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let mut permissions = metadata.permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(path, permissions).map_err(|e| e.to_string())
}

#[cfg(windows)]
pub fn make_executable(_path: &PathBuf) -> Result<(), String> {
    Ok(())
}

pub fn write_phar_wrapper(wrapper_path: &PathBuf, phar_path: &PathBuf) -> Result<(), String> {
    let phar = phar_path.to_string_lossy();

    let content = if cfg!(windows) {
        format!(
            "@echo off\r\nset \"PATH=%~dp0;%PATH%\"\r\nphp \"{}\" %*\r\n",
            phar
        )
    } else {
        format!(
            "#!/bin/sh\n\
             DIR=\"$(CDPATH= cd -- \"$(dirname -- \"$0\")\" && pwd)\"\n\
             export PATH=\"$DIR:$PATH\"\n\
             if [ -x \"$DIR/php\" ]; then\n\
             \texec \"$DIR/php\" \"{}\" \"$@\"\n\
             else\n\
             \texec php \"{}\" \"$@\"\n\
             fi\n",
            phar, phar
        )
    };

    fs::write(wrapper_path, content).map_err(|e| e.to_string())?;
    make_executable(wrapper_path)?;
    Ok(())
}

pub fn write_binary_wrapper(wrapper_path: &PathBuf, binary_path: &PathBuf) -> Result<(), String> {
    let bin = binary_path.to_string_lossy();

    let content = if cfg!(windows) {
        format!(
            "@echo off\r\nset \"PATH=%~dp0;%PATH%\"\r\n\"{}\" %*\r\n",
            bin
        )
    } else {
        format!(
            "#!/bin/sh\n\
             DIR=\"$(CDPATH= cd -- \"$(dirname -- \"$0\")\" && pwd)\"\n\
             export PATH=\"$DIR:$PATH\"\n\
             exec \"{}\" \"$@\"\n",
            bin
        )
    };

    fs::write(wrapper_path, content).map_err(|e| e.to_string())?;
    make_executable(wrapper_path)?;
    Ok(())
}

pub fn create_runtime_link(runtime: &str, _version: &str, runtime_path: &PathBuf) -> Result<(), String> {
    let bin_dir = get_hive_bin_path();
    fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;

    let executable_name = get_executable_name(runtime);
    let executable_path = runtime_path.join(&executable_name);

    if !executable_path.exists() {
        return Err(format!("Executable not found: {}", executable_path.display()));
    }

    if runtime == "composer" || runtime == "laravel" {
        let bin_phar = bin_dir.join(format!("{}.phar", runtime));
        if bin_phar.exists() {
            fs::remove_file(&bin_phar).map_err(|e| e.to_string())?;
        }
        fs::copy(&executable_path, &bin_phar).map_err(|e| e.to_string())?;
        make_executable(&bin_phar)?;

        let no_ext_link = bin_dir.join(runtime);
        if no_ext_link.exists() {
            fs::remove_file(&no_ext_link).map_err(|e| e.to_string())?;
        }
        write_phar_wrapper(&no_ext_link, &bin_phar)?;

        let sh_link = bin_dir.join(format!("{}.sh", runtime));
        if sh_link.exists() {
            fs::remove_file(&sh_link).map_err(|e| e.to_string())?;
        }
        write_phar_wrapper(&sh_link, &bin_phar)?;
    } else {
        let no_ext_link = bin_dir.join(runtime);
        if no_ext_link.exists() {
            fs::remove_file(&no_ext_link).map_err(|e| e.to_string())?;
        }
        write_binary_wrapper(&no_ext_link, &executable_path)?;

        let sh_link = bin_dir.join(format!("{}.sh", runtime));
        if sh_link.exists() {
            fs::remove_file(&sh_link).map_err(|e| e.to_string())?;
        }
        write_binary_wrapper(&sh_link, &executable_path)?;
    }

    Ok(())
}

#[tauri::command]
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

async fn download_and_extract(
    runtime: String,
    url: String,
    dest_path: String,
    archive_type: String,
    window: tauri::Window,
) -> Result<(), String> {
    let dest = PathBuf::from(&dest_path);
    fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    if archive_type == "phar" {
        return download_phar(&runtime, &url, &dest).await;
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
        .redirect(reqwest::redirect::Policy::limited(10))
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

    let result = if archive_type == "zip" || url.ends_with(".zip") {
        extract_zip(&temp_file, &dest)
    } else if archive_type == "tar.gz" || url.ends_with(".tar.gz") {
        extract_tar_gz(&temp_file, &dest)
    } else if archive_type == "tar.xz" || url.ends_with(".tar.xz") {
        extract_tar_xz(&temp_file, &dest)
    } else if archive_type == "tar.zst" || url.ends_with(".tar.zst") {
        extract_tar_zst(&temp_file, &dest)
    } else {
        return Err(format!("Unsupported archive type: {}", archive_type));
    };

    let _ = fs::remove_file(&temp_file);
    let _ = fs::remove_dir(&temp_dir);

    result
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
            make_executable(&out_path)?;
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

#[cfg(unix)]
fn fix_extracted_permissions(dest: &PathBuf) -> Result<(), String> {
    fn walk(path: &PathBuf) -> Result<(), String> {
        if !path.exists() {
            return Ok(());
        }

        if path.is_dir() {
            for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                walk(&entry.path())?;
            }
        } else if let Some(name) = path.file_name().and_then(|s| s.to_str()) {
            if name == "php" || name == "node" || name == "npm" || name == "npx" {
                make_executable(path)?;
            }
        }

        Ok(())
    }

    walk(dest)
}

#[cfg(windows)]
fn fix_extracted_permissions(_dest: &PathBuf) -> Result<(), String> {
    Ok(())
}

async fn download_phar(runtime: &str, url: &str, dest: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(url).send().await.map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let content = response.bytes().await.map_err(|e| e.to_string())?;

    if content.len() < 100 {
        return Err(format!("Downloaded file too small: {} bytes", content.len()));
    }

    let filename = match runtime {
        "composer" => "composer.phar",
        "laravel" => "laravel.phar",
        _ => return Err(format!("Unsupported phar runtime: {}", runtime)),
    };

    let file_path = dest.join(filename);
    fs::write(&file_path, content).map_err(|e| e.to_string())?;
    make_executable(&file_path)?;

    Ok(())
}