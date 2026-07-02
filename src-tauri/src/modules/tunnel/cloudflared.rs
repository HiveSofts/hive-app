use crate::core::system::os::get_hive_bin_path;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::Emitter;


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudflaredInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelConfig {
    pub cloudflared_installed: bool,
    pub cloudflared_version: Option<String>,
    pub auth_token: Option<String>,
    pub has_auth: bool,
}


pub fn cloudflared_bin_path() -> PathBuf {
    let name = if cfg!(windows) {
        "cloudflared.exe"
    } else {
        "cloudflared"
    };
    get_hive_bin_path().join(name)
}

fn download_url() -> String {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;

    match (os, arch) {
        ("windows", _) => {
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe".to_string()
        }
        ("linux", "x86_64") => {
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64".to_string()
        }
        ("linux", "x86") | ("linux", "i686") | ("linux", "i386") => {
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-386".to_string()
        }
        ("linux", "aarch64") | ("linux", "arm64") => {
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64".to_string()
        }
        ("linux", "arm") => {
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm".to_string()
        }
        ("macos", "aarch64") | ("macos", "arm64") => {
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz".to_string()
        }
        ("macos", _) => {
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz".to_string()
        }
        _ => {
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64".to_string()
        }
    }
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

fn get_cloudflared_version(path: &PathBuf) -> Option<String> {
    std::process::Command::new(path)
        .arg("--version")
        .output()
        .ok()
        .map(|o| {
            let out = String::from_utf8_lossy(&o.stdout).to_string()
                + &String::from_utf8_lossy(&o.stderr);
            out.lines()
                .next()
                .unwrap_or("unknown")
                .trim()
                .to_string()
        })
}


#[tauri::command]
pub fn detect_cloudflared() -> CloudflaredInfo {
    let bin = cloudflared_bin_path();
    if bin.exists() {
        let version = get_cloudflared_version(&bin);
        return CloudflaredInfo {
            installed: true,
            version,
            path: Some(bin.to_string_lossy().to_string()),
        };
    }

    // Check system PATH
    let sys_result = std::process::Command::new("cloudflared")
        .arg("--version")
        .output();

    if let Ok(out) = sys_result {
        if out.status.success() {
            let ver = String::from_utf8_lossy(&out.stdout).to_string()
                + &String::from_utf8_lossy(&out.stderr);
            return CloudflaredInfo {
                installed: true,
                version: ver.lines().next().map(|l| l.trim().to_string()),
                path: Some("system".to_string()),
            };
        }
    }

    CloudflaredInfo {
        installed: false,
        version: None,
        path: None,
    }
}

#[tauri::command]
pub async fn install_cloudflared(window: tauri::Window) -> Result<CloudflaredInfo, String> {
    let bin_dir = get_hive_bin_path();
    fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;

    let url = download_url();
    let dest = cloudflared_bin_path();

    let _ = window.emit(
        "cloudflared-install-progress",
        serde_json::json!({ "step": "downloading", "progress": 0 }),
    );

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {}: {}", resp.status(), url));
    }

    let total = resp.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;

    // For macOS tgz, write to temp first
    let is_tgz = url.ends_with(".tgz");
    let write_path = if is_tgz {
        bin_dir.join("cloudflared.tgz")
    } else {
        dest.clone()
    };

    let mut file = fs::File::create(&write_path).map_err(|e| e.to_string())?;
    let mut stream = resp.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        file.write_all(&chunk).map_err(|e| e.to_string())?;

        if total > 0 {
            let pct = (downloaded as f64 / total as f64 * 90.0) as u32;
            let _ = window.emit(
                "cloudflared-install-progress",
                serde_json::json!({ "step": "downloading", "progress": pct }),
            );
        }
    }
    file.flush().map_err(|e| e.to_string())?;
    drop(file);

    // Extract tgz on macOS
    if is_tgz {
        let f = fs::File::open(&write_path).map_err(|e| e.to_string())?;
        let gz = flate2::read::GzDecoder::new(f);
        let mut arch = tar::Archive::new(gz);
        arch.unpack(&bin_dir).map_err(|e| e.to_string())?;
        let _ = fs::remove_file(&write_path);

        // The binary is extracted as "cloudflared" inside the tgz
        let extracted = bin_dir.join("cloudflared");
        if extracted.exists() && extracted != dest {
            fs::rename(&extracted, &dest).map_err(|e| e.to_string())?;
        }
    }

    set_executable(&dest)?;

    let _ = window.emit(
        "cloudflared-install-progress",
        serde_json::json!({ "step": "done", "progress": 100 }),
    );

    let version = get_cloudflared_version(&dest);
    Ok(CloudflaredInfo {
        installed: true,
        version,
        path: Some(dest.to_string_lossy().to_string()),
    })
}

#[tauri::command]
pub fn get_tunnel_config() -> TunnelConfig {
    let info = detect_cloudflared();
    let token = super::db::tunnel_config_get("auth_token");
    TunnelConfig {
        cloudflared_installed: info.installed,
        cloudflared_version: info.version,
        has_auth: token.is_some(),
        auth_token: None, // never expose token to frontend
    }
}

#[tauri::command]
pub fn save_tunnel_auth_token(token: String) -> Result<(), String> {
    if token.trim().is_empty() {
        return Err("Token cannot be empty".to_string());
    }
    super::db::tunnel_config_set("auth_token", token.trim());
    Ok(())
}

#[tauri::command]
pub fn delete_tunnel_auth_token() {
    super::db::tunnel_config_delete("auth_token");
}

#[tauri::command]
pub fn check_cloudflared_installed() -> bool {
    detect_cloudflared().installed
}
