use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordPressProject {
    pub name: String,
    pub path: String,
    pub description: String,
    pub source_type: String,
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
