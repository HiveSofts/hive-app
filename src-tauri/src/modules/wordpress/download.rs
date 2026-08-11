use reqwest::Client;
use std::fs;
use std::path::Path;
use tauri::AppHandle;
use zip::ZipArchive;

use super::config::GitHubTag;
use crate::core::fs_utils::{safe_extract_zip, safe_extract_zip_strip_root};

const GITHUB_API: &str = "https://api.github.com/repos/WordPress/WordPress";

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

    safe_extract_zip(&mut archive, extract_path)
}

pub async fn get_github_zip_url(version: &str) -> Result<String, String> {
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

pub async fn download_and_extract_wordpress(project_path: &Path, url: &str) -> Result<(), String> {
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

    fs::write(&zip_path, &bytes).map_err(|e| format!("Failed to write zip: {}", e))?;

    let file = fs::File::open(&zip_path).map_err(|e| format!("Failed to open zip: {}", e))?;

    let mut archive = ZipArchive::new(file).map_err(|e| format!("Failed to read zip: {}", e))?;

    // The official WordPress zips wrap everything in a top-level folder
    // (e.g. `wordpress/`); detect that folder from the first entry and strip it
    // so the site lands directly in the project root. `safe_extract_zip_strip_root`
    // also rejects any entry that would escape the project (zip-slip defense —
    // the unified implementation in core/fs_utils).
    let root_dir = archive
        .by_index(0)
        .map(|f| f.name().split('/').next().unwrap_or("").to_string())
        .unwrap_or_default();

    if root_dir.is_empty() {
        return Err("WordPress zip has no top-level directory".to_string());
    }

    let result = safe_extract_zip_strip_root(&mut archive, project_path, &root_dir);

    fs::remove_file(&zip_path).map_err(|e| format!("Failed to remove zip: {}", e))?;

    result
}
