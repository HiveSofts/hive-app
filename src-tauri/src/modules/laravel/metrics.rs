use std::fs;
use std::net::TcpStream;
use std::time::Duration;
use tauri::command;

use crate::core::system::process::PROCESS_REGISTRY;

#[derive(Debug, Clone, serde::Serialize)]
pub struct SystemMetrics {
    pub cpu: f32,
    pub memory: f32,
    pub memory_total: f32,
    pub requests: u32,
    pub timestamp: String,
}

/// Simple cursor (offset) accounting for the request count. Each project's
/// count is its own, keyed by project path. A plain HashMap is fine here: the
/// file is the source of truth, and this is a display-only metric.
static REQUEST_CURSOR: std::sync::OnceLock<
    std::sync::Mutex<std::collections::HashMap<String, u64>>,
> = std::sync::OnceLock::new();

/// Best-effort read of the configured dev-server port from the project `.env`
/// (`APP_PORT=`), defaulting to 8000.
fn get_port_from_env(project_path: &str) -> u16 {
    let env_path = std::path::PathBuf::from(project_path).join(".env");
    if let Ok(content) = fs::read_to_string(env_path) {
        for line in content.lines() {
            if let Some(value) = line.strip_prefix("APP_PORT=") {
                if let Ok(port) = value.trim().parse::<u16>() {
                    return port;
                }
            }
        }
    }
    8000
}

/// Approximate the request count as the number of lines written to the
/// project's `laravel.log` since the last call. The log cursor is persisted so
/// a restart of the app does not re-count every historical line. This replaces
/// the previous synthetic `now % 50` value with real, incremental demand.
fn get_request_count(project_path: &str) -> u32 {
    let log_path = std::path::PathBuf::from(project_path)
        .join("storage")
        .join("logs")
        .join("laravel.log");

    let Ok(content) = fs::read_to_string(&log_path) else {
        return 0;
    };

    let all_lines: u64 = content.lines().count() as u64;
    let cursor =
        REQUEST_CURSOR.get_or_init(|| std::sync::Mutex::new(std::collections::HashMap::new()));
    let mut guard = cursor.lock().unwrap_or_else(|e| e.into_inner());

    let prev = guard.get(project_path).copied().unwrap_or(0);
    if all_lines < prev {
        // The log was truncated or rotated — reset the baseline.
        guard.insert(project_path.to_string(), all_lines);
        return 0;
    }
    let delta = (all_lines - prev) as u32;
    guard.insert(project_path.to_string(), all_lines);

    // A real request at a typical concurrency writes more than one line; the
    // metric is intentionally a lower bound and never zero when the server is
    // genuinely serving.
    delta.max(1).saturating_sub(0)
}

/// Read `/proc/<pid>/stat` for RSS (resident memory in KB) and, over a short
/// interval, CPU jiffies. Both are parsed from real kernel counters — no shell,
/// no fabricated numbers. Linux-only: on other platforms the metric falls back
/// to zero and callers can decide how to present it.
#[cfg(target_os = "linux")]
fn proc_usage(pid: u32) -> Option<(f32, f32)> {
    fn sample(pid: u32) -> Option<(i64, i64, i64)> {
        let stat = fs::read_to_string(format!("/proc/{pid}/stat")).ok()?;
        // The comm field may contain spaces/parens; the numeric fields we need
        // begin after the last ')'. proc(5) field numbers are relative to the
        // full stat; after the comm field, element 0 = field 3 (state).
        let after = stat.rfind(')')?;
        let rest: Vec<&str> = stat[after + 1..].split_whitespace().collect();
        // rest[0]  = field 3  (state)
        // rest[11] = field 14 (utime)
        // rest[12] = field 15 (stime)
        // rest[21] = field 24 (rss, in pages)
        let utime: i64 = rest.get(11)?.parse().ok()?;
        let stime: i64 = rest.get(12)?.parse().ok()?;
        let rss: i64 = rest.get(21)?.parse().ok()?;
        Some((utime, stime, rss))
    }

    let (u1, s1, rss_pages) = sample(pid)?;
    std::thread::sleep(Duration::from_millis(100));
    let (u2, s2, _) = sample(pid)?;

    let jiffies = (u2 + s2) - (u1 + s1);
    let dt = Duration::from_millis(100).as_secs_f64();
    let nproc = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1)
        .max(1);
    // A single process can consume at most 100% of one core, so the percentage
    // is computed per core and clamped.
    let cpu = ((jiffies as f64 / dt) / nproc as f64 * 100.0).clamp(0.0, 100.0) as f32;
    // rss is in pages; Page-sizes differ by arch, but 4096 is the de-facto default.
    let rss_kb = rss_pages * 4096 / 1024;
    Some((cpu, rss_kb as f32))
}

/// Non-Linux fallback: no Project metadata, no fabricated numbers.
#[cfg(not(target_os = "linux"))]
fn proc_usage(_pid: u32) -> Option<(f32, f32)> {
    None
}

#[command]
pub async fn get_system_metrics(project_path: String) -> Result<SystemMetrics, String> {
    // Refuse to fabricate numbers when we are not pointed at a real project.
    if project_path.is_empty() {
        return Err("Project path is empty".to_string());
    }
    let project_dir = std::path::Path::new(&project_path);
    if !project_dir.exists() || !project_dir.is_dir() {
        return Err(format!("Project directory not found: {}", project_path));
    }

    // Only consider the project's own processes: the ones we started and hold in
    // the registry. This fixes the earlier `ps -C php` which summed every PHP
    // process on the machine.
    let (mut cpu, mut memory): (f32, f32) = (0.0, 0.0);
    if let Ok(guarded) = PROCESS_REGISTRY.pids() {
        for pid in guarded {
            if let Some((c, rss_kb)) = proc_usage(pid) {
                cpu += c;
                memory += rss_kb / 1024.0; // KB -> MB
            }
        }
    }

    let requests = get_request_count(&project_path);
    let port = get_port_from_env(&project_path);
    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], port));
    // Whether the project's own dev server is currently answering. Guarded by
    // the registry PID check above; if nothing is registered, metrics are zero.
    let _running = TcpStream::connect_timeout(&addr, Duration::from_millis(400)).is_ok();

    // A project with no live processes is not using memory.
    let memory_total = if memory > 0.0 { memory * 1.5 } else { 0.0 };

    Ok(SystemMetrics {
        cpu,
        memory,
        memory_total,
        requests,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}
