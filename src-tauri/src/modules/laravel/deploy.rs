// src-tauri/src/modules/laravel/deploy.rs
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeployConfig {
    pub host: String,
    pub user: String,
    pub path: String,
    pub repo: String,
    pub key_path: String,
    pub php_version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DeployResult {
    pub success: bool,
    pub output: Vec<String>,
    pub duration: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeployPhpContent {
    pub content: String,
    pub path: String,
}

fn get_hive_bin_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".hive").join("bin")
}

fn get_composer_path() -> PathBuf {
    get_hive_bin_dir().join("composer")
}

fn get_deploy_php_path(project_path: &str) -> PathBuf {
    PathBuf::from(project_path).join("deploy.php")
}

fn generate_default_deploy_php(config: &DeployConfig) -> String {
    let php_version = config.php_version.as_deref().unwrap_or("8.3");

    format!(
        r#"<?php

namespace Deployer;

require 'recipe/laravel.php';

// ============================================
// REPOSITORY
// ============================================
set('repository', '{}');
set('git_tty', false);
set('keep_releases', 10);

// ============================================
// SHARED FILES & DIRS
// ============================================
set('shared_files', ['.env']);
set('shared_dirs', ['storage']);

// ============================================
// WRITABLE PERMISSIONS
// ============================================
set('writable_mode', 'chmod');
set('writable_chmod_mode', '0775');
set('writable_chmod_recursive', true);
set('writable_dirs', ['storage', 'bootstrap/cache']);

// ============================================
// HOSTS
// ============================================
host('{}')
    ->set('hostname', '{}')
    ->set('remote_user', '{}')
    ->set('deploy_path', '{}');

// ============================================
// CUSTOM TASKS
// ============================================

task('deploy:update_code', function () {{
    $releasePath = get('release_path');
    $repoUrl = get('repository');
    
    run("mkdir -p $releasePath");
    run("cd $releasePath && curl -L -o release.zip \"$repoUrl\"");
    run("cd $releasePath && unzip -q -o release.zip");
    run("cd $releasePath && mv -f *-main/* . 2>/dev/null || mv -f *-*/* . 2>/dev/null || true");
    run("cd $releasePath && rm -f release.zip");
    run("cd $releasePath && rm -rf *-main *-* 2>/dev/null || true");
    run("cd $releasePath && mkdir -p storage/framework/{{sessions,views,cache}} storage/logs");
    run("cd $releasePath && mkdir -p bootstrap/cache");
}});

task('setup:env', function () {{
    $sharedEnvPath = '{{deploy_path}}/shared/.env';
    $releaseEnvPath = '{{release_path}}/.env';
    
    if (! test("[ -f $sharedEnvPath ]")) {{
        run("cp {{release_path}}/.env.pro $sharedEnvPath 2>/dev/null || cp {{release_path}}/.env.example $sharedEnvPath");
    }}
    run("ln -sfn $sharedEnvPath $releaseEnvPath");
}});

task('reload:services', function () {{
    run('sudo systemctl reload nginx || true');
    run('sudo systemctl reload php{}-fpm || true');
    run('sudo supervisorctl reread');
    run('sudo supervisorctl update');
    run('sudo supervisorctl restart laravel-worker:* 2>/dev/null || true');
}});

task('deploy:writable', function () {{
    $dirs = implode(' ', get('writable_dirs'));
    $mode = get('writable_chmod_mode');
    $releasePath = get('release_path');
    
    run("cd $releasePath && sudo chown -R www-data:www-data $dirs");
    run("cd $releasePath && sudo find $dirs -type d -exec chmod $mode {{}} \\;");
    run("cd $releasePath && sudo find $dirs -type f -exec chmod 664 {{}} \\;");
}});

task('artisan:optimize', function () {{
    run('cd {{release_path}} && php artisan optimize 2>/dev/null || true');
}});

task('artisan:view:cache', function () {{
    run('cd {{release_path}} && php artisan view:cache 2>/dev/null || true');
}});

task('artisan:config:cache', function () {{
    run('cd {{release_path}} && php artisan config:cache');
}});

task('artisan:route:cache', function () {{
    run('cd {{release_path}} && php artisan route:cache 2>/dev/null || true');
}});

task('artisan:migrate', function () {{
    run('cd {{release_path}} && php artisan migrate --force');
}});

// ============================================
// DEPLOY FLOW
// ============================================
task('deploy', [
    'deploy:prepare',
    'deploy:update_code',
    'setup:env',
    'deploy:shared',
    'deploy:vendors',
    'deploy:writable',
    'artisan:storage:link',
    'artisan:config:cache',
    'artisan:route:cache',
    'artisan:view:cache',
    'deploy:symlink',
    'artisan:optimize',
    'reload:services',
    'deploy:cleanup',
]);

after('deploy:failed', 'deploy:unlock');

// ============================================
// ROLLBACK
// ============================================
task('rollback:deploy', [
    'deploy:rollback',
])->desc('Rollback to previous release');

// ============================================
// UNLOCK
// ============================================
task('deploy:unlock', function () {{
    run('cd {{deploy_path}} && rm -f .dep/deploy.lock');
}})->desc('Unlock deployment');
"#,
        config.repo, config.host, config.host, config.user, config.path, php_version
    )
}

#[command]
pub async fn check_deployer_installed() -> Result<bool, String> {
    let composer_path = get_composer_path();
    if !composer_path.exists() {
        return Ok(false);
    }

    let output = Command::new(&composer_path)
        .arg("global")
        .arg("show")
        .arg("deployer/deployer")
        .output()
        .map_err(|e| e.to_string())?;

    Ok(output.status.success())
}

#[command]
pub async fn install_deployer() -> Result<String, String> {
    let composer_path = get_composer_path();
    if !composer_path.exists() {
        return Err("Composer not found in Hive bin directory".to_string());
    }

    let output = Command::new(&composer_path)
        .arg("global")
        .arg("require")
        .arg("deployer/deployer")
        .arg("--dev")
        .arg("--no-interaction")
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok("Deployer installed successfully".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to install Deployer: {}", stderr))
    }
}

#[command]
pub async fn get_deploy_php_content(project_path: String) -> Result<DeployPhpContent, String> {
    let deploy_php_path = get_deploy_php_path(&project_path);

    if deploy_php_path.exists() {
        let content = fs::read_to_string(&deploy_php_path).map_err(|e| e.to_string())?;
        Ok(DeployPhpContent {
            content,
            path: deploy_php_path.to_string_lossy().to_string(),
        })
    } else {
        let config = get_deploy_config(project_path.clone()).await?;
        let default_content = generate_default_deploy_php(&config);
        // Save default content to file
        fs::write(&deploy_php_path, &default_content).map_err(|e| e.to_string())?;
        Ok(DeployPhpContent {
            content: default_content,
            path: deploy_php_path.to_string_lossy().to_string(),
        })
    }
}

#[command]
pub async fn save_deploy_php_content(
    project_path: String,
    content: String,
) -> Result<String, String> {
    let deploy_php_path = get_deploy_php_path(&project_path);

    // Ensure parent directory exists
    if let Some(parent) = deploy_php_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Write the content to file
    fs::write(&deploy_php_path, content).map_err(|e| e.to_string())?;

    // Verify the file was written
    if deploy_php_path.exists() {
        Ok("deploy.php saved successfully".to_string())
    } else {
        Err("Failed to save deploy.php".to_string())
    }
}

#[command]
pub async fn create_deploy_php(project_path: String) -> Result<String, String> {
    let deploy_php_path = get_deploy_php_path(&project_path);

    if deploy_php_path.exists() {
        return Ok("deploy.php already exists".to_string());
    }

    let config = get_deploy_config(project_path.clone()).await?;
    let content = generate_default_deploy_php(&config);

    fs::write(&deploy_php_path, content).map_err(|e| e.to_string())?;
    Ok("deploy.php created successfully".to_string())
}

#[command]
pub async fn run_deployment_action(
    project_path: String,
    config: DeployConfig,
    action: Option<String>,
) -> Result<DeployResult, String> {
    let composer_path = get_composer_path();

    // Check if deploy.php exists, if not create it
    let deploy_php_path = get_deploy_php_path(&project_path);
    if !deploy_php_path.exists() {
        let content = generate_default_deploy_php(&config);
        fs::write(&deploy_php_path, content).map_err(|e| e.to_string())?;
    }

    // Check if deployer is installed
    let check = Command::new(&composer_path)
        .arg("global")
        .arg("show")
        .arg("deployer/deployer")
        .output()
        .map_err(|e| e.to_string())?;

    if !check.status.success() {
        return Err("Deployer is not installed. Please install it first.".to_string());
    }

    let action_name = action.as_deref().unwrap_or("deploy");

    // Run deployment
    let start = std::time::Instant::now();

    let output = Command::new(&composer_path)
        .arg("global")
        .arg("exec")
        .arg("dep")
        .arg(action_name)
        .arg("--no-interaction")
        .current_dir(&project_path)
        .output()
        .map_err(|e| e.to_string())?;

    let duration = start.elapsed().as_secs_f32();

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    let output_lines: Vec<String> = stdout
        .lines()
        .chain(stderr.lines())
        .filter(|l| !l.is_empty())
        .map(|l| l.to_string())
        .collect();

    Ok(DeployResult {
        success: output.status.success(),
        output: output_lines,
        duration,
    })
}

#[command]
pub async fn run_deployment(
    project_path: String,
    config: DeployConfig,
) -> Result<DeployResult, String> {
    run_deployment_action(project_path, config, None).await
}

#[command]
pub async fn run_deploy_rollback(
    project_path: String,
    config: DeployConfig,
) -> Result<DeployResult, String> {
    run_deployment_action(project_path, config, Some("rollback:deploy".to_string())).await
}

#[command]
pub async fn run_deploy_unlock(
    project_path: String,
    config: DeployConfig,
) -> Result<DeployResult, String> {
    run_deployment_action(project_path, config, Some("deploy:unlock".to_string())).await
}

#[command]
pub async fn get_deploy_config(project_path: String) -> Result<DeployConfig, String> {
    let config_path = PathBuf::from(&project_path).join(".hive/deploy.json");
    if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        let config: DeployConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        return Ok(config);
    }

    Ok(DeployConfig {
        host: "your-server-ip".to_string(),
        user: "deployer".to_string(),
        path: "/home/deployer/apps/my-app".to_string(),
        repo: "git@github.com:user/repo.git".to_string(),
        key_path: "~/.ssh/id_rsa".to_string(),
        php_version: Some("8.3".to_string()),
    })
}

#[command]
pub async fn save_deploy_config(
    project_path: String,
    config: DeployConfig,
) -> Result<String, String> {
    let hive_dir = PathBuf::from(&project_path).join(".hive");
    fs::create_dir_all(&hive_dir).map_err(|e| e.to_string())?;

    let config_path = hive_dir.join("deploy.json");
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&config_path, content).map_err(|e| e.to_string())?;

    Ok("Deploy configuration saved successfully".to_string())
}
