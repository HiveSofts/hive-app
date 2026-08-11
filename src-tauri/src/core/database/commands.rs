use crate::core::database::Event;
use tauri::command;

#[command]
pub fn get_events(limit: Option<usize>) -> Result<Vec<Event>, String> {
    let limit = limit.unwrap_or(50);
    Event::get_recent(limit).map_err(|e| format!("Failed to get events: {}", e))
}

#[command]
pub fn get_unread_events_count() -> Result<i64, String> {
    Event::get_unread_count().map_err(|e| format!("Failed to get unread count: {}", e))
}

#[command]
pub fn mark_event_read(id: i64) -> Result<(), String> {
    Event::mark_read(id).map_err(|e| format!("Failed to mark event as read: {}", e))
}

#[command]
pub fn mark_all_events_read() -> Result<(), String> {
    Event::mark_all_read().map_err(|e| format!("Failed to mark all events as read: {}", e))
}

#[command]
pub fn clear_old_events(days: i64) -> Result<(), String> {
    Event::delete_older_than(days).map_err(|e| format!("Failed to clear old events: {}", e))
}
