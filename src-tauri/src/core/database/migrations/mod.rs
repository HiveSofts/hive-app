use rusqlite::{Connection, Result};

pub trait Migration {
    fn version(&self) -> &str;
    fn up(&self, conn: &Connection) -> Result<()>;
}

mod v1_server_processes;
mod v2_session_id;
mod v3_last_activity;
mod v4_error_count;
mod v5_metadata;
mod v6_tunnel;
mod v7_events;

pub use v1_server_processes::MigrationV1;
pub use v2_session_id::MigrationV2;
pub use v3_last_activity::MigrationV3;
pub use v4_error_count::MigrationV4;
pub use v5_metadata::MigrationV5;
pub use v6_tunnel::MigrationV6;
pub use v7_events::MigrationV7;

pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS migrations (
            version TEXT PRIMARY KEY,
            name TEXT,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        "#,
    )?;

    let migrations: Vec<Box<dyn Migration>> = vec![
        Box::new(MigrationV1),
        Box::new(MigrationV2),
        Box::new(MigrationV3),
        Box::new(MigrationV4),
        Box::new(MigrationV5),
        Box::new(MigrationV6),
        Box::new(MigrationV7),
    ];

    for migration in migrations {
        let version = migration.version();

        let applied: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM migrations WHERE version = ?1)",
            [version],
            |row| row.get(0),
        )?;

        if applied {
            continue;
        }

        println!("Applying migration {}", version);

        migration.up(conn)?;

        conn.execute(
            r#"
            INSERT INTO migrations (
                version,
                name,
                applied_at
            )
            VALUES (
                ?1,
                ?2,
                datetime('now')
            )
            "#,
            [version, &format!("Migration {}", version)],
        )?;
    }

    Ok(())
}