#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod types;
use commands::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            check_user_config_exists,
            get_user_config,
            save_user_config,
            complete_onboarding,
            get_onboarding_status,
            create_laravel_project,
            get_existing_projects,
            detect_php,
            detect_node,
            get_installed_runtimes,
            download_and_extract,
            get_os,
            get_arch,
            check_and_install_dependencies,
            install_runtime,
            get_available_links,
            uninstall_runtime,
            initialize_hive,
            kill_process,
            check_package_manager,
            install_package_manager,
            create_nextjs_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
