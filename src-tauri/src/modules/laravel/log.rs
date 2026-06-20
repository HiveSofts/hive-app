use regex::Regex;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::command;

#[derive(Debug, Clone, Serialize)]
pub struct LogEntry {
    pub id: u32,
    pub level: String,
    pub message: String,
    pub context: String,
    pub time: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LogPage {
    pub entries: Vec<LogEntry>,
    pub total: usize,
    pub page: usize,
    pub per_page: usize,
    pub total_pages: usize,
}

fn get_log_file_path(project_path: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join("storage")
        .join("logs")
        .join("laravel.log")
}

fn parse_log_line(line: &str, id: u32) -> Option<LogEntry> {
    // Laravel log format: [2024-01-15 10:30:25] local.ERROR: Message {"context":"value"}
    let re = Regex::new(r"^\[(.*?)\]\s+(\w+)\.(\w+):\s+(.*?)(?:\s+(\{.*\}))?$").unwrap();

    if let Some(caps) = re.captures(line) {
        let date = caps
            .get(1)
            .map(|m| m.as_str().to_string())
            .unwrap_or_default();
        let level = caps
            .get(3)
            .map(|m| m.as_str().to_string())
            .unwrap_or_default();
        let message = caps
            .get(4)
            .map(|m| m.as_str().to_string())
            .unwrap_or_default();
        let context = caps
            .get(5)
            .map(|m| m.as_str().to_string())
            .unwrap_or_default();

        // Extract time from date
        let time = if date.len() >= 16 {
            date[11..16].to_string()
        } else {
            "".to_string()
        };

        return Some(LogEntry {
            id,
            level: level.to_lowercase(),
            message,
            context,
            time,
            date,
        });
    }

    // Fallback: try simpler format
    if let Some((date, rest)) = line.split_once(']') {
        let date = date.trim_start_matches('[').trim();
        let parts: Vec<&str> = rest.split(':').collect();
        if parts.len() >= 2 {
            let level = parts[0].trim().to_lowercase();
            let message = parts[1..].join(":").trim().to_string();
            let time = if date.len() >= 16 {
                date[11..16].to_string()
            } else {
                "".to_string()
            };

            return Some(LogEntry {
                id,
                level: level.split('.').last().unwrap_or(&level).to_string(),
                message,
                context: "".to_string(),
                time,
                date: date.to_string(),
            });
        }
    }

    None
}

#[command]
pub async fn get_project_logs(
    project_path: String,
    page: Option<usize>,
    per_page: Option<usize>,
) -> Result<LogPage, String> {
    let log_path = get_log_file_path(&project_path);

    if !log_path.exists() {
        return Ok(LogPage {
            entries: vec![],
            total: 0,
            page: page.unwrap_or(1),
            per_page: per_page.unwrap_or(50),
            total_pages: 0,
        });
    }

    let content = fs::read_to_string(&log_path).map_err(|e| e.to_string())?;
    let lines: Vec<&str> = content.lines().collect();

    // Parse all lines
    let mut entries: Vec<LogEntry> = Vec::new();
    let mut current_message = String::new();
    let mut current_id = 0;

    for line in lines {
        if line.starts_with('[') && line.contains(']') {
            // New log entry
            if !current_message.is_empty() {
                if let Some(mut entry) = parse_log_line(&current_message, current_id) {
                    // Check if we have multi-line message
                    if entry.message.is_empty() && current_message.contains('\n') {
                        entry.message = current_message
                            .split(']')
                            .nth(2)
                            .unwrap_or(&current_message)
                            .trim()
                            .to_string();
                    }
                    entries.push(entry);
                }
                current_message.clear();
            }
            current_id += 1;
            current_message = line.to_string();
        } else if !line.trim().is_empty() {
            // Continuation of previous log entry
            if !current_message.is_empty() {
                current_message.push('\n');
                current_message.push_str(line);
            }
        }
    }

    // Push the last entry
    if !current_message.is_empty() {
        if let Some(mut entry) = parse_log_line(&current_message, current_id) {
            if entry.message.is_empty() && current_message.contains('\n') {
                entry.message = current_message
                    .split(']')
                    .nth(2)
                    .unwrap_or(&current_message)
                    .trim()
                    .to_string();
            }
            entries.push(entry);
        }
    }

    // Sort by id descending (newest first)
    entries.sort_by(|a, b| b.id.cmp(&a.id));

    let total = entries.len();
    let per_page = per_page.unwrap_or(50);
    let page = page.unwrap_or(1);
    let total_pages = (total + per_page - 1) / per_page;
    let start = (page - 1) * per_page;
    let end = std::cmp::min(start + per_page, total);

    let paged_entries = if start < total {
        entries[start..end].to_vec()
    } else {
        vec![]
    };

    Ok(LogPage {
        entries: paged_entries,
        total,
        page,
        per_page,
        total_pages,
    })
}

#[command]
pub async fn clear_project_logs(project_path: String) -> Result<String, String> {
    let log_path = get_log_file_path(&project_path);
    if log_path.exists() {
        fs::write(&log_path, "").map_err(|e| e.to_string())?;
        Ok("Logs cleared successfully".to_string())
    } else {
        Ok("No log file found".to_string())
    }
}

#[command]
pub async fn tail_project_logs(
    project_path: String,
    lines: Option<usize>,
) -> Result<Vec<String>, String> {
    let log_path = get_log_file_path(&project_path);

    if !log_path.exists() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&log_path).map_err(|e| e.to_string())?;
    let all_lines: Vec<String> = content.lines().map(|l| l.to_string()).collect();

    let take = lines.unwrap_or(50);
    let skip = all_lines.len().saturating_sub(take);
    Ok(all_lines[skip..].to_vec())
}
