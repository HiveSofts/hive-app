import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import type {
    CatalogTool,
    DetectionResult,
    InstallProgress,
    PackageCatalog,
    PackageDetails,
    PackageManagerKind,
    PackageStatus,
    RepoIndexProgress,
    SearchResult,
} from "../types/package.types";

/// Raw package-manager detection from the host.
export const detectManagers = (): Promise<DetectionResult> =>
    invoke<DetectionResult>("detect_package_managers");

/// Re-probe PATH / os-release (bypasses the session cache).
export const refreshManagers = (): Promise<DetectionResult> =>
    invoke<DetectionResult>("refresh_package_managers");

/// Curated, installable catalog (grouped by category in the UI).
export const getPackageCatalog = (): Promise<PackageCatalog> =>
    invoke<PackageCatalog>("get_package_catalog");

/// Install status for every catalog tool on this host.
export const getPackageStatuses = (): Promise<PackageStatus[]> =>
    invoke<PackageStatus[]>("get_package_statuses");

/// Live, manager-native search. Shells out to each detected manager's own
/// search CLI and merges normalized results. `manager` filters to one source.
export const searchSystemPackages = (
    term: string,
    manager?: PackageManagerKind
): Promise<SearchResult[]> =>
    invoke<SearchResult[]>("search_system_packages", {
        term,
        manager: manager ?? null,
    });

/// Richer detail for a single package, powering the version picker + command preview.
export const getSystemPackageDetails = (
    manager: PackageManagerKind,
    pkg: string
): Promise<PackageDetails | null> =>
    invoke<PackageDetails | null>("get_system_package_details", {
        manager,
        package: pkg,
    });

/// Install any live-search result. `toolId` is the result's `canonical_id`,
/// which also identifies the progress stream. `onProgress` receives each
/// `package-install-progress` event until the terminal `done` event.
export const universalInstall = (
    manager: PackageManagerKind,
    pkg: string,
    _toolId: string,
    version?: string,
    onProgress?: (p: InstallProgress) => void
): Promise<void> => {
    const unlisten = listen<InstallProgress>("package-install-progress", (e) => {
        onProgress?.(e.payload);
    });
    return invoke<void>("universal_install", { manager, package: pkg, version: version ?? null })
        .finally(() => {
            unlisten.then((fn) => fn());
        });
};

/// Update a previously-installed live-search result.
export const universalUpdate = (
    manager: PackageManagerKind,
    pkg: string,
    _toolId: string,
    onProgress?: (p: InstallProgress) => void
): Promise<void> => {
    const unlisten = listen<InstallProgress>("package-install-progress", (e) => {
        onProgress?.(e.payload);
    });
    return invoke<void>("universal_update", { manager, package: pkg })
        .finally(() => {
            unlisten.then((fn) => fn());
        });
};

/// Uninstall a live-search result (returns once the manager command exits).
export const universalUninstall = (
    manager: PackageManagerKind,
    pkg: string
): Promise<void> => invoke<void>("universal_uninstall", { manager, package: pkg });

/// Abort an in-flight install identified by its `canonical_id`.
export const cancelPackageInstall = (toolId: string): Promise<boolean> =>
    invoke<boolean>("cancel_package_install", { toolId });

/// Last successful repository-index refresh timestamp (RFC3339) for a manager,
/// or `null` if never refreshed this session. Drives the "last updated" label.
export const getIndexFreshness = (manager: PackageManagerKind): Promise<string | null> =>
    invoke<string | null>("get_index_freshness", { manager });

/// Refresh a manager's repository index (apt update, brew update, …). Streams
/// `repo-index-progress` events through `onProgress` until the terminal `done`
/// event. May require elevation + connectivity.
export const refreshPackageIndex = (
    manager: PackageManagerKind,
    onProgress?: (p: RepoIndexProgress) => void
): Promise<void> => {
    const unlisten = listen<RepoIndexProgress>("repo-index-progress", (e) => {
        onProgress?.(e.payload);
    });
    return invoke<void>("refresh_package_index", { manager })
        .finally(() => {
            unlisten.then((fn) => fn());
        });
};

/// Subscribe to repository-index refresh progress events (kept open until the
/// returned unlisten is called). Useful for a shared refresh-status indicator.
export const listenToRepoProgress = (
    onProgress: (p: RepoIndexProgress) => void
): Promise<() => void> =>
    listen<RepoIndexProgress>("repo-index-progress", (e) => onProgress(e.payload));

/// Whether this host currently has internet connectivity. Search works offline
/// against the local cached index; installs/updates and index refreshes need a
/// connection.
export const checkInternet = (): Promise<boolean> => invoke<boolean>("check_internet");

/// Generic progress subscription helper for long-running install flows.
export const listenToProgress = (
    onProgress: (p: InstallProgress) => void
): Promise<() => void> => listen<InstallProgress>("package-install-progress", (e) => onProgress(e.payload));

/// Install a curated catalog tool by id (uses `install_tool` which resolves the
/// catalog → manager/static path). `toolId` doubles as the progress stream id.
export const installCatalogTool = (
    toolId: string,
    version: string,
    onProgress?: (p: InstallProgress) => void
): Promise<void> => {
    const unlisten = listen<InstallProgress>("package-install-progress", (e) => {
        onProgress?.(e.payload);
    });
    return invoke<void>("install_tool", { toolId, version })
        .finally(() => {
            unlisten.then((fn) => fn());
        });
};

/// Update a curated catalog tool by id.
export const updateCatalogTool = (
    toolId: string,
    version: string,
    onProgress?: (p: InstallProgress) => void
): Promise<void> => {
    const unlisten = listen<InstallProgress>("package-install-progress", (e) => {
        onProgress?.(e.payload);
    });
    return invoke<void>("update_tool", { toolId, version })
        .finally(() => {
            unlisten.then((fn) => fn());
        });
};

/// Uninstall a curated catalog tool by id.
export const uninstallCatalogTool = (toolId: string, version: string): Promise<void> =>
    invoke<void>("uninstall_tool", { toolId, version });

export type { CatalogTool, DetectionResult, SearchResult, PackageDetails, PackageStatus };
