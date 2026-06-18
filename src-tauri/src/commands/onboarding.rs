use tauri::command;
use crate::types::UserConfig;

#[command]
pub fn complete_onboarding(config: UserConfig) -> Result<(), String> {
    let mut updated = config;
    updated.onboarding_complete = true;
    crate::commands::config::save_user_config(updated)?;
    Ok(())
}

#[command]
pub fn get_onboarding_status() -> Result<bool, String> {
    match crate::commands::config::get_user_config() {
        Ok(config) => Ok(config.onboarding_complete),
        Err(_) => Ok(false)
    }
}