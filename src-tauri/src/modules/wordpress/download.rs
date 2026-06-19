use std::fs;
use std::path::Path;
use reqwest::Client;
use zip::ZipArchive;
use tauri::AppHandle;

use super::config::{GitHubTag, CreateWordPressRequest};
use super::create::get_projects_dir;

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

pub async fn download_and_extract_wordpress(
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