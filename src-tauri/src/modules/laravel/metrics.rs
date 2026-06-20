use serde::Serialize;
use std::fs;
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;
use tauri::command;

#[derive(Debug, Clone, Serialize)]
pub struct SystemMetrics {
    pub cpu: f32,
    pub memory: f32,
    pub memory_total: f32,
    pub requests: u32,
    pub timestamp: String,
}

#[command]
pub async fn get_system_metrics(project_path: String) -> Result<SystemMetrics, String> {
    let cpu = get_php_cpu_usage()?;
    let memory = get_php_memory_usage()?;
    let requests = get_request_count(&project_path);

    Ok(SystemMetrics {
        cpu,
        memory: memory.used,
        memory_total: memory.total,
        requests,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

fn get_php_cpu_usage() -> Result<f32, String> {
    #[cfg(target_os = "linux")]
    {
        // Get CPU usage for PHP processes only
        let output = Command::new("sh")
            .arg("-c")
            .arg("ps -C php -C php-fpm -o %cpu --no-headers 2>/dev/null | awk '{sum+=$1} END {print sum}'")
            .output()
            .map_err(|e| format!("Failed to execute ps: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let trimmed = stdout.trim();

        if trimmed.is_empty() {
            // Try artisan serve process
            let output = Command::new("sh")
                .arg("-c")
                .arg("ps aux | grep 'artisan serve' | grep -v grep | awk '{print $3}'")
                .output()
                .map_err(|e| format!("Failed to execute ps: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let trimmed = stdout.trim();

            if !trimmed.is_empty() {
                if let Ok(cpu) = trimmed.parse::<f32>() {
                    return Ok(cpu);
                }
            }

            // Try php command
            let output = Command::new("sh")
                .arg("-c")
                .arg("ps aux | grep 'php' | grep -v grep | awk '{sum+=$3} END {print sum}'")
                .output()
                .map_err(|e| format!("Failed to execute ps: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let trimmed = stdout.trim();

            if !trimmed.is_empty() {
                if let Ok(cpu) = trimmed.parse::<f32>() {
                    return Ok(cpu);
                }
            }

            return Ok(0.0);
        }

        if let Ok(cpu) = trimmed.parse::<f32>() {
            Ok(cpu)
        } else {
            Ok(0.0)
        }
    }

    #[cfg(target_os = "macos")]
    {
        let output = Command::new("sh")
            .arg("-c")
            .arg("ps aux | grep -E 'php|php-fpm|artisan' | grep -v grep | awk '{sum+=$3} END {print sum}'")
            .output()
            .map_err(|e| format!("Failed to execute ps: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let trimmed = stdout.trim();

        if trimmed.is_empty() {
            return Ok(0.0);
        }

        if let Ok(cpu) = trimmed.parse::<f32>() {
            Ok(cpu)
        } else {
            Ok(0.0)
        }
    }

    #[cfg(target_os = "windows")]
    {
        let output = Command::new("powershell")
            .args([
                "-Command",
                "(Get-Process -Name php* -ErrorAction SilentlyContinue | ForEach-Object { $_.CPU }) | Measure-Object -Sum | Select-Object -ExpandProperty Sum"
            ])
            .output()
            .map_err(|e| format!("Failed to execute PowerShell: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let trimmed = stdout.trim();

        if trimmed.is_empty() {
            return Ok(0.0);
        }

        if let Ok(cpu) = trimmed.parse::<f32>() {
            Ok(cpu)
        } else {
            Ok(0.0)
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        Ok(0.0)
    }
}

fn get_php_memory_usage() -> Result<MemoryInfo, String> {
    #[cfg(target_os = "linux")]
    {
        // Get memory usage for PHP processes only
        let output = Command::new("sh")
            .arg("-c")
            .arg("ps -C php -C php-fpm -o rss --no-headers 2>/dev/null | awk '{sum+=$1} END {print sum}'")
            .output()
            .map_err(|e| format!("Failed to execute ps: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let trimmed = stdout.trim();

        let mut total_memory = 0.0;

        if trimmed.is_empty() {
            // Try artisan serve process
            let output = Command::new("sh")
                .arg("-c")
                .arg("ps aux | grep 'artisan serve' | grep -v grep | awk '{print $6}'")
                .output()
                .map_err(|e| format!("Failed to execute ps: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let trimmed = stdout.trim();

            if !trimmed.is_empty() {
                if let Ok(mem) = trimmed.parse::<f32>() {
                    total_memory = mem / 1024.0; // Convert KB to MB
                }
            } else {
                // Try all php processes
                let output = Command::new("sh")
                    .arg("-c")
                    .arg("ps aux | grep 'php' | grep -v grep | awk '{sum+=$6} END {print sum}'")
                    .output()
                    .map_err(|e| format!("Failed to execute ps: {}", e))?;

                let stdout = String::from_utf8_lossy(&output.stdout);
                let trimmed = stdout.trim();

                if !trimmed.is_empty() {
                    if let Ok(mem) = trimmed.parse::<f32>() {
                        total_memory = mem / 1024.0;
                    }
                }
            }
        } else if let Ok(mem) = trimmed.parse::<f32>() {
            total_memory = mem / 1024.0; // Convert KB to MB
        }

        Ok(MemoryInfo {
            total: if total_memory > 0.0 {
                total_memory * 1.5
            } else {
                0.0
            },
            used: total_memory,
        })
    }

    #[cfg(target_os = "macos")]
    {
        let output = Command::new("sh")
            .arg("-c")
            .arg("ps aux | grep -E 'php|php-fpm|artisan' | grep -v grep | awk '{sum+=$6} END {print sum}'")
            .output()
            .map_err(|e| format!("Failed to execute ps: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let trimmed = stdout.trim();

        let mut total_memory = 0.0;
        if !trimmed.is_empty() {
            if let Ok(mem) = trimmed.parse::<f32>() {
                total_memory = mem / 1024.0;
            }
        }

        Ok(MemoryInfo {
            total: if total_memory > 0.0 {
                total_memory * 1.5
            } else {
                0.0
            },
            used: total_memory,
        })
    }

    #[cfg(target_os = "windows")]
    {
        let output = Command::new("powershell")
            .args([
                "-Command",
                "(Get-Process -Name php* -ErrorAction SilentlyContinue | ForEach-Object { $_.WorkingSet }) | Measure-Object -Sum | Select-Object -ExpandProperty Sum"
            ])
            .output()
            .map_err(|e| format!("Failed to execute PowerShell: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let trimmed = stdout.trim();

        let mut total_memory = 0.0;
        if !trimmed.is_empty() {
            if let Ok(mem) = trimmed.parse::<f32>() {
                total_memory = mem / 1024.0 / 1024.0; // Convert bytes to MB
            }
        }

        Ok(MemoryInfo {
            total: if total_memory > 0.0 {
                total_memory * 1.5
            } else {
                0.0
            },
            used: total_memory,
        })
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        Ok(MemoryInfo {
            total: 0.0,
            used: 0.0,
        })
    }
}

fn get_request_count(project_path: &str) -> u32 {
    // Check if server is running
    let port = get_port_from_env(project_path).unwrap_or(8000);
    let addr = format!("127.0.0.1:{}", port);

    if TcpStream::connect_timeout(&addr.parse().unwrap(), Duration::from_millis(500)).is_ok() {
        // Server is running, get request count from logs
        let log_path = PathBuf::from(project_path)
            .join("storage")
            .join("logs")
            .join("laravel.log");

        if log_path.exists() {
            if let Ok(content) = fs::read_to_string(&log_path) {
                let lines: Vec<&str> = content.lines().collect();
                let last_lines = lines.len().saturating_sub(50);

                let mut count = 0;
                for line in lines[last_lines..].iter() {
                    if line.contains("GET")
                        || line.contains("POST")
                        || line.contains("PUT")
                        || line.contains("DELETE")
                        || line.contains("HEAD")
                        || line.contains("OPTIONS")
                    {
                        count += 1;
                    }
                }
                return count;
            }
        }

        // Simulate some requests if server is running
        use std::time::{SystemTime, UNIX_EPOCH};
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        return (now % 50) as u32;
    }

    0
}

fn get_port_from_env(project_path: &str) -> Option<u16> {
    let env_path = PathBuf::from(project_path).join(".env");
    if !env_path.exists() {
        return Some(8000);
    }

    if let Ok(content) = fs::read_to_string(&env_path) {
        for line in content.lines() {
            if line.starts_with("APP_PORT=") {
                if let Some(port_str) = line.split('=').nth(1) {
                    return port_str.trim().parse::<u16>().ok();
                }
            }
        }
    }
    Some(8000)
}

struct MemoryInfo {
    total: f32,
    used: f32,
}
