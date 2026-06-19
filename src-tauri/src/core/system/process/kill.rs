#[tauri::command]
pub fn kill_process(pid: u32) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::process::Command;

        // Try to kill the entire process group first
        let _ = Command::new("kill")
            .arg("-TERM")
            .arg(format!("-{}", pid))
            .output();

        let _ = Command::new("kill")
            .arg("-TERM")
            .arg(pid.to_string())
            .output();

        std::thread::sleep(std::time::Duration::from_millis(200));

        // Force kill if needed
        let _ = Command::new("kill")
            .arg("-KILL")
            .arg(format!("-{}", pid))
            .output();

        let _ = Command::new("kill")
            .arg("-KILL")
            .arg(pid.to_string())
            .output();

        Ok(())
    }

    #[cfg(windows)]
    {
        use std::process::Command;

        let result = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .output()
            .map_err(|e| format!("Failed to run taskkill: {}", e))?;

        if !result.status.success() {
            return Err(format!(
                "Failed to kill process {}: {}",
                pid,
                String::from_utf8_lossy(&result.stderr)
            ));
        }

        Ok(())
    }

    #[cfg(not(any(unix, windows)))]
    {
        Err("kill_process is not supported on this platform.".to_string())
    }
}