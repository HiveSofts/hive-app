#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod types;
use commands::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // User Config
            check_user_config_exists,
            get_user_config,
            save_user_config,
            complete_onboarding,
            get_onboarding_status,
            
            // Project Creation - Existing
            create_laravel_project,
            get_existing_projects,
            
            // WordPress Project Creation
            create_wordpress_project,
            fetch_wordpress_tags,
            download_wordpress_zip,
            extract_zip,
            
            // Runtime Detection
            detect_php,
            detect_node,
            get_installed_runtimes,
            
            // OS & Architecture
            get_os,
            get_arch,
            
            // Dependencies & Runtimes
            check_and_install_dependencies,
            install_runtime,
            get_available_links,
            uninstall_runtime,
            
            // Hive Initialization
            initialize_hive,
            
            // Process Management
            kill_process,
            
            // Package Managers
            check_package_manager,
            install_package_manager,
            
            // Project Creation - Others
            create_nextjs_project,
            create_nodejs_project,
            create_php_project,
            create_react_project,
            create_static_project,
            create_vite_project,
            create_vue_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}