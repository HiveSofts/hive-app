use tauri::command;
use crate::types::UserConfig;

#[command]
pub fn complete_onboarding(_config: UserConfig) -> Result<(), String> {
    Ok(())
}

#[command]
pub fn get_onboarding_status() -> Result<bool, String> {
    Ok(false)
}