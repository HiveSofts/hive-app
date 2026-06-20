use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleTaskInfo {
    pub command: String,
    pub expression: String,
    pub next_run: String,
    pub description: String,
    pub timezone: String,
    pub without_overlapping: bool,
    pub in_background: bool,
    pub run_in_maintenance: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleRunResult {
    pub command: String,
    pub success: bool,
    pub output: String,
    pub duration_ms: u64,
}

fn run_artisan(project_path: &str, args: &[&str]) -> Result<(String, String, bool), String> {
    let output = Command::new("php")
        .arg("artisan")
        .args(args)
        .current_dir(project_path)
        .output()
        .map_err(|e| format!("Failed to run artisan: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    Ok((stdout, stderr, output.status.success()))
}

#[command]
pub async fn get_scheduled_tasks(project_path: String) -> Result<Vec<ScheduleTaskInfo>, String> {
    if project_path.is_empty() {
        return Err("Project path is empty".to_string());
    }

    let (stdout, stderr, success) =
        run_artisan(&project_path, &["schedule:list", "--no-ansi", "--json"])?;

    if !success && !stderr.is_empty() {
        return Err(format!("Failed to get scheduled tasks: {}", stderr));
    }

    let json_tasks: Vec<serde_json::Value> =
        serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut tasks: Vec<ScheduleTaskInfo> = Vec::new();

    for task in json_tasks {
        let command = task["command"]
            .as_str()
            .unwrap_or("")
            .trim_start_matches("php artisan ")
            .to_string();

        if command.is_empty() {
            continue;
        }

        let expression = task["expression"].as_str().unwrap_or("").to_string();
        let next_run = task["next_due_date_human"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let description = task["description"].as_str().unwrap_or("").to_string();
        let timezone = task["timezone"].as_str().unwrap_or("UTC").to_string();
        let without_overlapping = task["has_mutex"].as_bool().unwrap_or(false);

        tasks.push(ScheduleTaskInfo {
            command,
            expression,
            next_run,
            description,
            timezone,
            without_overlapping,
            in_background: false,
            run_in_maintenance: false,
        });
    }

    Ok(tasks)
}
#[command]
pub async fn run_scheduled_task(
    project_path: String,
    command: String,
) -> Result<ScheduleRunResult, String> {
    if project_path.is_empty() {
        return Err("Project path is empty".to_string());
    }

    let start = std::time::Instant::now();

    let cmd_parts: Vec<&str> = command.split_whitespace().collect();
    if cmd_parts.is_empty() {
        return Err("Empty command".to_string());
    }

    let (stdout, stderr, success) = run_artisan(&project_path, &cmd_parts)?;
    let duration_ms = start.elapsed().as_millis() as u64;

    Ok(ScheduleRunResult {
        command,
        success,
        output: if stdout.trim().is_empty() {
            stderr
        } else {
            stdout
        },
        duration_ms,
    })
}

#[command]
pub async fn run_all_scheduled_tasks(project_path: String) -> Result<ScheduleRunResult, String> {
    if project_path.is_empty() {
        return Err("Project path is empty".to_string());
    }

    let start = std::time::Instant::now();
    let (stdout, stderr, success) = run_artisan(&project_path, &["schedule:run", "--no-ansi"])?;
    let duration_ms = start.elapsed().as_millis() as u64;

    Ok(ScheduleRunResult {
        command: "schedule:run".to_string(),
        success,
        output: if stdout.trim().is_empty() {
            stderr
        } else {
            stdout
        },
        duration_ms,
    })
}
