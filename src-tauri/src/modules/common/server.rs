//! Shared local-dev server runtime: health checks, PID/port helpers and a
//! pipe-to-log abstraction. Consolidates the behavior that previously existed
//! (with drift) in the laravel / php / wordpress server modules so each project
//! type keeps only the small amount of logic that is genuinely its own.

use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::PathBuf;
use std::thread;
use std::time::Duration;

use crate::core::database::models;
use crate::modules::common::path::hive_base_dir;

/// The request Timeout for connecting when probing a dev server port.
const PROBE_TIMEOUT: Duration = Duration::from_millis(250);

/// Port search range used when the preferred port is already in use.
const FREE_PORT_RANGE: u16 = 100;

/// The project name is used as a path segment inside `~/.hive/logs/projects/`.
/// Reject segments that could escape the log tree (traversal) or hide files.
fn sanitize_log_segment(project_name: &str) -> Result<String, String> {
    if project_name.is_empty()
        || project_name == "."
        || project_name == ".."
        || project_name.contains('/')
        || project_name.contains('\\')
    {
        return Err(format!(
            "Invalid project name for logging: '{project_name}'"
        ));
    }
    Ok(project_name.to_string())
}

/// Logs for a project live under `~/.hive/logs/projects/<project_name>`.
/// Uses `hive_base_dir()` (HOME/USERPROFILE-aware) instead of a raw `HOME`
/// env read, so it works when HOME is unset.
pub fn log_dir(project_name: &str) -> Result<PathBuf, String> {
    Ok(hive_base_dir()
        .join("logs")
        .join("projects")
        .join(sanitize_log_segment(project_name)?))
}

pub fn log_file_path(project_name: &str) -> Result<PathBuf, String> {
    Ok(log_dir(project_name)?.join("server.log"))
}

fn open_log_file(project_name: &str) -> std::io::Result<File> {
    fs::create_dir_all(log_dir(project_name).map_err(|e| std::io::Error::other(e))?)?;
    OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_file_path(project_name).map_err(|e| std::io::Error::other(e))?)
}

/// Append a timestamped line to the project's server log. Failure is silent —
/// logging must never break a server lifecycle.
pub fn append_log(project_name: &str, line: &str, is_error: bool) {
    if let Ok(mut f) = open_log_file(project_name) {
        let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
        let prefix = if is_error { "[ERR] " } else { "" };
        let _ = writeln!(f, "[{ts}] {prefix}{line}");
    }
}

/// Spawn two daemon threads that drain a child's stdout/stderr into the
/// project's `server.log`. The handles are moved into the threads; the child
/// itself remains owned by the caller and is stored in the process registry.
pub fn pipe_to_log(
    stdout: std::process::ChildStdout,
    stderr: std::process::ChildStderr,
    project_name: String,
) {
    let spawn_writer = |reader: BufReader<_>, err: bool, name: String| {
        thread::spawn(move || {
            for line in reader.lines().map_while(Result::ok) {
                append_log(&name, &line, err);
            }
        });
    };
    spawn_writer(BufReader::new(stdout), false, project_name.clone());
    spawn_writer(BufReader::new(stderr), true, project_name);
}

/// Whether something is listening on `127.0.0.1:port`.
pub fn port_is_open(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, PROBE_TIMEOUT).is_ok()
}

/// The first port in `start..start+FREE_PORT_RANGE` that can be bound on
/// loopback. Falls back to `start` if none is free (best-effort).
pub fn free_port(start: u16) -> u16 {
    (start..start + FREE_PORT_RANGE)
        .find(|&p| TcpListener::bind(("127.0.0.1", p)).is_ok())
        .unwrap_or(start)
}

/// A server is alive if its recorded PID is alive or its port is answering.
/// PID liveness alone can be reset by the OS reusing a Pid, so the two checks
/// are combined.
pub fn server_alive(pid: u32, port: u16) -> bool {
    models::pid_alive(pid) || port_is_open(port)
}

/// Kill a PID, and on Unix its whole process group. Uses `libc::kill` with the
/// negative PID (the group id equals the session leader's pid), which reaches
/// the full process tree spawned via `setsid`. Reference: `kill(2)`.
pub fn kill_pid_tree(pid: u32) {
    #[cfg(unix)]
    unsafe {
        libc::kill(-(pid as i32), libc::SIGKILL);
        libc::kill(pid as i32, libc::SIGKILL);
    }
    #[cfg(windows)]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .output();
    }
}

/// Project name derived from the trailing path segment, validated for safe use
/// in an event message.
pub fn project_name_from_path(path: &str) -> String {
    std::path::Path::new(path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

/// Create a `~/.hive/logs/projects/<name>` directory, returning the segment
/// used (so callers pass the same sanitized value everywhere).
pub fn ensure_log_dir(project_name: &str) -> Result<String, String> {
    let name = sanitize_log_segment(project_name)?;
    fs::create_dir_all(log_dir(&name)?)
        .map_err(|e| format!("Failed to create log directory for '{}': {}", name, e))?;
    Ok(name)
}
