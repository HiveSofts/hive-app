use super::super::db;
use rusqlite::{Result, params};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerRecord {
    pub id: i64,
    pub project_path: String,
    pub project_name: String,
    pub project_type: String,
    pub port: u16,
    pub pid: u32,
    pub url: String,
    pub started_at: String,
    pub is_running: bool,
    pub session_id: Option<String>,
    pub last_activity: Option<String>,
    pub error_count: Option<i64>,
    pub metadata: Option<String>,
}

pub fn upsert_server(
    project_path: &str,
    project_name: &str,
    project_type: &str,
    port: u16,
    pid: u32,
    url: &str,
    started_at: &str,
    session_id: Option<&str>,
) -> Result<()> {
    let conn = db()?;
    conn.execute(
        "INSERT INTO server_processes
            (project_path, project_name, project_type, port, pid, url, started_at, is_running, session_id, last_activity)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9)
         ON CONFLICT(project_path) DO UPDATE SET
            project_name = excluded.project_name,
            project_type = excluded.project_type,
            port         = excluded.port,
            pid          = excluded.pid,
            url          = excluded.url,
            started_at   = excluded.started_at,
            is_running   = 1,
            session_id   = excluded.session_id,
            last_activity = excluded.last_activity",
        params![
            project_path,
            project_name,
            project_type,
            port,
            pid,
            url,
            started_at,
            session_id,
            chrono::Utc::now().to_rfc3339()
        ],
    )?;
    Ok(())
}

pub fn mark_stopped(project_path: &str) -> Result<()> {
    let conn = db()?;
    conn.execute(
        "UPDATE server_processes SET is_running = 0, last_activity = ?1 WHERE project_path = ?2",
        params![chrono::Utc::now().to_rfc3339(), project_path],
    )?;
    Ok(())
}

pub fn mark_error(project_path: &str) -> Result<()> {
    let conn = db()?;
    conn.execute(
        "UPDATE server_processes SET error_count = COALESCE(error_count, 0) + 1, last_activity = ?1 WHERE project_path = ?2",
        params![chrono::Utc::now().to_rfc3339(), project_path],
    )?;
    Ok(())
}

/// Column order shared by every `server_processes` SELECT. The full column set
/// is guaranteed after startup because `open_db()` runs all migrations (v2–v5
/// add `session_id`, `last_activity`, `error_count`, `metadata`) before any
/// query touches this table — hence no runtime schema probing.
const SERVER_COLUMNS: &str = "id, project_path, project_name, project_type, port, pid, url,
        started_at, is_running, session_id, last_activity, error_count, metadata";

fn row_to_server(row: &rusqlite::Row<'_>) -> Result<ServerRecord> {
    Ok(ServerRecord {
        id: row.get(0)?,
        project_path: row.get(1)?,
        project_name: row.get(2)?,
        project_type: row.get(3)?,
        port: row.get::<_, i64>(4)? as u16,
        pid: row.get::<_, u32>(5)?,
        url: row.get(6)?,
        started_at: row.get(7)?,
        is_running: row.get::<_, i32>(8)? != 0,
        session_id: row.get(9)?,
        last_activity: row.get(10)?,
        error_count: row.get(11)?,
        metadata: row.get(12)?,
    })
}

pub fn get_server(project_path: &str) -> Result<Option<ServerRecord>> {
    let conn = db()?;
    let mut stmt = conn.prepare(&format!(
        "SELECT {SERVER_COLUMNS} FROM server_processes WHERE project_path = ?1"
    ))?;
    let mut rows = stmt.query(params![project_path])?;
    match rows.next()? {
        Some(row) => Ok(Some(row_to_server(row)?)),
        None => Ok(None),
    }
}
pub fn get_all_running_servers() -> Result<Vec<ServerRecord>> {
    let conn = db()?;
    let mut stmt = conn.prepare(&format!(
        "SELECT {SERVER_COLUMNS} FROM server_processes WHERE is_running = 1"
    ))?;
    let rows = stmt.query_map([], row_to_server)?;
    rows.collect()
}

pub fn delete_server(project_path: &str) -> Result<()> {
    let conn = db()?;
    conn.execute(
        "DELETE FROM server_processes WHERE project_path = ?1",
        params![project_path],
    )?;
    Ok(())
}

pub fn cleanup_orphaned() {
    if let Ok(servers) = get_all_running_servers() {
        for s in servers {
            if !pid_alive(s.pid) {
                let _ = mark_stopped(&s.project_path);
            }
        }
    }
}

pub fn pid_alive(pid: u32) -> bool {
    #[cfg(unix)]
    {
        unsafe { libc::kill(pid as i32, 0) == 0 }
    }
    #[cfg(windows)]
    {
        use std::process::Command;
        Command::new("tasklist")
            .args(["/FI", &format!("PID eq {}", pid), "/NH"])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains(&pid.to_string()))
            .unwrap_or(false)
    }
}
