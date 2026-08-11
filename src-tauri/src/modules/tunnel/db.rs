use crate::core::database::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelSession {
    pub id: i64,
    pub project_path: String,
    pub project_name: String,
    pub local_url: String,
    pub public_url: Option<String>,
    pub pid: Option<i64>,
    pub status: String,
    pub started_at: String,
    pub stopped_at: Option<String>,
    pub error: Option<String>,
}

const SESSION_SELECT: &str = "SELECT id, project_path, project_name, local_url, public_url,
                              pid, status, started_at, stopped_at, error
                              FROM tunnel_sessions";

/// Parse a row into a `TunnelSession`. Column order must match `SESSION_SELECT`.
fn row_to_session(row: &rusqlite::Row<'_>) -> rusqlite::Result<TunnelSession> {
    Ok(TunnelSession {
        id: row.get(0)?,
        project_path: row.get(1)?,
        project_name: row.get(2)?,
        local_url: row.get(3)?,
        public_url: row.get(4)?,
        pid: row.get(5)?,
        status: row.get(6)?,
        started_at: row.get(7)?,
        stopped_at: row.get(8)?,
        error: row.get(9)?,
    })
}

fn run_update(sql: &str, params: &[&dyn rusqlite::ToSql]) {
    if let Ok(conn) = db() {
        let _ = conn.execute(sql, params);
    }
}

pub fn tunnel_config_get(key: &str) -> Option<String> {
    let conn = db().ok()?;
    conn.query_row(
        "SELECT value FROM tunnel_config WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )
    .ok()
}

pub fn tunnel_config_set(key: &str, value: &str) {
    let now = chrono::Utc::now().to_rfc3339();
    run_update(
        "INSERT INTO tunnel_config (key, value, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        &[&key, &value, &now],
    );
}

pub fn tunnel_config_delete(key: &str) {
    run_update("DELETE FROM tunnel_config WHERE key = ?1", &[&key]);
}

pub fn tunnel_session_create(
    project_path: &str,
    project_name: &str,
    local_url: &str,
    pid: Option<u32>,
) -> rusqlite::Result<i64> {
    let conn = db()?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO tunnel_sessions
            (project_path, project_name, local_url, pid, status, started_at)
         VALUES (?1, ?2, ?3, ?4, 'connecting', ?5)",
        params![
            project_path,
            project_name,
            local_url,
            pid.map(|p| p as i64),
            now
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn tunnel_session_set_url(id: i64, public_url: &str) {
    run_update(
        "UPDATE tunnel_sessions SET public_url = ?1, status = 'active' WHERE id = ?2",
        &[&public_url, &id],
    );
}

pub fn tunnel_session_set_error(id: i64, error: &str) {
    let now = chrono::Utc::now().to_rfc3339();
    run_update(
        "UPDATE tunnel_sessions SET status = 'error', error = ?1, stopped_at = ?2 WHERE id = ?3",
        &[&error, &now, &id],
    );
}

pub fn tunnel_session_stop(id: i64) {
    let now = chrono::Utc::now().to_rfc3339();
    run_update(
        "UPDATE tunnel_sessions SET status = 'stopped', stopped_at = ?1 WHERE id = ?2",
        &[&now, &id],
    );
}

pub fn tunnel_session_get(id: i64) -> Option<TunnelSession> {
    let conn = db().ok()?;
    conn.query_row(
        &format!("{SESSION_SELECT} WHERE id = ?1"),
        params![id],
        row_to_session,
    )
    .ok()
}

pub fn tunnel_session_get_active(project_path: &str) -> Option<TunnelSession> {
    let conn = db().ok()?;
    conn.query_row(
        &format!(
            "{SESSION_SELECT} WHERE project_path = ?1 AND status IN ('connecting', 'active')
             ORDER BY id DESC LIMIT 1"
        ),
        params![project_path],
        row_to_session,
    )
    .ok()
}

pub fn tunnel_session_get_all_active() -> Vec<TunnelSession> {
    let Ok(conn) = db() else {
        return vec![];
    };
    let Ok(mut stmt) = conn.prepare(&format!(
        "{SESSION_SELECT} WHERE status IN ('connecting', 'active') ORDER BY id DESC"
    )) else {
        return vec![];
    };

    let Ok(rows) = stmt.query_map([], row_to_session) else {
        return vec![];
    };

    rows.filter_map(|r| r.ok()).collect()
}

pub fn tunnel_session_history(limit: usize) -> Vec<TunnelSession> {
    let Ok(conn) = db() else {
        return vec![];
    };
    // Bound the limit so a caller can never trigger an unbounded query.
    let limit = limit.min(10_000);
    let Ok(mut stmt) = conn.prepare(&format!("{SESSION_SELECT} ORDER BY id DESC LIMIT ?1")) else {
        return vec![];
    };

    let Ok(rows) = stmt.query_map(params![limit as i64], row_to_session) else {
        return vec![];
    };

    rows.filter_map(|r| r.ok()).collect()
}
