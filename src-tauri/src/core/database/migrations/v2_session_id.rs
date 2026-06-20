use super::Migration;
use rusqlite::{Connection, Result};

pub struct MigrationV2;

impl Migration for MigrationV2 {
    fn version(&self) -> &str {
        "002"
    }

    fn up(&self, conn: &Connection) -> Result<()> {
        conn.execute_batch(
            "ALTER TABLE server_processes ADD COLUMN session_id TEXT;
            CREATE INDEX IF NOT EXISTS idx_server_processes_session ON server_processes(session_id);"
        )
    }
}
