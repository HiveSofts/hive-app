use crate::core::system::package_manager::catalog::{load_catalog, resolve, CatalogTool};
use crate::core::system::package_manager::commands::detect_package_managers;
use crate::core::system::package_manager::registry::build_install_cmd;
use crate::core::system::package_manager::search::parse_kind;
use crate::core::system::package_manager::types::{OsFamily, PackageManagerKind};
use crate::core::system::package_manager::PmAction;

use super::package_installer::{cancel_process, run_managed, run_managed_cmd};
use super::static_installer::{remove_static, run_static};

fn host_os() -> OsFamily {
    match std::env::consts::OS {
        "macos" => OsFamily::Macos,
        "windows" => OsFamily::Windows,
        _ => OsFamily::Linux,
    }
}

/// If the detected manager has a catalog row for this tool, use it; otherwise
/// force the static fallback (the resolver will honor that).
fn pick_manager(tool: &CatalogTool, detected: PackageManagerKind) -> PackageManagerKind {
    let has = tool.packages.iter().any(|p| p.manager == detected);
    if has {
        detected
    } else {
        PackageManagerKind::Static
    }
}

/// Whether installing via this manager normally requires privileged write.
fn requires_elevation(manager: PackageManagerKind) -> bool {
    matches!(
        manager,
        PackageManagerKind::Apt
            | PackageManagerKind::Dnf
            | PackageManagerKind::Yum
            | PackageManagerKind::Pacman
            | PackageManagerKind::Zypper
            | PackageManagerKind::Apk
            | PackageManagerKind::Xbps
            | PackageManagerKind::Emerge
            | PackageManagerKind::Eopkg
            | PackageManagerKind::Port
    )
}

#[tauri::command]
pub async fn install_tool(
    app: tauri::AppHandle,
    tool_id: String,
    version: String,
) -> Result<(), String> {
    let catalog = load_catalog();
    let tool = catalog
        .tools
        .iter()
        .find(|t| t.id == tool_id)
        .ok_or_else(|| format!("Unknown tool: {}", tool_id))?
        .clone();

    let detected = detect_package_managers()
        .recommended
        .map(|m| m.id)
        .unwrap_or(PackageManagerKind::Static);

    let manager = pick_manager(&tool, detected);
    let resolution = resolve(
        catalog,
        &tool_id,
        &version,
        manager,
        host_os(),
        std::env::consts::ARCH,
    );

    match resolution {
        crate::core::system::package_manager::Resolution::Managed { manager, package } => run_managed(
            &app,
            &tool_id,
            PmAction::Install,
            manager,
            &package,
            &tool.verify_binary,
            &tool.verify_version_arg,
            requires_elevation(manager),
        ),
        crate::core::system::package_manager::Resolution::Static { archive, url } => {
            run_static(&app, &tool_id, &version, &archive, &url).await
        }
        crate::core::system::package_manager::Resolution::Unavailable => Err(format!(
            "No install method available for {} on this system",
            tool_id
        )),
    }
}

#[tauri::command]
pub async fn update_tool(
    app: tauri::AppHandle,
    tool_id: String,
    version: String,
) -> Result<(), String> {
    let catalog = load_catalog();
    let tool = catalog
        .tools
        .iter()
        .find(|t| t.id == tool_id)
        .ok_or_else(|| format!("Unknown tool: {}", tool_id))?
        .clone();

    let detected = detect_package_managers()
        .recommended
        .map(|m| m.id)
        .unwrap_or(PackageManagerKind::Static);

    let manager = pick_manager(&tool, detected);
    let resolution = resolve(
        catalog,
        &tool_id,
        &version,
        manager,
        host_os(),
        std::env::consts::ARCH,
    );

    match resolution {
        crate::core::system::package_manager::Resolution::Managed { manager, package } => run_managed(
            &app,
            &tool_id,
            PmAction::Update,
            manager,
            &package,
            &tool.verify_binary,
            &tool.verify_version_arg,
            requires_elevation(manager),
        ),
        crate::core::system::package_manager::Resolution::Static { archive, url } => {
            run_static(&app, &tool_id, &version, &archive, &url).await
        }
        crate::core::system::package_manager::Resolution::Unavailable => {
            Err(format!("No update method available for {}", tool_id))
        }
    }
}

#[tauri::command]
pub async fn uninstall_tool(tool_id: String, version: String) -> Result<(), String> {
    let catalog = load_catalog();
    let tool = catalog
        .tools
        .iter()
        .find(|t| t.id == tool_id)
        .ok_or_else(|| format!("Unknown tool: {}", tool_id))?;

    let detected = detect_package_managers()
        .recommended
        .map(|m| m.id)
        .unwrap_or(PackageManagerKind::Static);

    // No managed row for this system → it's a Hive-local static install.
    let has_managed = tool
        .packages
        .iter()
        .any(|p| p.manager != PackageManagerKind::Static && p.manager == detected);

    if !has_managed {
        return remove_static(&tool_id, &version);
    }

    let package = tool
        .packages
        .iter()
        .find(|p| p.manager == detected)
        .and_then(|p| p.name.clone())
        .unwrap_or_else(|| tool.verify_binary.clone());

    let argv = build_install_cmd(detected, PmAction::Remove, &package);
    let status = std::process::Command::new(&argv[0])
        .args(&argv[1..])
        .status()
        .map_err(|e| format!("Failed to run uninstall: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Uninstall of {} failed", package))
    }
}

// --- Universal (catalog-independent) install path ----------------------------
//
// The commands below install/update/uninstall *any* package discovered via the
// live search layer, not just tools present in `catalog.json`. They are driven
// by the raw `{manager, package}` pair returned by search.

/// Install an arbitrary package found via live search on the given manager.
#[tauri::command]
pub async fn universal_install(
    app: tauri::AppHandle,
    manager: String,
    package: String,
    version: Option<String>,
) -> Result<(), String> {
    let kind = parse_kind(&manager)
        .ok_or_else(|| format!("Unknown package manager: {}", manager))?;

    let pkg = match version {
        Some(v) if !v.is_empty() => format!("{}-{}", package, v),
        _ => package.clone(),
    };

    run_managed_cmd(
        &app,
        &format!("{}:{}", manager, package),
        PmAction::Install,
        kind,
        &pkg,
        None,
        "",
    )
}

/// Update an arbitrary package found via live search on the given manager.
#[tauri::command]
pub async fn universal_update(
    app: tauri::AppHandle,
    manager: String,
    package: String,
) -> Result<(), String> {
    let kind = parse_kind(&manager)
        .ok_or_else(|| format!("Unknown package manager: {}", manager))?;

    run_managed_cmd(
        &app,
        &format!("{}:{}", manager, package),
        PmAction::Update,
        kind,
        &package,
        None,
        "",
    )
}

/// Uninstall an arbitrary package found via live search on the given manager.
#[tauri::command]
pub async fn universal_uninstall(
    manager: String,
    package: String,
) -> Result<(), String> {
    let kind = parse_kind(&manager)
        .ok_or_else(|| format!("Unknown package manager: {}", manager))?;

    let argv = build_install_cmd(kind, PmAction::Remove, &package);
    let status = std::process::Command::new(&argv[0])
        .args(&argv[1..])
        .status()
        .map_err(|e| format!("Failed to run uninstall: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Uninstall of {} failed", package))
    }
}

/// Cancel an in-flight install (used by the UI's Cancel button). `tool_id` is the
/// `canonical_id` returned by the search layer.
#[tauri::command]
pub fn cancel_package_install(tool_id: String) -> bool {
    cancel_process(&tool_id)
}
