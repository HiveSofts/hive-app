use crate::core::database::migrations::Migration;
use rusqlite::{Connection, Result};

pub struct MigrationV6;

impl Migration for MigrationV6 {
    fn version(&self) -> &str {
        "006"
    }

    fn up(&self, conn: &Connection) -> Result<()> {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS tunnel_config (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                key             TEXT NOT NULL UNIQUE,
                value           TEXT NOT NULL,
                updated_at      TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tunnel_sessions (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                project_path    TEXT NOT NULL,
                project_name    TEXT NOT NULL,
                local_url       TEXT NOT NULL,
                public_url      TEXT,
                pid             INTEGER,
                status          TEXT NOT NULL DEFAULT 'connecting',
                started_at      TEXT NOT NULL,
                stopped_at      TEXT,
                error           TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_tunnel_sessions_path
                ON tunnel_sessions(project_path);
            CREATE INDEX IF NOT EXISTS idx_tunnel_sessions_status
                ON tunnel_sessions(status);",
        )
    }
}
