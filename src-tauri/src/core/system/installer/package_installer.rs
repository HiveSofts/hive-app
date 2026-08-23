use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::thread;
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

use tauri::{AppHandle, Emitter};

use super::elevation::{elevation_prefix, resolve_elevation};
use super::progress::{classify_failure, InstallProgress};
use crate::core::system::package_manager::fresher::has_internet;
use crate::core::system::package_manager::registry::{build_install_cmd, requires_elevation};
use crate::core::system::package_manager::types::PackageManagerKind;

/// Read a tool's verify_binary / verify_version_arg from the catalog so we can
/// confirm the install actually produced a working binary.
fn verify_installed(tool_id: &str, binary: &str, version_arg: &str) -> bool {
    Command::new(binary)
        .arg(version_arg)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Tracks the OS process id of each in-flight install, keyed by `tool_id`, so the
/// frontend's Cancel button can abort it. A kill is best-effort; the child may
/// have already spawned its own subprocesses.
static ACTIVE_PROCESSES: LazyLock<Mutex<HashMap<String, u32>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Register a running child process so it can be cancelled.
pub fn track_process(tool_id: &str, pid: u32) {
    if let Ok(mut guard) = ACTIVE_PROCESSES.lock() {
        guard.insert(tool_id.to_string(), pid);
    }
}

/// Attempt to cancel a running install by killing its process group/child.
/// Mirrors the Unix/Windows handling in `core/system/process/kill.rs`.
pub fn cancel_process(tool_id: &str) -> bool {
    let pid = match ACTIVE_PROCESSES.lock().ok().and_then(|g| g.get(tool_id).copied()) {
        Some(p) => p,
        None => return false,
    };

    let killed = {
        #[cfg(unix)]
        {
            use std::process::Command;
            let grp = format!("-{}", pid);
            let _ = Command::new("kill").arg("-TERM").arg(&grp).output();
            let _ = Command::new("kill").arg("-TERM").arg(pid.to_string()).output();
            // Verify it died.
            Command::new("kill")
                .arg("-0")
                .arg(pid.to_string())
                .output()
                .map(|o| !o.status.success())
                .unwrap_or(false)
        }
        #[cfg(windows)]
        {
            use std::process::Command;
            Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
        }
        #[cfg(not(any(unix, windows)))]
        {
            false
        }
    };

    if killed {
        if let Ok(mut guard) = ACTIVE_PROCESSES.lock() {
            guard.remove(tool_id);
        }
    }
    killed
}

/// Run a managed (system package manager) install/update/remove with live
/// streaming of stdout/stderr to the frontend. After the process exits we
/// verify success by running `verify_binary --version` when one is supplied; for
/// arbitrary packages (no known verify binary) we trust the exit code.
///
/// Mirror of the line-streaming pattern in `core/system/process/executor.rs`.
#[allow(clippy::too_many_arguments)]
pub fn run_managed_cmd(
    app: &AppHandle,
    tool_id: &str,
    action: crate::core::system::package_manager::PmAction,
    manager: PackageManagerKind,
    package: &str,
    verify_binary: Option<&str>,
    verify_version_arg: &str,
) -> Result<(), String> {
    let requires_elevation = requires_elevation(manager);

    // Network awareness (see "Online vs Offline Search Behavior"): installing or
    // updating downloads from the manager's repositories, so we fail fast with a
    // clear message when offline. Removal is local and needs no connectivity.
    if action != crate::core::system::package_manager::PmAction::Remove && !has_internet() {
        let msg = "No internet connection — cannot download. Check your network and try again.";
        app.emit(
            "package-install-progress",
            InstallProgress {
                tool_id: tool_id.to_string(),
                action: format!("{:?}", action).to_lowercase(),
                step: "error".into(),
                message: msg.to_string(),
                progress: Some(0.0),
                is_stderr: true,
                log: None,
                command: None,
                failure_reason: Some("no_internet".into()),
                exit_code: None,
                done: true,
                success: false,
            },
        )
        .ok();
        return Err(msg.to_string());
    }

    let base = build_install_cmd(manager, action, package);
    let elevation = resolve_elevation(requires_elevation);
    let mut argv = elevation_prefix(&elevation);
    argv.extend(base.iter().cloned());

    let full_command = argv.join(" ");

    app.emit(
        "package-install-progress",
        InstallProgress {
            tool_id: tool_id.to_string(),
            action: format!("{:?}", action).to_lowercase(),
            step: "prepare".into(),
            message: format!("Resolved command: {}", full_command),
            progress: Some(0.0),
            is_stderr: false,
            log: None,
            command: Some(full_command.clone()),
            failure_reason: None,
            exit_code: None,
            done: false,
            success: false,
        },
    )
    .ok();

    // If elevation is required but no helper exists, we still attempt to run;
    // on Linux without pkexec/sudo the command will fail and the UI has the
    // exact command to run manually.
    let (program, rest) = argv
        .split_first()
        .ok_or_else(|| "Empty install command".to_string())?;

    let mut child = Command::new(program)
        .args(rest)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            format!(
                "Failed to start `{}`: {}. Try running it manually: {}",
                program, e, full_command
            )
        })?;

    track_process(tool_id, child.id());

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app_s = app.clone();
    let tool_s = tool_id.to_string();
    let stdout_thread = thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = app_s.emit(
                    "package-install-progress",
                    InstallProgress {
                        tool_id: tool_s.clone(),
                        action: format!("{:?}", action).to_lowercase(),
                        step: "run".into(),
                        message: l.clone(),
                        progress: None,
                        is_stderr: false,
                        log: Some(l),
                        command: None,
                        failure_reason: None,
                        exit_code: None,
                        done: false,
                        success: false,
                    },
                );
            }
        }
    });

    let app_e = app.clone();
    let tool_e = tool_id.to_string();
    let stderr_thread = thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = app_e.emit(
                    "package-install-progress",
                    InstallProgress {
                        tool_id: tool_e.clone(),
                        action: format!("{:?}", action).to_lowercase(),
                        step: "run".into(),
                        message: l.clone(),
                        progress: None,
                        is_stderr: true,
                        log: Some(l),
                        command: None,
                        failure_reason: None,
                        exit_code: None,
                        done: false,
                        success: false,
                    },
                );
            }
        }
    });

    stdout_thread.join().ok();
    stderr_thread.join().ok();

    let status = child.wait().map_err(|e| e.to_string())?;
    let exit_code = status.code();

    if !status.success() {
        let reason = classify_failure(exit_code, "see log");
        app.emit(
            "package-install-progress",
            InstallProgress {
                tool_id: tool_id.to_string(),
                action: format!("{:?}", action).to_lowercase(),
                step: "error".into(),
                message: format!("Command exited with code {:?}. {}", exit_code, full_command),
                progress: Some(100.0),
                is_stderr: true,
                log: None,
                command: Some(full_command.clone()),
                failure_reason: Some(reason),
                exit_code,
                done: true,
                success: false,
            },
        )
        .ok();
        return Err(format!("Install failed (exit {:?}): {}", exit_code, full_command));
    }

    // Verify via the tool's own binary when we know it (catalog path). For an
    // arbitrary package we don't know the binary, so trust the exit code.
    let verified = match verify_binary {
        Some(bin) => verify_installed(tool_id, bin, verify_version_arg),
        None => true,
    };
    app.emit(
        "package-install-progress",
        InstallProgress {
            tool_id: tool_id.to_string(),
            action: format!("{:?}", action).to_lowercase(),
            step: "verify".into(),
            message: match verify_binary {
                Some(_) if verified => format!("{} verified successfully", tool_id),
                Some(_) => format!("Warning: {} finished but binary not found on PATH", tool_id),
                None => format!("{} completed", tool_id),
            },
            progress: Some(100.0),
            is_stderr: !verified,
            log: None,
            command: Some(full_command),
            failure_reason: if verified { None } else { Some("verification_failed".into()) },
            exit_code,
            done: true,
            success: verified,
        },
    )
    .ok();

    if verified {
        Ok(())
    } else {
        Err(format!("{} installed but could not be verified on PATH", tool_id))
    }
}

/// Backwards-compatible wrapper for the catalog-driven `install_tool` path.
#[allow(clippy::too_many_arguments)]
pub fn run_managed(
    app: &AppHandle,
    tool_id: &str,
    action: crate::core::system::package_manager::PmAction,
    manager: PackageManagerKind,
    package: &str,
    binary: &str,
    version_arg: &str,
    _requires_elevation: bool,
) -> Result<(), String> {
    run_managed_cmd(app, tool_id, action, manager, package, Some(binary), version_arg)
}
