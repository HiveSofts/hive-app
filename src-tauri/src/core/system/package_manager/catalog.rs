use serde::{Deserialize, Serialize};

use super::types::{OsFamily, PackageManagerKind};
use super::registry::binary_name;

/// Embedded catalog, loaded at compile time so detection works fully offline.
pub const CATALOG_JSON: &str = include_str!("catalog.json");

/// Parse the embedded catalog once and cache it for the process lifetime. The
/// catalog never changes at runtime, so re-parsing the JSON on every call (page
/// mount, every install/uninstall) is wasted work. `once_cell`'s `LazyLock`
/// makes the parse happen at most once, on first use.
static CATALOG: std::sync::LazyLock<PackageCatalog> =
    std::sync::LazyLock::new(|| serde_json::from_str(CATALOG_JSON).expect("catalog.json must be valid"));

/// A per-manager package description for a catalog tool.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogPackage {
    pub manager: PackageManagerKind,
    /// Default package name for this manager. Optional because static/portable
    /// entries don't have a manager package name (they use a `url_template`).
    #[serde(default)]
    pub name: Option<String>,
    /// Optional version-pinned names (e.g. apt `php8.3` for version "8.3").
    #[serde(default)]
    pub versions: std::collections::HashMap<String, String>,
    /// For `static` entries: archive type + URL template.
    #[serde(default)]
    pub archive: Option<String>,
    #[serde(default)]
    pub url_template: Option<String>,
}

/// A canonical tool the UI catalogs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogTool {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub icon: String,
    pub homepage: String,
    /// Binary used to verify the install, run with `verify_version_arg`.
    pub verify_binary: String,
    pub verify_version_arg: String,
    /// Available selectable versions (UI hints; "" = latest/any).
    #[serde(default)]
    pub versions: Vec<String>,
    pub packages: Vec<CatalogPackage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageCatalog {
    #[serde(default)]
    pub schema_version: u32,
    pub tools: Vec<CatalogTool>,
}

/// What the resolver decided for an install request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Resolution {
    /// Install via a system package manager.
    Managed {
        manager: PackageManagerKind,
        package: String,
    },
    /// No manager mapping — fall back to a Hive-managed static binary.
    Static {
        archive: String,
        url: String,
    },
    /// Nothing available: no manager found and no static entry.
    Unavailable,
}

/// Parse the embedded catalog once (lazily, on first use) and return a shared
/// reference. Subsequent calls cost nothing — the JSON is not re-parsed.
pub fn load_catalog() -> &'static PackageCatalog {
    &CATALOG
}

/// Find a tool in the catalog by id.
pub fn find_tool<'a>(catalog: &'a PackageCatalog, tool_id: &str) -> Option<&'a CatalogTool> {
    catalog.tools.iter().find(|t| t.id == tool_id)
}

/// Pick the archive type + resolved URL for a static fallback.
fn resolve_static(
    tool: &CatalogTool,
    version: &str,
    os: OsFamily,
    arch: &str,
) -> Option<Resolution> {
    let entry = tool.packages.iter().find(|p| {
        matches!(p.manager, PackageManagerKind::Static)
            && p.archive.is_some()
            && p.url_template.is_some()
    })?;

    let archive = entry.archive.clone().unwrap();
    let template = entry.url_template.clone().unwrap();
    let os_tag = match os {
        OsFamily::Linux => "linux",
        OsFamily::Macos => "darwin",
        OsFamily::Windows => "win",
    };
    let url = template
        .replace("{version}", version)
        .replace("{os}", os_tag)
        .replace("{arch}", arch);

    Some(Resolution::Static { archive, url })
}

/// Resolve how to install `tool_id` at `version` using `manager_id`.
///
/// Falls back to static binary when the chosen manager has no catalog row;
/// returns `Unavailable` when neither a manager mapping nor a static entry
/// exists. This is the catalog's fallback-aware core (Deliverable 3).
pub fn resolve(
    catalog: &PackageCatalog,
    tool_id: &str,
    version: &str,
    manager_id: PackageManagerKind,
    os: OsFamily,
    arch: &str,
) -> Resolution {
    let Some(tool) = find_tool(catalog, tool_id) else {
        return Resolution::Unavailable;
    };

    // Prefer a manager-specific package row.
    if let Some(pkg) = tool.packages.iter().find(|p| p.manager == manager_id) {
        if manager_id != PackageManagerKind::Static {
            // Use the version-pinned name when available (apt php8.3 etc.).
            let package = if version.is_empty() {
                pkg.name.clone().unwrap_or_default()
            } else {
                pkg.versions
                    .get(version)
                    .cloned()
                    .unwrap_or_else(|| pkg.name.clone().unwrap_or_default())
            };
            return Resolution::Managed {
                manager: manager_id,
                package,
            };
        }
    }

    // No manager mapping (or Static chosen) → static fallback.
    if manager_id == PackageManagerKind::Static {
        if let Some(r) = resolve_static(tool, version, os, arch) {
            return r;
        }
    }

    // Manager had no row: try static fallback before giving up.
    if let Some(r) = resolve_static(tool, version, os, arch) {
        return r;
    }

    Resolution::Unavailable
}

/// Convenience: the catalog package name displayed in the UI for a manager,
/// without resolving a full install (used for badges / previews).
pub fn preview_package(tool: &CatalogTool, manager_id: PackageManagerKind) -> Option<String> {
    tool.packages
        .iter()
        .find(|p| p.manager == manager_id)
        .and_then(|p| p.name.clone())
}

/// Human label for a manager kind (reuses the registry display name when possible).
pub fn manager_label(kind: PackageManagerKind) -> String {
    match super::registry::get_manager(kind) {
        Some(m) => m.display.to_string(),
        None => binary_name(kind).to_string(),
    }
}
