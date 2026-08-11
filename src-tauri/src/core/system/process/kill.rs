use crate::core::database::{Event, EventCategory};
use tauri::command;

#[command]
pub fn kill_process(pid: u32) -> Result<(), String> {
    let _ = Event::info(
        EventCategory::System,
        "process.kill.start",
        "Killing Process",
        &format!("Attempting to kill process with PID: {}", pid),
    );

    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        use std::process::Command;
        use std::thread::sleep;
        use std::time::Duration;

        let _ = Command::new("kill")
            .arg("-TERM")
            .arg(format!("-{}", pid))
            .output();

        let _ = Command::new("kill")
            .arg("-TERM")
            .arg(pid.to_string())
            .output();

        sleep(Duration::from_millis(200));

        let check = Command::new("kill").arg("-0").arg(pid.to_string()).output();

        if let Ok(output) = check {
            if output.status.success() {
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

        let _ = Event::success(
            EventCategory::System,
            "process.kill.success",
            "Process Killed",
            &format!("Process with PID {} killed successfully (Unix)", pid),
        );

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
                let _ = Event::error(
                    EventCategory::System,
                    "process.kill.failed",
                    "Failed to Kill Process",
                    &format!("Failed to kill process {}: {}", pid, stderr),
                );
                return Err(format!("Failed to kill process {}: {}", pid, stderr));
            }
        }

        let _ = Event::success(
            EventCategory::System,
            "process.kill.success",
            "Process Killed",
            &format!("Process with PID {} killed successfully (Windows)", pid),
        );

        Ok(())
    }

    #[cfg(not(any(unix, windows)))]
    {
        let _ = Event::error(
            EventCategory::System,
            "process.kill.unsupported",
            "Unsupported Platform",
            "kill_process is not supported on this platform",
        );
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
    let _ = Event::info(
        EventCategory::System,
        "process.tree.kill.start",
        "Killing Process Tree",
        &format!("Attempting to kill process tree with root PID: {}", pid),
    );

    #[cfg(unix)]
    {
        use std::process::Command;

        let output = Command::new("pstree")
            .args(["-p", &pid.to_string()])
            .output();

        if let Ok(output) = output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut pids = Vec::new();

            for part in stdout.split(&['(', ')', '\n'][..]) {
                if let Ok(p) = part.parse::<u32>() {
                    pids.push(p);
                }
            }

            for &child_pid in pids.iter().rev() {
                let _ = kill_process(child_pid);
            }
        }

        kill_process(pid)?;

        let _ = Event::success(
            EventCategory::System,
            "process.tree.kill.success",
            "Process Tree Killed",
            &format!("Process tree with root PID {} killed successfully", pid),
        );

        Ok(())
    }

    #[cfg(windows)]
    {
        kill_process(pid)?;

        let _ = Event::success(
            EventCategory::System,
            "process.tree.kill.success",
            "Process Tree Killed",
            &format!("Process tree with root PID {} killed successfully", pid),
        );

        Ok(())
    }

    #[cfg(not(any(unix, windows)))]
    {
        let _ = Event::error(
            EventCategory::System,
            "process.tree.kill.unsupported",
            "Unsupported Platform",
            "kill_process_tree is not supported on this platform",
        );
        Err("kill_process_tree is not supported on this platform.".to_string())
    }
}
