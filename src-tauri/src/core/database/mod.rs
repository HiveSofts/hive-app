pub mod commands;
mod migrations;
pub mod models;

use once_cell::sync::Lazy;
use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

pub use commands::*;
pub use models::*;

/// Opens the app database, falling back to an in-memory connection instead of
/// panicking so the app can still start (degraded) if the DB cannot be opened.
fn open_db() -> Result<Connection> {
    let dir = hive_dir();
    std::fs::create_dir_all(&dir).ok();

    let path = dir.join("Hive.sqlite");
    match Connection::open(&path) {
        Ok(conn) => {
            conn.execute_batch("PRAGMA journal_mode=WAL;")?;
            migrations::run_migrations(&conn)?;
            Ok(conn)
        }
        Err(e) => {
            eprintln!(
                "[hive] failed to open database at {}: {}",
                path.display(),
                e
            );
            eprintln!("[hive] falling back to an in-memory database (state will be lost)");
            let conn = Connection::open_in_memory()?;
            migrations::run_migrations(&conn)?;
            Ok(conn)
        }
    }
}

pub static DB: Lazy<Mutex<Connection>> = Lazy::new(|| {
    match open_db() {
        Ok(conn) => Mutex::new(conn),
        Err(e) => {
            eprintln!("[hive] database unavailable: {}", e);
            // Last resort — the app should never hard-panic on startup.
            Mutex::new(Connection::open_in_memory().expect("in-memory database must open"))
        }
    }
});

fn hive_dir() -> PathBuf {
    crate::modules::common::path::home_dir().join(".hive")
}

/// Lock the shared database connection, returning an error instead of panicking
/// if the mutex has been poisoned (a thread panicked while holding it).
pub fn db() -> rusqlite::Result<MutexGuard<'static, Connection>> {
    DB.lock()
        .map_err(|_| rusqlite::Error::InvalidQuery("database mutex poisoned".into()))
}

// Re-export everything for easy access
pub mod prelude {
    pub use super::commands::*;
    pub use super::models::event::*;
    pub use super::models::server::*;
}
