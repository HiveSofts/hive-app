use std::process::Command;
use std::sync::Mutex;
use std::sync::mpsc;
use std::thread;

use super::catalog::{load_catalog, PackageCatalog};
use super::detect::{detect_managers, parse_os_release, SystemExecutor};
use super::search::{
    details, managers_from_detection, parse_kind, search, SYSTEM_RUNNER, SearchResult,
};
use super::types::{DetectionResult, PackageManagerKind};

/// Session cache for detection so we don't re-probe PATH on every view.
static CACHE: Mutex<Option<DetectionResult>> = Mutex::new(None);

fn detect_cached() -> DetectionResult {
    let cached = CACHE.lock().ok().and_then(|c| c.clone());
    if let Some(result) = cached {
        return result;
    }
    let result = detect_managers(&SystemExecutor);
    if let Ok(mut guard) = CACHE.lock() {
        *guard = Some(result.clone());
    }
    result
}

#[tauri::command]
pub fn detect_package_managers() -> DetectionResult {
    detect_cached()
}

#[tauri::command]
pub fn refresh_package_managers() -> DetectionResult {
    let result = detect_managers(&SystemExecutor);
    if let Ok(mut guard) = CACHE.lock() {
        *guard = Some(result.clone());
    }
    result
}

#[tauri::command]
pub fn get_package_catalog() -> PackageCatalog {
    load_catalog().clone()
}

/// Status of a single catalog tool on this machine.
#[derive(Debug, Clone, serde::Serialize)]
pub struct PackageStatus {
    pub tool_id: String,
    pub installed: bool,
    pub version: Option<String>,
}

/// Probe each catalog tool's `verify_binary` to determine install status.
fn probe_version(binary: &str, version_arg: &str) -> Option<String> {
    let out = Command::new(binary)
        .arg(version_arg)
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
    let line = if stdout.is_empty() {
        String::from_utf8_lossy(&out.stderr).trim().to_string()
    } else {
        stdout
    };
    if line.is_empty() {
        None
    } else {
        Some(line)
    }
}

#[tauri::command]
pub fn get_package_statuses() -> Vec<PackageStatus> {
    let catalog = load_catalog();
    let (tx, rx) = mpsc::channel::<PackageStatus>();
    let mut handles = Vec::new();

    // Each tool's install status is probed by invoking its `verify_binary`, an
    // independent subprocess. Probing sequentially would sum each tool's
    // startup latency; running them concurrently collapses that to the single
    // slowest probe — a big win on page mount where this blocks the catalog view.
    for tool in catalog.tools.iter() {
        let tx = tx.clone();
        let binary = tool.verify_binary.clone();
        let version_arg = tool.verify_version_arg.clone();
        let tool_id = tool.id.clone();
        handles.push(thread::spawn(move || {
            let (installed, version) = match probe_version(&binary, &version_arg) {
                Some(v) => (true, Some(v)),
                None => (false, None),
            };
            let _ = tx.send(PackageStatus {
                tool_id,
                installed,
                version,
            });
        }));
    }
    drop(tx);

    let mut out = Vec::with_capacity(catalog.tools.len());
    for _ in &handles {
        if let Ok(s) = rx.recv() {
            out.push(s);
        }
    }
    for h in handles {
        let _ = h.join();
    }
    out
}

/// Exposed for tests/logging: parse os-release from raw content.
pub fn parse_os_release_public(content: &str) -> super::types::DistroInfo {
    parse_os_release(content)
}

/// Live, manager-native search. Shells out to each detected package manager's
/// own search capability and normalizes results into the common schema.
///
/// If `manager` is provided (e.g. `"apt"`), only that manager is queried;
/// otherwise every detected manager is searched and results merged. This is the
/// core of the universal "search any package" experience — results come straight
/// from the host's repositories, not a curated list.
#[tauri::command]
pub async fn search_system_packages(
    term: String,
    manager: Option<String>,
) -> Vec<SearchResult> {
    if term.trim().is_empty() {
        return vec![];
    }

    let detection = detect_cached();
    let managers: Vec<PackageManagerKind> = if let Some(m) = &manager {
        match parse_kind(m) {
            Some(k) => vec![k],
            None => return vec![],
        }
    } else {
        managers_from_detection(&detection)
    };

    search(&term, &managers, &SYSTEM_RUNNER)
}

/// Fetch details for a single package on a specific manager. Used by the result
/// detail panel to populate the version picker and advanced command preview.
#[tauri::command]
pub async fn get_system_package_details(
    manager: String,
    package: String,
) -> Option<super::search::PackageDetails> {
    let kind = parse_kind(&manager)?;
    Some(details(kind, &package, &SYSTEM_RUNNER))
}
