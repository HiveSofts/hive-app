use crate::core::config::save_user_config;
use crate::types::UserConfig;

#[tauri::command]
pub fn complete_onboarding(config: UserConfig) -> Result<(), String> {
    let mut updated = config;
    updated.onboarding_complete = true;
    save_user_config(updated)?;
    Ok(())
}

#[tauri::command]
pub fn get_onboarding_status() -> Result<bool, String> {
    match crate::core::config::get_user_config() {
        Ok(config) => Ok(config.onboarding_complete),
        Err(_) => Ok(false),
    }
}
