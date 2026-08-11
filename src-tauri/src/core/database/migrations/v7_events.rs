use super::Migration;
use rusqlite::{Connection, Result};

pub struct MigrationV7;

impl Migration for MigrationV7 {
    fn version(&self) -> &str {
        "007"
    }

    fn up(&self, conn: &Connection) -> Result<()> {
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                level TEXT NOT NULL,
                category TEXT NOT NULL,
                event_key TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                metadata TEXT,
                source TEXT,
                read INTEGER NOT NULL DEFAULT 0,
                trace_id TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_events_level ON events(level);
            CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
            CREATE INDEX IF NOT EXISTS idx_events_read ON events(read);
            CREATE INDEX IF NOT EXISTS idx_events_trace_id ON events(trace_id);
            "#,
        )
    }
}
