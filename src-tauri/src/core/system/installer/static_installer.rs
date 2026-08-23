use std::fs;

use tauri::{AppHandle, Emitter};

use super::progress::InstallProgress;
use crate::core::runtime::install::{create_runtime_link, download_and_extract};
use crate::core::system::os::{get_hive_bin_path, get_runtimes_path};

/// Install a tool as a Hive-managed static binary (portable fallback).
///
/// Downloads `url` (substituted for os/arch/version) into
/// `~/.hive/runtimes/<tool>/<version>`, then links a PATH shim into
/// `~/.hive/bin` using the existing runtime-link machinery so the tool is
/// reported by `get_installed_runtimes` and available from Hive contexts.
pub async fn run_static(
    app: &AppHandle,
    tool_id: &str,
    version: &str,
    archive: &str,
    url: &str,
) -> Result<(), String> {
    app.emit(
        "package-install-progress",
        InstallProgress {
            tool_id: tool_id.to_string(),
            action: "install".into(),
            step: "prepare".into(),
            message: format!("Static install: downloading {}", url),
            progress: Some(0.0),
            is_stderr: false,
            log: Some(format!("Downloading {}", url)),
            command: Some(url.to_string()),
            failure_reason: None,
            exit_code: None,
            done: false,
            success: false,
        },
    )
    .ok();

    let runtimes_dir = get_runtimes_path();
    let runtime_path = runtimes_dir.join(tool_id).join(if version.is_empty() { "latest" } else { version });

    if runtime_path.exists() {
        fs::remove_dir_all(&runtime_path).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(&runtime_path).map_err(|e| e.to_string())?;
    fs::create_dir_all(&get_hive_bin_path()).map_err(|e| e.to_string())?;

    app.emit(
        "package-install-progress",
        InstallProgress {
            tool_id: tool_id.to_string(),
            action: "install".into(),
            step: "download".into(),
            message: "Extracting archive...".into(),
            progress: Some(40.0),
            is_stderr: false,
            log: None,
            command: None,
            failure_reason: None,
            exit_code: None,
            done: false,
            success: false,
        },
    )
    .ok();

    // `download_and_extract` emits its own "download-progress" events; it
    // downloads into a temp file then extracts to dest.
    download_and_extract(
        tool_id.to_string(),
        url.to_string(),
        runtime_path.to_string_lossy().to_string(),
        archive.to_string(),
        app,
    )
    .await
    .map_err(|e| e)?;

    app.emit(
        "package-install-progress",
        InstallProgress {
            tool_id: tool_id.to_string(),
            action: "install".into(),
            step: "link".into(),
            message: "Linking binary into Hive PATH...".into(),
            progress: Some(85.0),
            is_stderr: false,
            log: None,
            command: None,
            failure_reason: None,
            exit_code: None,
            done: false,
            success: false,
        },
    )
    .ok();

    let ver = if version.is_empty() { "latest" } else { version };
    create_runtime_link(tool_id, ver, &runtime_path).map_err(|e| e)?;

    app.emit(
        "package-install-progress",
        InstallProgress {
            tool_id: tool_id.to_string(),
            action: "install".into(),
            step: "verify".into(),
            message: format!("{} installed (static) at {}", tool_id, runtime_path.display()),
            progress: Some(100.0),
            is_stderr: false,
            log: None,
            command: None,
            failure_reason: None,
            exit_code: Some(0),
            done: true,
            success: true,
        },
    )
    .ok();

    Ok(())
}

/// Remove a previously installed static binary: delete the runtime dir and
/// its Hive bin shim (mirrors `uninstall_runtime` for static types).
pub fn remove_static(tool_id: &str, version: &str) -> Result<(), String> {
    let ver = if version.is_empty() { "latest" } else { version };
    let rt = get_runtimes_path().join(tool_id).join(ver);
    if rt.exists() {
        fs::remove_dir_all(&rt).map_err(|e| e.to_string())?;
    }
    let bin_dir = get_hive_bin_path();
    for name in [tool_id.to_string(), format!("{}.sh", tool_id), format!("{}.bat", tool_id)] {
        let p = bin_dir.join(&name);
        if p.exists() {
            let _ = fs::remove_file(&p);
        }
    }
    Ok(())
}
