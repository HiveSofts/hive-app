use rusqlite::{Result, params};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: i64,
    pub created_at: String,
    pub level: EventLevel,
    pub category: EventCategory,
    pub event_key: String,
    pub title: String,
    pub message: String,
    pub metadata: Option<Value>,
    pub source: Option<String>,
    pub read: bool,
    pub trace_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EventLevel {
    Info,
    Success,
    Warning,
    Error,
    Debug,
}

impl EventLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Info => "info",
            Self::Success => "success",
            Self::Warning => "warning",
            Self::Error => "error",
            Self::Debug => "debug",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EventCategory {
    System,
    Runtime,
    Docker,
    Project,
    Laravel,
    WordPress,
    NextJs,
    React,
    Vue,
    Vite,
    NodeJs,
    Php,
    Tunnel,
    Database,
    Queue,
    Deploy,
    Onboarding,
}

impl EventCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::System => "system",
            Self::Runtime => "runtime",
            Self::Docker => "docker",
            Self::Project => "project",
            Self::Laravel => "laravel",
            Self::WordPress => "wordpress",
            Self::NextJs => "nextjs",
            Self::React => "react",
            Self::Vue => "vue",
            Self::Vite => "vite",
            Self::NodeJs => "nodejs",
            Self::Php => "php",
            Self::Tunnel => "tunnel",
            Self::Database => "database",
            Self::Queue => "queue",
            Self::Deploy => "deploy",
            Self::Onboarding => "onboarding",
        }
    }
}

impl std::fmt::Display for EventCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

pub struct EventBuilder {
    level: EventLevel,
    category: EventCategory,
    event_key: String,
    title: String,
    message: String,
    metadata: Option<Value>,
    source: Option<String>,
    trace_id: Option<String>,
}

impl EventBuilder {
    pub fn new(level: EventLevel, category: EventCategory, event_key: &str) -> Self {
        Self {
            level,
            category,
            event_key: event_key.to_string(),
            title: String::new(),
            message: String::new(),
            metadata: None,
            source: None,
            trace_id: None,
        }
    }

    pub fn title(mut self, title: &str) -> Self {
        self.title = title.to_string();
        self
    }

    pub fn message(mut self, message: &str) -> Self {
        self.message = message.to_string();
        self
    }

    pub fn metadata(mut self, metadata: Value) -> Self {
        self.metadata = Some(metadata);
        self
    }

    pub fn source(mut self, source: &str) -> Self {
        self.source = Some(source.to_string());
        self
    }

    pub fn trace_id(mut self, trace_id: &str) -> Self {
        self.trace_id = Some(trace_id.to_string());
        self
    }

    pub fn emit(self) -> Result<i64> {
        let conn = super::super::db()?;

        let metadata_json = self.metadata.map(|m| m.to_string());

        conn.execute(
            r#"
            INSERT INTO events (
                level, category, event_key, title, message, metadata, source, trace_id
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            "#,
            params![
                self.level.as_str(),
                self.category.as_str(),
                self.event_key,
                self.title,
                self.message,
                metadata_json,
                self.source,
                self.trace_id,
            ],
        )?;

        Ok(conn.last_insert_rowid())
    }
}

impl Event {
    pub fn log(
        level: EventLevel,
        category: EventCategory,
        event_key: &str,
        title: &str,
        message: &str,
    ) -> Result<i64> {
        EventBuilder::new(level, category, event_key)
            .title(title)
            .message(message)
            .emit()
    }

    pub fn info(
        category: EventCategory,
        event_key: &str,
        title: &str,
        message: &str,
    ) -> Result<i64> {
        Self::log(EventLevel::Info, category, event_key, title, message)
    }

    pub fn success(
        category: EventCategory,
        event_key: &str,
        title: &str,
        message: &str,
    ) -> Result<i64> {
        Self::log(EventLevel::Success, category, event_key, title, message)
    }

    pub fn warning(
        category: EventCategory,
        event_key: &str,
        title: &str,
        message: &str,
    ) -> Result<i64> {
        Self::log(EventLevel::Warning, category, event_key, title, message)
    }

    pub fn error(
        category: EventCategory,
        event_key: &str,
        title: &str,
        message: &str,
    ) -> Result<i64> {
        Self::log(EventLevel::Error, category, event_key, title, message)
    }

    pub fn debug(
        category: EventCategory,
        event_key: &str,
        title: &str,
        message: &str,
    ) -> Result<i64> {
        Self::log(EventLevel::Debug, category, event_key, title, message)
    }

    pub fn builder() -> EventBuilder {
        EventBuilder::new(EventLevel::Info, EventCategory::System, "")
    }

    pub fn get_recent(limit: usize) -> Result<Vec<Event>> {
        let conn = super::super::db()?;
        let mut stmt = conn.prepare(
            "SELECT id, created_at, level, category, event_key, title, message, metadata, source, read, trace_id
             FROM events ORDER BY created_at DESC LIMIT ?1",
        )?;

        let rows = stmt.query_map([limit as i64], |row| {
            Ok(Event {
                id: row.get(0)?,
                created_at: row.get(1)?,
                level: serde_json::from_str(&format!("\"{}\"", row.get::<_, String>(2)?))
                    .unwrap_or(EventLevel::Info),
                category: serde_json::from_str(&format!("\"{}\"", row.get::<_, String>(3)?))
                    .unwrap_or(EventCategory::System),
                event_key: row.get(4)?,
                title: row.get(5)?,
                message: row.get(6)?,
                metadata: row
                    .get::<_, Option<String>>(7)?
                    .and_then(|s| serde_json::from_str(&s).ok()),
                source: row.get(8)?,
                read: row.get::<_, i32>(9)? != 0,
                trace_id: row.get(10)?,
            })
        })?;

        rows.collect()
    }

    pub fn mark_read(id: i64) -> Result<()> {
        let conn = super::super::db()?;
        conn.execute("UPDATE events SET read = 1 WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn mark_all_read() -> Result<()> {
        let conn = super::super::db()?;
        conn.execute("UPDATE events SET read = 1", [])?;
        Ok(())
    }

    pub fn get_unread_count() -> Result<i64> {
        let conn = super::super::db()?;
        let mut stmt = conn.prepare("SELECT COUNT(*) FROM events WHERE read = 0")?;
        stmt.query_row([], |row| row.get(0))
    }

    pub fn delete_older_than(days: i64) -> Result<()> {
        let conn = super::super::db()?;
        conn.execute(
            "DELETE FROM events WHERE created_at < datetime('now', ?1)",
            [&format!("-{} days", days)],
        )?;
        Ok(())
    }
}
