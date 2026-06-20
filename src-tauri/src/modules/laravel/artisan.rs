use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtisanCommand {
    pub name: String,
    pub description: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtisanCommandResult {
    pub command: String,
    pub output: String,
    pub success: bool,
}

#[command]
pub async fn run_artisan_command(
    project_path: String,
    command: String,
    args: Vec<String>,
) -> Result<ArtisanCommandResult, String> {
    let mut cmd = Command::new("php");
    cmd.current_dir(&project_path);
    cmd.arg("artisan");
    cmd.arg(&command);
    cmd.args(&args);

    let output = cmd.output().map_err(|e| e.to_string())?;

    Ok(ArtisanCommandResult {
        command: format!("php artisan {}", command),
        output: String::from_utf8_lossy(&output.stdout).to_string(),
        success: output.status.success(),
    })
}

#[command]
pub async fn get_artisan_commands() -> Result<Vec<String>, String> {
    Ok(vec![
        "cache:clear".to_string(),
        "config:cache".to_string(),
        "migrate".to_string(),
        "migrate:fresh".to_string(),
        "make:controller".to_string(),
        "make:model".to_string(),
        "route:list".to_string(),
        "queue:work".to_string(),
        "optimize".to_string(),
        "view:cache".to_string(),
        "storage:link".to_string(),
    ])
}

#[command]
pub async fn get_artisan_commands_with_details() -> Result<Vec<ArtisanCommand>, String> {
    Ok(vec![
        ArtisanCommand {
            name: "cache:clear".to_string(),
            description: "Flush the application cache".to_string(),
            category: "cache".to_string(),
        },
        ArtisanCommand {
            name: "config:cache".to_string(),
            description: "Create a cache file for faster configuration loading".to_string(),
            category: "config".to_string(),
        },
        ArtisanCommand {
            name: "migrate".to_string(),
            description: "Run the database migrations".to_string(),
            category: "database".to_string(),
        },
        ArtisanCommand {
            name: "migrate:fresh".to_string(),
            description: "Drop all tables and re-run all migrations".to_string(),
            category: "database".to_string(),
        },
        ArtisanCommand {
            name: "make:controller".to_string(),
            description: "Create a new controller class".to_string(),
            category: "make".to_string(),
        },
        ArtisanCommand {
            name: "make:model".to_string(),
            description: "Create a new Eloquent model class".to_string(),
            category: "make".to_string(),
        },
        ArtisanCommand {
            name: "route:list".to_string(),
            description: "List all registered routes".to_string(),
            category: "route".to_string(),
        },
        ArtisanCommand {
            name: "queue:work".to_string(),
            description: "Start processing jobs on the queue".to_string(),
            category: "queue".to_string(),
        },
    ])
}
