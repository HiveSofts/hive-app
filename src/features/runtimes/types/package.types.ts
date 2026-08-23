// Mirrors the Rust structs in src-tauri/src/core/system/package_manager/*.
// These are the live-search + universal-install data contracts.

export type PackageManagerKind =
    | "apt"
    | "dnf"
    | "yum"
    | "pacman"
    | "zypper"
    | "apk"
    | "xbps"
    | "emerge"
    | "eopkg"
    | "nix"
    | "brew"
    | "port"
    | "winget"
    | "choco"
    | "scoop"
    | "static";

export type OsFamily = "linux" | "macos" | "windows";

/// Whether a search hit came from the manager's local cached index (works
/// offline, may be stale) or a live remote query (requires connectivity).
/// Mirrors `IndexSource` in search.rs.
export type IndexSource = "cached" | "remote";

export interface DetectedManager {
    id: PackageManagerKind;
    display: string;
    version: string | null;
    requires_elevation: boolean;
    priority: number;
    source_based?: boolean;
    /// ISO timestamp (RFC3339) of the last successful repository-index refresh
    /// in this session, or `null` if never refreshed. Surfaced as
    /// "Repository index last updated: X".
    index_updated_at: string | null;
}

export interface DistroInfo {
    id: string | null;
    id_like: string | null;
    name: string | null;
}

export interface DetectionResult {
    all_found: DetectedManager[];
    recommended: DetectedManager | null;
    os_family: OsFamily;
    distro: DistroInfo;
    uses_static_fallback: boolean;
}

/// A single normalized search hit from the host's package manager(s).
export interface SearchResult {
    name: string;
    canonical_id: string;
    description: string;
    available_versions: string[];
    source_manager: PackageManagerKind;
    is_installed: boolean;
    installed_version: string | null;
    homepage_url: string | null;
    /// Whether this hit came from the local cached index or a live remote query.
    index_source: IndexSource;
}

/// Richer single-package view used by the detail dialog.
export interface PackageDetails {
    name: string;
    canonical_id: string;
    source_manager: PackageManagerKind;
    description: string;
    all_versions: string[];
    installed_version: string | null;
    homepage_url: string | null;
    license: string | null;
    installed: boolean;
    exact_command: string;
}

/// Catalog tool (curated, installable via `get_package_catalog`).
export interface CatalogPackage {
    manager: PackageManagerKind;
    name: string | null;
    versions?: Record<string, string>;
}

export interface CatalogTool {
    id: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    homepage: string;
    verify_binary: string;
    verify_version_arg: string;
    versions: string[];
    packages: CatalogPackage[];
}

export interface PackageCatalog {
    schema_version?: number;
    tools: CatalogTool[];
}

export interface PackageStatus {
    tool_id: string;
    installed: boolean;
    version: string | null;
}

/// Live progress event streamed under `"package-install-progress"`.
export interface InstallProgress {
    tool_id: string;
    action: string;
    step: string;
    message: string;
    progress: number | null;
    is_stderr: boolean;
    log: string | null;
    command: string | null;
    failure_reason: string | null;
    exit_code: number | null;
    done: boolean;
    success: boolean;
}

/// Live progress event streamed under `"repo-index-progress"` while a manager's
/// repository index is being refreshed (see fresher.rs `refresh_package_index`).
export interface RepoIndexProgress {
    manager: string;
    message: string;
    done: boolean;
    success: boolean;
}
