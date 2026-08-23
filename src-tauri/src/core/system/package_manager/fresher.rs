use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::net::{TcpStream, ToSocketAddrs};
use std::process::{Command, Stdio};
use std::sync::{LazyLock, Mutex};
use std::thread;
use std::time::Duration;

use chrono::Utc;
use tauri::{AppHandle, Emitter};

use super::registry::binary_name;
use super::types::PackageManagerKind;
use super::search::parse_kind;
use crate::core::system::installer::elevation::{elevation_prefix, resolve_elevation};

/// Last successful repository-index refresh timestamp (RFC3339) per manager.
/// Persisted for the session so the UI can show "Repository index last updated".
static FRESHNESS: LazyLock<Mutex<HashMap<String, String>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Build the index-refresh argv for a manager (first element is the program).
///
/// These refresh the **local cached index** so subsequent offline searches
/// reflect newer packages. Most require elevation on Linux; winget/brew/scoop/
/// nix self-elevate or need no privilege. A `vec![]` means the manager has no
/// explicit refresh step (its search already reads a local cache that updates
/// opportunistically).
pub fn build_refresh_cmd(kind: PackageManagerKind) -> Vec<String> {
    let bin = binary_name(kind);
    match kind {
        PackageManagerKind::Apt => vec!["apt-get".into(), "update".into()],
        PackageManagerKind::Dnf | PackageManagerKind::Yum => vec![bin.into(), "makecache".into()],
        PackageManagerKind::Pacman => vec!["pacman".into(), "-Sy".into()],
        PackageManagerKind::Zypper => vec!["zypper".into(), "--non-interactive".into(), "refresh".into()],
        PackageManagerKind::Apk => vec!["apk".into(), "update".into()],
        PackageManagerKind::Xbps => vec!["xbps-install".into(), "-S".into()],
        PackageManagerKind::Emerge => vec!["emerge".into(), "--sync".into()],
        PackageManagerKind::Eopkg => vec!["eopkg".into(), "update-repo".into()],
        PackageManagerKind::Nix => vec!["nix".into(), "channel".into(), "--update".into()],
        PackageManagerKind::Brew => vec!["brew".into(), "update".into()],
        PackageManagerKind::Port => vec!["port".into(), "selfupdate".into()],
        PackageManagerKind::Winget => vec!["winget".into(), "source".into(), "update".into()],
        PackageManagerKind::Scoop => vec!["scoop".into(), "update".into()],
        // Chocolatey has no standalone "refresh index" command; its search reads
        // cached sources that update on use. Treated as a no-op (always fresh).
        PackageManagerKind::Choco | PackageManagerKind::Static => vec![],
    }
}

/// Whether refreshing this manager's index normally needs privileged write.
fn refresh_requires_elevation(kind: PackageManagerKind) -> bool {
    matches!(
        kind,
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

/// Returns RFC3339 timestamp of the last successful index refresh for a manager.
pub fn last_updated(kind: PackageManagerKind) -> Option<String> {
    FRESHNESS.lock().ok().and_then(|g| g.get(&format!("{:?}", kind)).cloned())
}

fn record(kind: PackageManagerKind) {
    if let Ok(mut g) = FRESHNESS.lock() {
        g.insert(format!("{:?}", kind), Utc::now().to_rfc3339());
    }
}

/// Refresh a single manager's repository index. Streams progress under
/// `"repo-index-progress"` and records the success timestamp. This is the
/// *explicit* refresh the UI offers — it is **never** run automatically per
/// keystroke (see "Online vs Offline Search Behavior").
#[tauri::command]
pub fn refresh_package_index(app: AppHandle, manager: String) -> Result<(), String> {
    let kind = parse_kind(&manager)
        .ok_or_else(|| format!("Unknown package manager: {}", manager))?;
    let argv = build_refresh_cmd(kind);

    // No-op managers: just mark as fresh and return.
    if argv.is_empty() {
        record(kind);
        return Ok(());
    }

    let requires_elevation = refresh_requires_elevation(kind);
    let elevation = resolve_elevation(requires_elevation);
    let mut full = elevation_prefix(&elevation);
    full.extend(argv.iter().cloned());
    let program = full[0].clone();
    let rest = full[1..].to_vec();

    app.emit(
        "repo-index-progress",
        serde_json::json!({
            "manager": manager,
            "message": format!("Updating {} repository index…", manager),
            "done": false,
            "success": false,
        }),
    )
    .ok();

    let mut child = Command::new(program)
        .args(rest)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start index refresh: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    let app_s = app.clone();
    let mgr_s = manager.clone();
    let out_thread = thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            let _ = app_s.emit(
                "repo-index-progress",
                serde_json::json!({
                    "manager": mgr_s.clone(),
                    "message": line,
                    "done": false,
                    "success": false,
                }),
            );
        }
    });
    let app_e = app.clone();
    let mgr_e = manager.clone();
    let err_thread = thread::spawn(move || {
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            let _ = app_e.emit(
                "repo-index-progress",
                serde_json::json!({
                    "manager": mgr_e.clone(),
                    "message": line,
                    "done": false,
                    "success": false,
                }),
            );
        }
    });

    out_thread.join().ok();
    err_thread.join().ok();
    let status = child.wait().map_err(|e| e.to_string())?;

    if !status.success() {
        app.emit(
            "repo-index-progress",
            serde_json::json!({
                "manager": manager,
                "message": "Index refresh failed",
                "done": true,
                "success": false,
            }),
        )
        .ok();
        return Err(format!("Index refresh for {} failed", manager));
    }

    record(kind);
    app.emit(
        "repo-index-progress",
        serde_json::json!({
            "manager": manager,
            "message": "Repository index updated",
            "done": true,
            "success": true,
        }),
    )
    .ok();
    Ok(())
}

/// Get the last-refreshed timestamp (RFC3339) for a manager, or `null` if its
/// index has never been refreshed in this session.
#[tauri::command]
pub fn get_index_freshness(manager: String) -> Option<String> {
    let kind = parse_kind(&manager)?;
    last_updated(kind)
}

/// Exposes `has_internet()` to the frontend so the UI can surface connectivity
/// state (search works offline against the local index, but installs/updates and
/// index refreshes need a connection).
#[tauri::command]
pub fn check_internet() -> bool {
    has_internet()
}

/// Returns `true` if this host appears to have internet connectivity.
///
/// Used by the installer to give a clear "No internet connection — cannot
/// download" message before attempting a network-dependent install/update, and
/// by the UI to surface connectivity state.
///
/// Performance: the probe is intentionally fast and non-blocking. Targets are
/// hardcoded IPs (no DNS resolution, which itself hangs for seconds when
/// offline) and are tried **concurrently** with a short timeout. The first
/// success wins, so a working connection resolves in well under a second; a
/// fully offline host returns after a single short timeout rather than summing
/// one timeout per target.
pub fn has_internet() -> bool {
    // Hardcoded resolver IPs — avoids a DNS lookup that would itself hang when
    // offline (the previous list included hostname targets like `dns.google`).
    let targets = ["1.1.1.1:53", "8.8.8.8:53", "9.9.9.9:53"];

    // Resolve every target up front (these are literals, so this never blocks
    // on DNS) and probe them all in parallel.
    let addrs: Vec<std::net::SocketAddr> = targets
        .iter()
        .filter_map(|t| t.to_socket_addrs().ok())
        .flatten()
        .collect();
    if addrs.is_empty() {
        return false;
    }

    let (tx, rx) = std::sync::mpsc::channel::<bool>();
    let mut handles = Vec::new();
    for addr in addrs {
        let tx = tx.clone();
        handles.push(thread::spawn(move || {
            let ok = TcpStream::connect_timeout(&addr, Duration::from_millis(750)).is_ok();
            let _ = tx.send(ok);
        }));
    }
    drop(tx);

    // Any successful probe means we have connectivity; short-circuit as soon as
    // one reports `true`. If all fail we still wait for the stragglers so the
    // threads don't leak, but the worst case is one timeout, not N.
    let mut any = false;
    for _ in 0..handles.len() {
        if let Ok(true) = rx.recv() {
            any = true;
            break;
        }
    }
    for h in handles {
        let _ = h.join();
    }
    any
}
