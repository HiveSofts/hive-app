use super::Migration;
use rusqlite::{Connection, Result};

pub struct MigrationV5;

impl Migration for MigrationV5 {
    fn version(&self) -> &str {
        "005"
    }

    fn up(&self, conn: &Connection) -> Result<()> {
        // Check if column exists first
        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM pragma_table_info('server_processes') WHERE name = 'metadata'",
        )?;
        let count: i64 = stmt.query_row([], |row| row.get(0))?;

        if count == 0 {
            conn.execute_batch("ALTER TABLE server_processes ADD COLUMN metadata TEXT;")?;
        }
        Ok(())
    }
}
