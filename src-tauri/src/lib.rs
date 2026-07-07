mod core;
mod modules;
mod tray;
mod types;

pub use core::*;
pub use modules::*;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    modules::laravel::cleanup_orphaned_servers();

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
            // Core
            check_user_config_exists,
            get_user_config,
            save_user_config,
            initialize_hive,
            complete_onboarding,
            get_onboarding_status,
            // Runtime
            detect_php,
            detect_node,
            get_installed_runtimes,
            install_runtime,
            get_available_links,
            uninstall_runtime,
            // System
            check_and_install_dependencies,
            get_os,
            get_arch,
            kill_process,
            execute_shell_command,
            execute_shell_streaming,
            check_command_exists,
            // Projects
            list_all_projects,
            remove_project,
            get_existing_projects,
            // Package Managers
            check_package_manager,
            install_package_manager,
            // Create Projects
            create_laravel_project,
            create_nextjs_project,
            create_nodejs_project,
            create_php_project,
            create_react_project,
            create_static_project,
            create_vite_project,
            create_vue_project,
            create_wordpress_project,
            // WordPress
            fetch_wordpress_tags,
            download_wordpress_zip,
            extract_zip,
            // WordPress Server
            start_wordpress_project,
            stop_wordpress_project,
            restart_wordpress_project,
            get_wordpress_server_status,
            // WordPress Content
            get_wordpress_plugins,
            get_wordpress_themes,
            get_wordpress_logs,
            // Laravel Server
            start_laravel_project,
            stop_laravel_project,
            restart_laravel_project,
            is_laravel_running,
            get_laravel_server_status,
            get_all_running_servers,
            get_server_logs,
            clear_server_logs,
            // PHP Server
            start_php_project,
            stop_php_project,
            restart_php_project,
            get_php_server_status,
            // PHP Info
            get_php_info,            // Laravel Commands
            run_artisan_command,
            get_artisan_commands,
            get_artisan_commands_with_details,
            // Queue
            get_queue_workers,
            get_queue_stats,
            get_queue_connection_info,
            get_queue_worker_logs,
            start_queue_worker,
            stop_queue_worker,
            restart_queue_worker,
            run_queue_command,
            get_failed_jobs,
            retry_failed_job,
            retry_all_failed_jobs,
            forget_failed_job,
            flush_failed_jobs,
            clear_queue,
            pause_queue,
            resume_queue,
            // Scheduled Tasks
            get_scheduled_tasks,
            run_scheduled_task,
            run_all_scheduled_tasks,
            // Logs
            get_project_logs,
            clear_project_logs,
            tail_project_logs,
            // Packages
            get_installed_packages,
            install_package,
            remove_package,
            update_package,
            search_packages,
            get_package_details,
            // Database
            get_database_info,
            restart_database,
            backup_database,
            export_database_sql,
            // Laravel Deploy
            check_deployer_installed,
            install_deployer,
            run_deployment,
            run_deploy_rollback,
            run_deploy_unlock,
            get_deploy_config,
            save_deploy_config,
            get_deploy_php_content,
            save_deploy_php_content,
            create_deploy_php,
            // Laravel Metrics
            get_system_metrics,
            // Laravel Readme
            read_project_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
