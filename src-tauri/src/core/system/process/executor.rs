use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::{command, AppHandle, Emitter};

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

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
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

#[command]
pub async fn send_shell_input() -> Result<(), String> {
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
