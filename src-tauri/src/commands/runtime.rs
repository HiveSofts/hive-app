// src/commands/runtime.rs
use std::fs;
use std::path::PathBuf;
use tauri::command;

#[derive(Debug, serde::Serialize, Clone)]
pub struct RuntimeInfo {
    pub found: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub is_hive: bool,
}

#[command]
pub fn detect_php() -> Result<RuntimeInfo, String> {
    // Check system PHP
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

    Ok(RuntimeInfo {
        found: false,
        version: None,
        path: None,
        is_hive: false,
    })
}

#[command]
pub fn detect_node() -> Result<RuntimeInfo, String> {
    // Check system Node
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

    Ok(RuntimeInfo {
        found: false,
        version: None,
        path: None,
        is_hive: false,
    })
}

#[command]
pub fn get_installed_runtimes(r#type: String) -> Result<Vec<String>, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let runtime_path = PathBuf::from(&home).join(".hive").join("runtimes").join(&r#type);

    if !runtime_path.exists() {
        return Ok(vec![]);
    }

    let mut versions = vec![];
    for entry in fs::read_dir(&runtime_path).map_err(|e| e.to_string())? {
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
pub async fn download_and_extract(url: String, dest_path: String) -> Result<(), String> {
    use std::io::Write;

    let dest = PathBuf::from(dest_path.replace("~", &std::env::var("HOME").unwrap_or_else(|_| ".".to_string())));

    fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let temp_file = dest.join("temp_download");
    let mut file = fs::File::create(&temp_file).map_err(|e| e.to_string())?;
    let content = response.bytes().await.map_err(|e| e.to_string())?;
    file.write_all(&content).map_err(|e| e.to_string())?;

    // Extract based on file extension
    if url.ends_with(".zip") {
        let mut archive = zip::ZipArchive::new(fs::File::open(&temp_file).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
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
            }
        }
    } else if url.ends_with(".tar.gz") {
        let file = fs::File::open(&temp_file).map_err(|e| e.to_string())?;
        let decoder = flate2::read::GzDecoder::new(file);
        let mut archive = tar::Archive::new(decoder);
        archive.unpack(&dest).map_err(|e| e.to_string())?;
    } else if url.ends_with(".tar.xz") {
        let file = fs::File::open(&temp_file).map_err(|e| e.to_string())?;
        let decoder = liblzma::read::XzDecoder::new(file);
        let mut archive = tar::Archive::new(decoder);
        archive.unpack(&dest).map_err(|e| e.to_string())?;
    } else if url.ends_with(".tar.zst") {
        let file = fs::File::open(&temp_file).map_err(|e| e.to_string())?;
        let decoder = zstd::stream::read::Decoder::new(file).map_err(|e| e.to_string())?;
        let mut archive = tar::Archive::new(decoder);
        archive.unpack(&dest).map_err(|e| e.to_string())?;
    }

    fs::remove_file(temp_file).ok();
    Ok(())
}

#[command]
pub fn get_os() -> Result<String, String> {
    Ok(std::env::consts::OS.to_string())
}

#[command]
pub fn get_arch() -> Result<String, String> {
    Ok(std::env::consts::ARCH.to_string())
}