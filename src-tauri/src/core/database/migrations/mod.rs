use rusqlite::{params, Connection, Result};

mod v1_server_processes;
mod v2_session_id;
mod v3_last_activity;
mod v4_error_count;
mod v5_metadata;

pub trait Migration {
    fn version(&self) -> &str;
    fn up(&self, conn: &Connection) -> Result<()>;
}

pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS migrations (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            version     TEXT NOT NULL UNIQUE,
            name        TEXT NOT NULL,
            applied_at  TEXT NOT NULL
        );",
    )?;

    let migrations: Vec<Box<dyn Migration>> = vec![
        Box::new(v1_server_processes::MigrationV1),
        Box::new(v2_session_id::MigrationV2),
        Box::new(v3_last_activity::MigrationV3),
        Box::new(v4_error_count::MigrationV4),
        Box::new(v5_metadata::MigrationV5),
    ];

    for migration in migrations {
        if !is_applied(conn, migration.version())? {
            println!("Applying migration: {}", migration.version());
            migration.up(conn)?;
            mark_applied(conn, migration.version(), migration.version())?;
        }
    }

    Ok(())
}

fn is_applied(conn: &Connection, version: &str) -> Result<bool> {
    let mut stmt = conn.prepare("SELECT COUNT(*) FROM migrations WHERE version = ?1")?;
    let count: i64 = stmt.query_row(params![version], |row| row.get(0))?;
    Ok(count > 0)
}

fn mark_applied(conn: &Connection, version: &str, name: &str) -> Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO migrations (version, name, applied_at) VALUES (?1, ?2, ?3)",
        params![version, name, now],
    )?;
    Ok(())
}
