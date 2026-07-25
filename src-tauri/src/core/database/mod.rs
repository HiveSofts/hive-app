mod migrations;
pub mod models;  
pub mod commands;

use once_cell::sync::Lazy;
use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};

pub use models::*;
pub use commands::*;

pub static DB: Lazy<Mutex<Connection>> = Lazy::new(|| {
    let conn = open_db().expect("Failed to open Hive.sqlite");
    Mutex::new(conn)
});

fn hive_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".hive")
}

fn open_db() -> Result<Connection> {
    let dir = hive_dir();
    std::fs::create_dir_all(&dir).ok();

    let path = dir.join("Hive.sqlite");
    let conn = Connection::open(path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    migrations::run_migrations(&conn)?;

    Ok(conn)
}

pub fn get_connection() -> MutexGuard<'static, Connection> {
    DB.lock().expect("Failed to lock database")
}

// Re-export everything for easy access
pub mod prelude {
    pub use super::models::event::*;
    pub use super::models::server::*;
    pub use super::commands::*;
}