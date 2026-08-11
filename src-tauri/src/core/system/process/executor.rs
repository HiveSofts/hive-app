use std::io::{BufRead, BufReader, Write};
use std::process::{ChildStdin, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, command};

use once_cell::sync::Lazy;

/// Active streaming shells, keyed by the frontend-provided session id. Holds
/// the child's stdin so interactive commands can receive input while running.
static SHELL_SESSIONS: Lazy<Mutex<std::collections::HashMap<String, ChildStdin>>> =
    Lazy::new(|| Mutex::new(std::collections::HashMap::new()));

#[derive(Clone, serde::Serialize)]
struct ShellOutput {
    session_id: String,
    line: String,
    is_stderr: bool,
    is_done: bool,
    exit_code: Option<i32>,
}

#[command]
pub async fn execute_shell_streaming(
    app: AppHandle,
    session_id: String,
    command: String,
    cwd: String,
) -> Result<(), String> {
    let mut child = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &command])
            .current_dir(&cwd)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?
    } else {
        Command::new("sh")
            .args(["-c", &command])
            .current_dir(&cwd)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?
    };

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture child stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture child stderr".to_string())?;
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "Failed to capture child stdin".to_string())?;

    // Register the writable stdin so interactive commands can receive input.
    SHELL_SESSIONS
        .lock()
        .map_err(|e| format!("Session registry poisoned: {}", e))?
        .insert(session_id.clone(), stdin);

    let app_clone = app.clone();
    let sid = session_id.clone();

    let stdout_thread = std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = app_clone.emit(
                    "shell-output",
                    ShellOutput {
                        session_id: sid.clone(),
                        line: l,
                        is_stderr: false,
                        is_done: false,
                        exit_code: None,
                    },
                );
            }
        }
    });

    let app_clone2 = app.clone();
    let sid2 = session_id.clone();
    let stderr_thread = std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = app_clone2.emit(
                    "shell-output",
                    ShellOutput {
                        session_id: sid2.clone(),
                        line: l,
                        is_stderr: true,
                        is_done: false,
                        exit_code: None,
                    },
                );
            }
        }
    });

    stdout_thread.join().ok();
    stderr_thread.join().ok();

    let status = child.wait().map_err(|e| e.to_string())?;

    // The command finished: drop the stdin handle (closing the pipe) and
    // forget the session so a new command can start fresh.
    let _ = SHELL_SESSIONS.lock().map(|mut s| s.remove(&session_id));

    app.emit(
        "shell-output",
        ShellOutput {
            session_id: session_id.clone(),
            line: String::new(),
            is_stderr: false,
            is_done: true,
            exit_code: status.code(),
        },
    )
    .ok();

    Ok(())
}

/// Send a line to the currently running shell for the given session.
#[command]
pub async fn send_shell_input(session_id: String, input: String) -> Result<(), String> {
    let mut sessions = SHELL_SESSIONS
        .lock()
        .map_err(|e| format!("Session registry poisoned: {}", e))?;
    if let Some(stdin) = sessions.get_mut(&session_id) {
        stdin
            .write_all(input.as_bytes())
            .map_err(|e| format!("Failed to write to shell input: {}", e))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush shell input: {}", e))?;
    }
    Ok(())
}

#[command]
pub async fn execute_shell_command(command: String, cwd: String) -> Result<String, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &command])
            .current_dir(&cwd)
            .output()
            .map_err(|e| e.to_string())?
    } else {
        Command::new("sh")
            .args(["-c", &command])
            .current_dir(&cwd)
            .output()
            .map_err(|e| e.to_string())?
    };
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if output.status.success() {
        Ok(if stdout.is_empty() && !stderr.is_empty() {
            stderr
        } else {
            stdout
        })
    } else {
        Err(stderr)
    }
}

#[command]
pub async fn check_command_exists(command: String) -> Result<bool, String> {
    #[cfg(unix)]
    {
        Ok(Command::new("which")
            .arg(&command)
            .output()
            .map_err(|e| e.to_string())?
            .status
            .success())
    }
    #[cfg(windows)]
    {
        Ok(Command::new("where")
            .arg(&command)
            .output()
            .map_err(|e| e.to_string())?
            .status
            .success())
    }
}
