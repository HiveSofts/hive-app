use serde::{Deserialize, Serialize};

/// Supported native package managers + the static-binary fallback.
///
/// Adding a new manager is data-only: add an entry to `registry::MANAGERS`
/// and the appropriate rows to `catalog.json`. No core logic changes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "lowercase")]
pub enum PackageManagerKind {
    Apt,
    Dnf,
    Yum,
    Pacman,
    Zypper,
    Apk,
    Xbps,
    Emerge,
    Eopkg,
    Nix,
    Brew,
    Port,
    Winget,
    Choco,
    Scoop,
    /// Hive-managed static/portable binary install (no system manager).
    Static,
}

/// Coarse OS family used to filter managers and templates.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OsFamily {
    Linux,
    Macos,
    Windows,
}

/// A registry entry describing a supported package manager.
///
/// `priority` resolves ambiguous cases: higher wins. Examples:
/// dnf (90) > yum (80); distro-native > nix (40); brew (90) > port (70);
/// winget (90) > choco (70) > scoop (60).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageManager {
    /// Stable id used in the catalog (rename_all = lowercase).
    #[serde(rename = "id")]
    pub kind: PackageManagerKind,
    /// Human-readable name shown in UI (e.g. "Homebrew", "APT").
    pub display: &'static str,
    /// OS family this manager belongs to.
    pub os: OsFamily,
    /// Whether installing with this manager normally needs elevation.
    pub requires_elevation: bool,
    /// Resolution priority; higher wins when multiple are found.
    pub priority: u8,
    /// Whether this manager is source-based (long install times, e.g. Gentoo).
    #[serde(default)]
    pub source_based: bool,
}

/// A manager found on the host, plus its runtime metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedManager {
    pub id: PackageManagerKind,
    pub display: String,
    pub version: Option<String>,
    pub requires_elevation: bool,
    pub priority: u8,
    #[serde(default)]
    pub source_based: bool,
    /// ISO timestamp of the last successful repository-index refresh, if any.
    /// Populated by the fresher module; `None` means "never refreshed".
    #[serde(default)]
    pub index_updated_at: Option<String>,
}

/// Parsed `/etc/os-release` context (Linux only; empty elsewhere).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DistroInfo {
    pub id: Option<String>,
    pub id_like: Option<String>,
    pub name: Option<String>,
}

/// Result of a detection pass.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionResult {
    /// All managers found on PATH, sorted by priority (highest first).
    pub all_found: Vec<DetectedManager>,
    /// The recommended manager (highest priority), if any.
    pub recommended: Option<DetectedManager>,
    /// OS family of the host.
    pub os_family: OsFamily,
    /// Distro context from `/etc/os-release`, if available.
    pub distro: DistroInfo,
    /// True when no supported manager was found (static fallback path).
    pub uses_static_fallback: bool,
}
