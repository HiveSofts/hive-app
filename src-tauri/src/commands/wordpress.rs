use serde::{Deserialize, Serialize};
use std::env::home_dir;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;
use reqwest::Client;
use zip::ZipArchive;
use rand::Rng;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordPressProject {
    pub name: String,
    pub path: String,
    pub description: String,
    pub config: WordPressConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordPressConfig {
    pub port: u16,
    pub host: String,
    pub version: String,
    pub database: DatabaseConfig,
    pub site: SiteConfig,
    pub admin: AdminConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub driver: String,
    pub host: String,
    pub port: u16,
    pub name: String,
    pub user: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiteConfig {
    pub title: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminConfig {
    pub user: String,
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWordPressRequest {
    pub name: String,
    pub description: Option<String>,
    pub source_type: String,
    pub version: String,
    pub github_repo: Option<String>,
    pub github_branch: Option<String>,
    pub github_zip_url: Option<String>,
    pub db_driver: String,
    pub db_host: String,
    pub db_port: u16,
    pub db_name: String,
    pub db_user: String,
    pub db_password: String,
    pub site_title: String,
    pub site_url: String,
    pub admin_user: String,
    pub admin_password: Option<String>,
    pub admin_email: String,
    pub wp_path: Option<String>,
    pub port: u16,
    pub host: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordPressResponse {
    pub success: bool,
    pub message: String,
    pub project: Option<WordPressProject>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubTag {
    pub name: String,
    pub zipball_url: String,
    pub tarball_url: String,
}

const GITHUB_API: &str = "https://api.github.com/repos/WordPress/WordPress";

#[tauri::command]
pub async fn create_wordpress_project(
    _app: AppHandle,
    request: CreateWordPressRequest,
) -> Result<WordPressResponse, String> {
    let projects_dir = get_projects_dir();
    let project_path = projects_dir.join(&request.name);

    if project_path.exists() {
        return Ok(WordPressResponse {
            success: false,
            message: "Project already exists".to_string(),
            project: None,
            error: Some(format!("Directory {} already exists", project_path.display())),
        });
    }

    if let Err(e) = fs::create_dir_all(&project_path) {
        return Err(format!("Failed to create directory: {}", e));
    }

    let result = match request.source_type.as_str() {
        "wordpress_org" => download_from_wordpress_org(&project_path, &request).await,
        "github_clone" => clone_from_github(&project_path, &request).await,
        "github_zip" => download_from_github_zip(&project_path, &request).await,
        _ => Err("Invalid source type".to_string()),
    };

    if let Err(e) = result {
        let _ = fs::remove_dir_all(&project_path);
        return Ok(WordPressResponse {
            success: false,
            message: "Failed to create project".to_string(),
            project: None,
            error: Some(e),
        });
    }

    if let Err(e) = generate_wp_config(&project_path, &request) {
        return Ok(WordPressResponse {
            success: false,
            message: "Failed to generate wp-config.php".to_string(),
            project: None,
            error: Some(e),
        });
    }

    if let Err(e) = generate_env_file(&project_path, &request) {
        return Ok(WordPressResponse {
            success: false,
            message: "Failed to generate .env file".to_string(),
            project: None,
            error: Some(e),
        });
    }

    let project = WordPressProject {
        name: request.name.clone(),
        path: project_path.to_string_lossy().to_string(),
        description: request.description.unwrap_or_else(|| {
            format!("WordPress {} site", request.version)
        }),
        config: WordPressConfig {
            port: request.port,
            host: request.host.clone(),
            version: request.version.clone(),
            database: DatabaseConfig {
                driver: request.db_driver.clone(),
                host: request.db_host.clone(),
                port: request.db_port,
                name: request.db_name.clone(),
                user: request.db_user.clone(),
            },
            site: SiteConfig {
                title: request.site_title.clone(),
                url: request.site_url.clone(),
            },
            admin: AdminConfig {
                user: request.admin_user.clone(),
                email: request.admin_email.clone(),
            },
        },
    };

    if let Err(e) = save_project_metadata(&project_path, &project) {
        return Ok(WordPressResponse {
            success: false,
            message: "Failed to save metadata".to_string(),
            project: None,
            error: Some(e),
        });
    }

    Ok(WordPressResponse {
        success: true,
        message: "WordPress site created successfully".to_string(),
        project: Some(project),
        error: None,
    })
}

#[tauri::command]
pub async fn fetch_wordpress_tags() -> Result<Vec<GitHubTag>, String> {
    let client = Client::new();
    let url = format!("{}/tags?per_page=100", GITHUB_API);
    
    let response = client
        .get(&url)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2026-03-10")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch tags: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("GitHub API error: {}", response.status()));
    }

    let tags: Vec<GitHubTag> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(tags)
}

#[tauri::command]
pub async fn download_wordpress_zip(
    _app: AppHandle,
    url: String,
    path: String,
) -> Result<(), String> {
    let client = Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to download: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let file_path = Path::new(&path);
    let parent = file_path.parent().ok_or("Invalid path")?;
    fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;

    fs::write(file_path, bytes).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn extract_zip(
    _app: AppHandle,
    zip_path: String,
    extract_to: String,
) -> Result<(), String> {
    let file = fs::File::open(&zip_path).map_err(|e| format!("Failed to open zip: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Failed to read zip: {}", e))?;

    let extract_path = Path::new(&extract_to);

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read entry {}: {}", i, e))?;

        let out_path = extract_path.join(file.name());

        if file.is_dir() {
            fs::create_dir_all(&out_path)
                .map_err(|e| format!("Failed to create dir {}: {}", out_path.display(), e))?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent dir {}: {}", parent.display(), e))?;
            }

            let mut out_file = fs::File::create(&out_path)
                .map_err(|e| format!("Failed to create file {}: {}", out_path.display(), e))?;

            std::io::copy(&mut file, &mut out_file)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }

    Ok(())
}

async fn download_from_wordpress_org(
    project_path: &Path,
    request: &CreateWordPressRequest,
) -> Result<(), String> {
    let version = if request.version == "latest" {
        "".to_string()
    } else {
        format!("wordpress-{}", request.version)
    };

    let url = if version.is_empty() {
        "https://wordpress.org/latest.zip".to_string()
    } else {
        format!("https://wordpress.org/{}.zip", version)
    };

    download_and_extract_wordpress(project_path, &url).await
}

async fn clone_from_github(
    project_path: &Path,
    request: &CreateWordPressRequest,
) -> Result<(), String> {
    let repo = request
        .github_repo
        .clone()
        .unwrap_or_else(|| "https://github.com/WordPress/WordPress".to_string());

    let mut cmd = Command::new("git");
    cmd.arg("clone");

    if let Some(branch) = &request.github_branch {
        if !branch.is_empty() {
            cmd.arg("--branch").arg(branch);
        }
    }

    cmd.arg(&repo).arg(project_path);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute git clone: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git clone failed: {}", stderr));
    }

    Ok(())
}

async fn download_from_github_zip(
    project_path: &Path,
    request: &CreateWordPressRequest,
) -> Result<(), String> {
    let url = if let Some(custom_url) = &request.github_zip_url {
        if !custom_url.is_empty() {
            custom_url.clone()
        } else {
            get_github_zip_url(&request.version).await?
        }
    } else {
        get_github_zip_url(&request.version).await?
    };

    download_and_extract_wordpress(project_path, &url).await
}

async fn get_github_zip_url(version: &str) -> Result<String, String> {
    let tags = fetch_wordpress_tags().await?;
    
    if version == "latest" {
        if let Some(tag) = tags.first() {
            return Ok(tag.zipball_url.clone());
        }
        return Err("No tags found".to_string());
    }

    if let Some(tag) = tags.iter().find(|t| t.name == version) {
        return Ok(tag.zipball_url.clone());
    }

    Err(format!("Version {} not found", version))
}

async fn download_and_extract_wordpress(
    project_path: &Path,
    url: &str,
) -> Result<(), String> {
    let zip_name = "wordpress.zip";
    let zip_path = project_path.join(zip_name);

    let client = Client::new();
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to download: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    fs::write(&zip_path, &bytes)
        .map_err(|e| format!("Failed to write zip: {}", e))?;

    let file = fs::File::open(&zip_path)
        .map_err(|e| format!("Failed to open zip: {}", e))?;
    
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("Failed to read zip: {}", e))?;

    let mut root_dir = String::new();
    let mut is_first = true;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read entry {}: {}", i, e))?;

        let name = file.name().to_string();
        
        if is_first {
            if let Some(first_part) = name.split('/').next() {
                root_dir = first_part.to_string();
            }
            is_first = false;
        }

        let out_path = if let Some(stripped) = name.strip_prefix(&format!("{}/", root_dir)) {
            project_path.join(stripped)
        } else {
            continue;
        };

        if file.is_dir() {
            fs::create_dir_all(&out_path)
                .map_err(|e| format!("Failed to create dir {}: {}", out_path.display(), e))?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent dir {}: {}", parent.display(), e))?;
            }

            let mut out_file = fs::File::create(&out_path)
                .map_err(|e| format!("Failed to create file {}: {}", out_path.display(), e))?;

            std::io::copy(&mut file, &mut out_file)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }

    fs::remove_file(&zip_path)
        .map_err(|e| format!("Failed to remove zip: {}", e))?;

    Ok(())
}

fn generate_wp_config(
    project_path: &Path,
    request: &CreateWordPressRequest,
) -> Result<(), String> {
    let db_password = if request.db_password.is_empty() {
        generate_secure_password()
    } else {
        request.db_password.clone()
    };

    let salt_keys = generate_salts();

    let config_content = format!(
        r#"<?php
/**
 * WordPress configuration generated by Hive
 */

// Database settings
define('DB_NAME', '{}');
define('DB_USER', '{}');
define('DB_PASSWORD', '{}');
define('DB_HOST', '{}:{}');
define('DB_CHARSET', 'utf8');
define('DB_COLLATE', '');

// Authentication salts
{}

// Table prefix
$table_prefix = 'wp_';

// Development settings
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);

// Site URL
define('WP_HOME', '{}');
define('WP_SITEURL', '{}');

// Admin email
define('ADMIN_EMAIL', '{}');

// Disable automatic updates
define('AUTOMATIC_UPDATER_DISABLED', true);

// Increase memory limit
define('WP_MEMORY_LIMIT', '256M');
define('WP_MAX_MEMORY_LIMIT', '512M');

// Abort
if (!defined('ABSPATH')) {{
    define('ABSPATH', __DIR__ . '/');
}}

// Include settings
require_once ABSPATH . 'wp-settings.php';
"#,
        request.db_name,
        request.db_user,
        db_password,
        request.db_host,
        request.db_port,
        salt_keys,
        request.site_url,
        request.site_url,
        request.admin_email
    );

    let config_path = project_path.join("wp-config.php");
    fs::write(&config_path, config_content)
        .map_err(|e| format!("Failed to write wp-config.php: {}", e))?;

    Ok(())
}

fn generate_env_file(
    project_path: &Path,
    request: &CreateWordPressRequest,
) -> Result<(), String> {
    let admin_password = request
        .admin_password
        .clone()
        .unwrap_or_else(generate_secure_password);

    let env_content = format!(
        r#"# WordPress Environment Configuration
PROJECT_NAME={}
WP_VERSION={}
WP_HOME={}
WP_SITEURL={}
DB_NAME={}
DB_USER={}
DB_PASSWORD={}
DB_HOST={}
DB_PORT={}
ADMIN_USER={}
ADMIN_PASSWORD={}
ADMIN_EMAIL={}
SITE_TITLE={}
PORT={}
HOST={}
"#,
        request.name,
        request.version,
        request.site_url,
        request.site_url,
        request.db_name,
        request.db_user,
        request.db_password,
        request.db_host,
        request.db_port,
        request.admin_user,
        admin_password,
        request.admin_email,
        request.site_title,
        request.port,
        request.host
    );

    let env_path = project_path.join(".env");
    fs::write(&env_path, env_content)
        .map_err(|e| format!("Failed to write .env: {}", e))?;

    Ok(())
}

fn save_project_metadata(project_path: &Path, project: &WordPressProject) -> Result<(), String> {
    let metadata = serde_json::to_string_pretty(project)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
    
    let metadata_path = project_path.join(".hive-project");
    fs::write(&metadata_path, metadata)
        .map_err(|e| format!("Failed to write metadata: {}", e))?;

    Ok(())
}

fn generate_secure_password() -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

    let mut rng = rand::thread_rng();
    let password: String = (0..32)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect();

    password
}

fn generate_salts() -> String {
    let salt_names = [
        "AUTH_KEY",
        "SECURE_AUTH_KEY",
        "LOGGED_IN_KEY",
        "NONCE_KEY",
        "AUTH_SALT",
        "SECURE_AUTH_SALT",
        "LOGGED_IN_SALT",
        "NONCE_SALT"
    ];
    
    let mut salts = String::new();
    for name in salt_names.iter() {
        salts.push_str(&format!("define('{}', '{}');\n", name, generate_secure_password()));
    }
    salts
}

fn get_projects_dir() -> PathBuf {
    if let Some(home) = home_dir() {
        home.join("Projects")
    } else {
        PathBuf::from(".")
    }
}