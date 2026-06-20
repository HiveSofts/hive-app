mod core;
mod modules;
mod tray;
mod types;

pub use core::*;
pub use modules::*;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let handle = app.handle().clone();
            let _ = tray::setup_tray(&handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_user_config_exists,
            get_user_config,
            save_user_config,
            initialize_hive,
            complete_onboarding,
            get_onboarding_status,
            detect_php,
            detect_node,
            get_installed_runtimes,
            install_runtime,
            get_available_links,
            uninstall_runtime,
            check_and_install_dependencies,
            get_os,
            get_arch,
            kill_process,
            list_all_projects,
            remove_project,
            check_package_manager,
            install_package_manager,
            create_laravel_project,
            get_existing_projects,
            create_nextjs_project,
            create_nodejs_project,
            create_php_project,
            create_react_project,
            create_static_project,
            create_vite_project,
            create_vue_project,
            create_wordpress_project,
            fetch_wordpress_tags,
            download_wordpress_zip,
            extract_zip,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
