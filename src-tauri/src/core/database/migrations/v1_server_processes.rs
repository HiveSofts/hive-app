use super::Migration;
use rusqlite::{Connection, Result};

pub struct MigrationV1;

impl Migration for MigrationV1 {
    fn version(&self) -> &str {
        "001"
    }

    fn up(&self, conn: &Connection) -> Result<()> {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS server_processes (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                project_path    TEXT NOT NULL UNIQUE,
                project_name    TEXT NOT NULL,
                project_type    TEXT NOT NULL DEFAULT 'laravel',
                port            INTEGER NOT NULL,
                pid             INTEGER NOT NULL,
                url             TEXT NOT NULL,
                started_at      TEXT NOT NULL,
                is_running      INTEGER NOT NULL DEFAULT 1
            );
            CREATE INDEX IF NOT EXISTS idx_server_processes_path ON server_processes(project_path);
            CREATE INDEX IF NOT EXISTS idx_server_processes_running ON server_processes(is_running);"
        )
    }
}
