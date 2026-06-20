use super::super::DB;
use rusqlite::{params, Result};
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
    let conn = DB.lock().unwrap();
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
    let conn = DB.lock().unwrap();
    conn.execute(
        "UPDATE server_processes SET is_running = 0, last_activity = ?1 WHERE project_path = ?2",
        params![chrono::Utc::now().to_rfc3339(), project_path],
    )?;
    Ok(())
}

pub fn mark_error(project_path: &str) -> Result<()> {
    let conn = DB.lock().unwrap();
    conn.execute(
        "UPDATE server_processes SET error_count = COALESCE(error_count, 0) + 1, last_activity = ?1 WHERE project_path = ?2",
        params![chrono::Utc::now().to_rfc3339(), project_path],
    )?;
    Ok(())
}

pub fn get_server(project_path: &str) -> Result<Option<ServerRecord>> {
    let conn = DB.lock().unwrap();

    // First check if columns exist
    let has_error_count = column_exists(&conn, "server_processes", "error_count")?;
    let has_metadata = column_exists(&conn, "server_processes", "metadata")?;

    let query = if has_error_count && has_metadata {
        "SELECT id, project_path, project_name, project_type, port, pid, url, started_at, is_running,
                session_id, last_activity, error_count, metadata
         FROM server_processes WHERE project_path = ?1"
    } else if has_error_count {
        "SELECT id, project_path, project_name, project_type, port, pid, url, started_at, is_running,
                session_id, last_activity, error_count, NULL as metadata
         FROM server_processes WHERE project_path = ?1"
    } else {
        "SELECT id, project_path, project_name, project_type, port, pid, url, started_at, is_running,
                session_id, last_activity, NULL as error_count, NULL as metadata
         FROM server_processes WHERE project_path = ?1"
    };

    let mut stmt = conn.prepare(query)?;
    let mut rows = stmt.query(params![project_path])?;
    if let Some(row) = rows.next()? {
        Ok(Some(ServerRecord {
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
        }))
    } else {
        Ok(None)
    }
}

fn column_exists(conn: &rusqlite::Connection, table: &str, column: &str) -> Result<bool> {
    let mut stmt = conn.prepare(&format!(
        "SELECT COUNT(*) FROM pragma_table_info('{}') WHERE name = ?1",
        table
    ))?;
    let count: i64 = stmt.query_row(params![column], |row| row.get(0))?;
    Ok(count > 0)
}
pub fn get_all_running_servers() -> Result<Vec<ServerRecord>> {
    let conn = DB.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, project_path, project_name, project_type, port, pid, url, started_at, is_running,
                session_id, last_activity, error_count, metadata
         FROM server_processes WHERE is_running = 1",
    )?;
    let rows = stmt.query_map([], |row| {
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
    })?;
    rows.collect()
}

pub fn delete_server(project_path: &str) -> Result<()> {
    let conn = DB.lock().unwrap();
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
