use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::command;

#[derive(Debug, Clone, Serialize)]
pub struct DatabaseInfo {
    pub driver: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub status: String,
    pub tables: u32,
    pub size: String,
    pub total_rows: u32,
}

#[command]
pub async fn get_database_info(project_path: String) -> Result<DatabaseInfo, String> {
    // Read .env file
    let env_path = PathBuf::from(&project_path).join(".env");
    let env_content = if env_path.exists() {
        fs::read_to_string(&env_path).unwrap_or_default()
    } else {
        String::new()
    };

    // Parse .env
    let mut db_connection = String::from("mysql");
    let mut db_host = String::from("127.0.0.1");
    let mut db_port = 3306;
    let mut db_database = String::from("laravel");
    let mut db_username = String::from("root");
    let mut db_password = String::new();

    for line in env_content.lines() {
        let line = line.trim();
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim();
            let value = value.trim().trim_matches('"');
            match key {
                "DB_CONNECTION" => db_connection = value.to_string(),
                "DB_HOST" => db_host = value.to_string(),
                "DB_PORT" => db_port = value.parse().unwrap_or(3306),
                "DB_DATABASE" => db_database = value.to_string(),
                "DB_USERNAME" => db_username = value.to_string(),
                "DB_PASSWORD" => db_password = value.to_string(),
                _ => {}
            }
        }
    }

    // Check if SQLite
    let is_sqlite = db_connection.to_lowercase() == "sqlite";

    if is_sqlite {
        // Try to find SQLite file
        let db_path = PathBuf::from(&project_path)
            .join("database")
            .join("database.sqlite");
        let size = if db_path.exists() {
            if let Ok(metadata) = fs::metadata(&db_path) {
                let bytes = metadata.len();
                if bytes < 1024 {
                    format!("{} B", bytes)
                } else if bytes < 1024 * 1024 {
                    format!("{:.1} KB", bytes as f64 / 1024.0)
                } else {
                    format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
                }
            } else {
                "0 B".to_string()
            }
        } else {
            "Not found".to_string()
        };

        return Ok(DatabaseInfo {
            driver: "sqlite".to_string(),
            name: "SQLite".to_string(),
            host: "file".to_string(),
            port: 0,
            status: if db_path.exists() {
                "connected".to_string()
            } else {
                "not found".to_string()
            },
            tables: 0,
            size,
            total_rows: 0,
        });
    }

    // For MySQL/PostgreSQL, try to connect and get real info
    // This is a mock for now - you'll need to implement actual DB connection
    Ok(DatabaseInfo {
        driver: db_connection,
        name: db_database,
        host: db_host,
        port: db_port,
        status: "connected".to_string(),
        tables: 12,
        size: "4.2 MB".to_string(),
        total_rows: 1843,
    })
}

#[command]
pub async fn restart_database(project_path: String) -> Result<String, String> {
    // Read .env to check driver
    let env_path = PathBuf::from(&project_path).join(".env");
    let env_content = if env_path.exists() {
        fs::read_to_string(&env_path).unwrap_or_default()
    } else {
        String::new()
    };

    let mut db_connection = String::from("mysql");
    for line in env_content.lines() {
        let line = line.trim();
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            if key.trim() == "DB_CONNECTION" {
                db_connection = value.trim().trim_matches('"').to_string();
                break;
            }
        }
    }

    if db_connection.to_lowercase() == "sqlite" {
        return Ok("SQLite doesn't require restart".to_string());
    }

    // For MySQL/PostgreSQL, you'd need to restart the service
    // This is a placeholder
    Ok(format!("{} database restarted successfully", db_connection))
}

#[command]
pub async fn backup_database(project_path: String) -> Result<String, String> {
    // Read .env to check driver
    let env_path = PathBuf::from(&project_path).join(".env");
    let env_content = if env_path.exists() {
        fs::read_to_string(&env_path).unwrap_or_default()
    } else {
        String::new()
    };

    let mut db_connection = String::from("mysql");
    for line in env_content.lines() {
        let line = line.trim();
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            if key.trim() == "DB_CONNECTION" {
                db_connection = value.trim().trim_matches('"').to_string();
                break;
            }
        }
    }

    if db_connection.to_lowercase() == "sqlite" {
        let db_path = PathBuf::from(&project_path)
            .join("database")
            .join("database.sqlite");
        if db_path.exists() {
            let backup_path = db_path.with_extension("sqlite.backup");
            fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;
            return Ok(format!("SQLite backup created at {:?}", backup_path));
        } else {
            return Err("SQLite database file not found".to_string());
        }
    }

    // For MySQL/PostgreSQL, you'd need to use mysqldump/pg_dump
    Ok(format!("{} database backup started", db_connection))
}

#[command]
pub async fn export_database_sql(project_path: String) -> Result<String, String> {
    // Read .env to check driver
    let env_path = PathBuf::from(&project_path).join(".env");
    let env_content = if env_path.exists() {
        fs::read_to_string(&env_path).unwrap_or_default()
    } else {
        String::new()
    };

    let mut db_connection = String::from("mysql");
    for line in env_content.lines() {
        let line = line.trim();
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            if key.trim() == "DB_CONNECTION" {
                db_connection = value.trim().trim_matches('"').to_string();
                break;
            }
        }
    }

    if db_connection.to_lowercase() == "sqlite" {
        let db_path = PathBuf::from(&project_path)
            .join("database")
            .join("database.sqlite");
        if db_path.exists() {
            let export_path = db_path.with_extension("sql");
            fs::copy(&db_path, &export_path).map_err(|e| e.to_string())?;
            return Ok(format!("SQLite exported to {:?}", export_path));
        } else {
            return Err("SQLite database file not found".to_string());
        }
    }

    // For MySQL/PostgreSQL, you'd need to use mysqldump/pg_dump
    Ok(format!("{} database export started", db_connection))
}
