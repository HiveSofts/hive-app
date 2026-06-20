use super::Migration;
use rusqlite::{Connection, Result};

pub struct MigrationV3;

impl Migration for MigrationV3 {
    fn version(&self) -> &str {
        "003"
    }

    fn up(&self, conn: &Connection) -> Result<()> {
        conn.execute_batch("ALTER TABLE server_processes ADD COLUMN last_activity TEXT;")
    }
}
