use tauri::command;

#[command]
pub fn kill_process(pid: u32) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        use std::process::Command;

        // 1. Kill process group (children)
        let _ = Command::new("kill")
            .arg("-TERM")
            .arg(format!("-{}", pid))
            .output();

        // 2. Kill the main process
        let _ = Command::new("kill")
            .arg("-TERM")
            .arg(pid.to_string())
            .output();

        // Wait for graceful termination
        sleep(Duration::from_millis(200));

        // Check if process still exists
        let check = Command::new("kill").arg("-0").arg(pid.to_string()).output();

        if let Ok(output) = check {
            if output.status.success() {
                // Force kill if still running
                let _ = Command::new("kill")
                    .arg("-KILL")
                    .arg(format!("-{}", pid))
                    .output();

                let _ = Command::new("kill")
                    .arg("-KILL")
                    .arg(pid.to_string())
                    .output();

                sleep(Duration::from_millis(100));
            }
        }

        Ok(())
    }

    #[cfg(windows)]
    {
        use std::process::Command;

        let output = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .output()
            .map_err(|e| format!("Failed to run taskkill: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if !stderr.contains("not found") {
                return Err(format!("Failed to kill process {}: {}", pid, stderr));
            }
        }

        Ok(())
    }

    #[cfg(not(any(unix, windows)))]
    {
        Err("kill_process is not supported on this platform.".to_string())
    }
}

#[command]
pub fn is_process_running(pid: u32) -> Result<bool, String> {
    #[cfg(unix)]
    {
        use std::process::Command;
        let output = Command::new("kill")
            .arg("-0")
            .arg(pid.to_string())
            .output()
            .map_err(|e| format!("Failed to check process: {}", e))?;
        Ok(output.status.success())
    }

    #[cfg(windows)]
    {
        use std::process::Command;
        let output = Command::new("tasklist")
            .args(["/FI", &format!("PID eq {}", pid), "/NH"])
            .output()
            .map_err(|e| format!("Failed to check process: {}", e))?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(!stdout.trim().is_empty())
    }

    #[cfg(not(any(unix, windows)))]
    {
        Err("is_process_running is not supported on this platform.".to_string())
    }
}

#[command]
pub fn kill_process_tree(pid: u32) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::process::Command;

        // Get all child PIDs using pstree
        let output = Command::new("pstree")
            .args(["-p", &pid.to_string()])
            .output();

        if let Ok(output) = output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut pids = Vec::new();

            // Parse pstree output to extract PIDs
            for part in stdout.split(&['(', ')', '\n'][..]) {
                if let Ok(p) = part.parse::<u32>() {
                    pids.push(p);
                }
            }

            // Kill children first (reverse order)
            for &child_pid in pids.iter().rev() {
                let _ = kill_process(child_pid);
            }
        }

        // Kill the main process
        kill_process(pid)?;
        Ok(())
    }

    #[cfg(windows)]
    {
        // taskkill /T already kills the process tree
        kill_process(pid)?;
        Ok(())
    }

    #[cfg(not(any(unix, windows)))]
    {
        Err("kill_process_tree is not supported on this platform.".to_string())
    }
}
