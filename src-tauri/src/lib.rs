mod core;
mod modules;
mod types;

pub use core::*;
pub use modules::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Core - Config
            check_user_config_exists,
            get_user_config,
            save_user_config,
            initialize_hive,
            // Core - Onboarding
            complete_onboarding,
            get_onboarding_status,
            // Core - Runtime
            detect_php,
            detect_node,
            get_installed_runtimes,
            install_runtime,
            get_available_links,
            uninstall_runtime,
            // Core - System
            check_and_install_dependencies,
            get_os,
            get_arch,
            kill_process,
            // Core - Storage (Projects)
            list_all_projects,
            remove_project,
            // Modules - Package Managers
            check_package_manager,
            install_package_manager,
            // Modules - Create
            create_laravel_project,
            get_existing_projects,
            create_nextjs_project,
            create_nodejs_project,
            create_php_project,
            create_react_project,
            create_static_project,
            create_vite_project,
            create_vue_project,
            // Modules - WordPress
            create_wordpress_project,
            fetch_wordpress_tags,
            download_wordpress_zip,
            extract_zip,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
