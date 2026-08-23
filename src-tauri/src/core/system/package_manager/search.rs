use std::collections::HashSet;
use std::process::Command;
use std::sync::mpsc;
use std::thread;

use serde::{Deserialize, Serialize};

use super::registry::binary_name;
use super::types::{DetectionResult, PackageManagerKind};

/// Where a search result came from. The UI uses this to label results and to
/// warn that a hit from the local index may be stale (an online refresh may show
/// newer versions). See the "Online vs Offline Search Behavior" spec.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum IndexSource {
    /// Served from the manager's local/ cached repository index — works with no
    /// network, but may be out of date until the index is refreshed.
    #[default]
    Cached,
    /// Resolved live from a remote query/API fallback (e.g. winget's remote
    /// source). Requires connectivity; reflects the newest available package.
    Remote,
}

/// A single result normalized from a manager's native search output.
///
/// Every manager produces its own wildly different raw format; `normalize_search`
/// reduces them all to this common shape so the frontend never needs to know
/// which package manager produced a row.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    /// The canonical package name on the *source* manager (e.g. `nodejs`,
    /// `OpenJS.NodeJS`, `node`).
    pub name: String,
    /// Stable id used as the install key: `{manager}:{name}`.
    pub canonical_id: String,
    pub description: String,
    /// Versions offered by the manager. Often empty for managers that don't
    /// surface version lists in search output (filled by `PackageDetails`).
    #[serde(default)]
    pub available_versions: Vec<String>,
    pub source_manager: PackageManagerKind,
    #[serde(default)]
    pub is_installed: bool,
    #[serde(default)]
    pub installed_version: Option<String>,
    #[serde(default)]
    pub homepage_url: Option<String>,
    /// Whether this hit came from the local cached index or a live remote query.
    #[serde(default)]
    pub index_source: IndexSource,
}

/// Richer view of one package, fetched on demand for the detail panel.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageDetails {
    pub name: String,
    pub canonical_id: String,
    pub source_manager: PackageManagerKind,
    pub description: String,
    #[serde(default)]
    pub all_versions: Vec<String>,
    #[serde(default)]
    pub installed_version: Option<String>,
    #[serde(default)]
    pub homepage_url: Option<String>,
    #[serde(default)]
    pub license: Option<String>,
    #[serde(default)]
    pub installed: bool,
    /// The exact install command the UI would run, for the advanced panel.
    pub exact_command: String,
}

/// Hides command execution behind a trait so the parsers can be unit-tested
/// with canned output instead of shelling out. Mirrors `detect::CommandExecutor`.
///
/// `run_env` carries extra environment variables (used to pin some managers to
/// offline / no-network behavior — e.g. `HOMEBREW_NO_AUTO_UPDATE=1`).
pub trait SearchRunner {
    /// Run `bin args` and return trimmed stdout, or `None` on failure/empty.
    fn run(&self, bin: &str, args: &[&str]) -> Option<String>;
    /// Run `bin args` with the given environment overrides, returning trimmed
    /// stdout, or `None` on failure/empty.
    fn run_env(&self, bin: &str, args: &[&str], env: &[(&str, &str)]) -> Option<String>;
    /// True if `bin` resolves on PATH (used by `installed_names` fallback).
    fn exists_on_path(&self, bin: &str) -> bool;
}

/// The runner used by the real Tauri commands.
impl SearchRunner for SystemRunner {
    fn run(&self, bin: &str, args: &[&str]) -> Option<String> {
        self.run_env(bin, args, &[])
    }

    fn run_env(&self, bin: &str, args: &[&str], env: &[(&str, &str)]) -> Option<String> {
        let mut cmd = Command::new(bin);
        for a in args {
            cmd.arg(a);
        }
        for (k, v) in env {
            cmd.env(k, v);
        }
        run_trimmed(cmd)
    }

    fn exists_on_path(&self, bin: &str) -> bool {
        let probe = if cfg!(windows) { "where" } else { "which" };
        if Command::new(probe).arg(bin).output().map(|o| o.status.success()).unwrap_or(false) {
            return true;
        }
        Command::new(bin)
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

/// Execute a command and return its trimmed stdout (falling back to trimmed
/// stderr); `None` on non-zero exit or empty output.
fn run_trimmed(mut cmd: Command) -> Option<String> {
    let out = cmd.output().ok()?;
    if !out.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if !stdout.is_empty() {
        Some(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
        if !stderr.is_empty() {
            Some(stderr)
        } else {
            None
        }
    }
}

/// The runner used by the real Tauri commands.
pub struct SystemRunner;

/// Shared `&'static` instance used by the command layer (the search functions
/// require a `'static` runner because they spawn threads).
pub static SYSTEM_RUNNER: SystemRunner = SystemRunner;

/// Parse a manager id string (e.g. `"apt"`, `"Static"`) into the enum.
pub fn parse_kind(s: &str) -> Option<PackageManagerKind> {
    match s.to_ascii_lowercase().as_str() {
        "apt" => Some(PackageManagerKind::Apt),
        "dnf" => Some(PackageManagerKind::Dnf),
        "yum" => Some(PackageManagerKind::Yum),
        "pacman" => Some(PackageManagerKind::Pacman),
        "zypper" => Some(PackageManagerKind::Zypper),
        "apk" => Some(PackageManagerKind::Apk),
        "xbps" | "xbps-install" => Some(PackageManagerKind::Xbps),
        "emerge" | "portage" => Some(PackageManagerKind::Emerge),
        "eopkg" => Some(PackageManagerKind::Eopkg),
        "nix" => Some(PackageManagerKind::Nix),
        "brew" => Some(PackageManagerKind::Brew),
        "port" => Some(PackageManagerKind::Port),
        "winget" => Some(PackageManagerKind::Winget),
        "choco" | "chocolatey" => Some(PackageManagerKind::Choco),
        "scoop" => Some(PackageManagerKind::Scoop),
        "static" => Some(PackageManagerKind::Static),
        _ => None,
    }
}

/// Whether a manager's *default* search reads from its local cached index (so it
/// works fully offline). Managers whose search always reaches the network are
/// marked `Remote` — the UI labels those results accordingly.
pub fn default_index_source(kind: PackageManagerKind) -> IndexSource {
    match kind {
        // winget's `search` resolves against its remote (cached) source; by
        // default it performs a live-ish query and may need connectivity.
        PackageManagerKind::Winget => IndexSource::Remote,
        // Everything else ships a local index queried by `search`.
        _ => IndexSource::Cached,
    }
}

/// Build the search argv for a manager + term. First element is the binary;
/// callers prepend an elevation prefix when required.
///
/// Offline-first: the command reads each manager's **local cached index** so
/// search works with no network access (see "Online vs Offline Search Behavior").
/// Where a tool would otherwise auto-refresh/network, we pin it to the cache:
/// `apt-cache search` (never touches the network, unlike `apt search`),
/// `dnf --cacheonly`, `xbps-query -Rs` (local), `brew search` with
/// `HOMEBREW_NO_AUTO_UPDATE=1`. A separate refresh step updates these indices.
pub fn build_search_cmd(kind: PackageManagerKind, term: &str) -> Vec<String> {
    let bin = binary_name(kind);
    match kind {
        // `apt-cache search` reads only the local package cache — never hits the
        // network. `apt search` can trigger a refresh, so we avoid it.
        PackageManagerKind::Apt => vec!["apt-cache".into(), "search".into(), term.into()],
        PackageManagerKind::Dnf | PackageManagerKind::Yum => {
            vec![bin.into(), "--cacheonly".into(), "search".into(), term.into()]
        }
        PackageManagerKind::Pacman => vec![bin.into(), "-Ss".into(), term.into()],
        PackageManagerKind::Zypper => {
            vec![bin.into(), "search".into(), "-t".into(), "package".into(), term.into()]
        }
        PackageManagerKind::Apk => vec![bin.into(), "search".into(), "-v".into(), term.into()],
        // `xbps-query -Rs` queries the local repository cache (offline-safe).
        PackageManagerKind::Xbps => vec!["xbps-query".into(), "-Rs".into(), term.into()],
        PackageManagerKind::Emerge => vec![bin.into(), "--search".into(), term.into()],
        PackageManagerKind::Eopkg => vec![bin.into(), "search".into(), term.into()],
        PackageManagerKind::Nix => {
            vec![bin.into(), "search".into(), "nixpkgs".into(), term.into()]
        }
        // `brew search` would auto-update the formulae on first run; pin it off
        // via env so the local cache is used (see `offline_env`).
        PackageManagerKind::Brew => vec![bin.into(), "search".into(), term.into()],
        PackageManagerKind::Port => vec![bin.into(), "search".into(), term.into()],
        PackageManagerKind::Winget => vec![
            bin.into(),
            "search".into(),
            // No `--exact`: winget matches by substring/fuzzy this way, so a
            // query like "redis" returns `Redis.Redis`. `--exact` would only
            // match a package whose name/id is exactly the query and hide
            // nearly everything (defeating "find any tool").
            term.into(),
        ],
        PackageManagerKind::Choco => vec![bin.into(), "search".into(), term.into()],
        PackageManagerKind::Scoop => vec![bin.into(), "search".into(), term.into()],
        PackageManagerKind::Static => vec![],
    }
}

/// Extra environment variables that pin a manager to its **local cache** so a
/// search stays completely offline (no auto-update / network touch). Applied by
/// `search()` to the live runner; tests ignore it via a pass-through impl.
pub fn offline_env(kind: PackageManagerKind) -> Vec<(&'static str, &'static str)> {
    match kind {
        // `brew search` would otherwise auto-update formulae on first use.
        PackageManagerKind::Brew => vec![("HOMEBREW_NO_AUTO_UPDATE", "1")],
        _ => vec![],
    }
}

/// Build the info/details argv for a manager + package name.
pub fn build_info_cmd(kind: PackageManagerKind, package: &str) -> Vec<String> {
    let bin = binary_name(kind);
    match kind {
        PackageManagerKind::Apt => vec![bin.into(), "show".into(), package.into()],
        PackageManagerKind::Dnf | PackageManagerKind::Yum => {
            vec![bin.into(), "info".into(), package.into()]
        }
        PackageManagerKind::Pacman => vec![bin.into(), "-Si".into(), package.into()],
        PackageManagerKind::Zypper => vec![bin.into(), "info".into(), package.into()],
        PackageManagerKind::Apk => vec![bin.into(), "info".into(), "-a".into(), package.into()],
        PackageManagerKind::Xbps => vec![bin.into(), "-Rx".into(), package.into()],
        PackageManagerKind::Emerge => vec![bin.into(), "--info".into(), package.into()],
        PackageManagerKind::Eopkg => vec![bin.into(), "info".into(), package.into()],
        PackageManagerKind::Nix => {
            vec![bin.into(), "search".into(), "nixpkgs".into(), "-v".into(), package.into()]
        }
        PackageManagerKind::Brew => vec![bin.into(), "info".into(), package.into()],
        PackageManagerKind::Port => vec![bin.into(), "info".into(), package.into()],
        PackageManagerKind::Winget => vec![bin.into(), "show".into(), "--exact".into(), "--id".into(), package.into()],
        PackageManagerKind::Choco => vec![bin.into(), "info".into(), package.into()],
        PackageManagerKind::Scoop => vec![bin.into(), "info".into(), package.into()],
        PackageManagerKind::Static => vec![],
    }
}

// --- Per-manager raw parsers ------------------------------------------------

fn apt_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // `apt search` lines look like:  "php8.3 - server-side ..."
        // `apt-cache search` lines look like:  "php8.3 server-side ..."
        if let Some((name, desc)) = line.split_once(" - ") {
            out.push(SearchResult {
                name: name.trim_matches('/').to_string(),
                canonical_id: format!("apt:{}", name.trim()),
                description: desc.trim().to_string(),
                available_versions: vec![],
                source_manager: PackageManagerKind::Apt,
                is_installed: false,
                installed_version: None,
                index_source: IndexSource::Cached,
                homepage_url: None,
            });
        } else {
            let mut parts = line.splitn(2, char::is_whitespace);
            if let Some(name) = parts.next() {
                out.push(SearchResult {
                    name: name.to_string(),
                    canonical_id: format!("apt:{}", name),
                    description: parts.next().unwrap_or("").trim().to_string(),
                    available_versions: vec![],
                    source_manager: PackageManagerKind::Apt,
                    is_installed: false,
                    installed_version: None,
                    index_source: IndexSource::Cached,
                    homepage_url: None,
                });
            }
        }
    }
    out
}

fn dnf_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    let mut current_name: Option<String> = None;
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Some(rest) = line.strip_prefix("Name : ") {
            current_name = Some(rest.trim().to_string());
            out.push(SearchResult {
                name: rest.trim().to_string(),
                canonical_id: format!("dnf:{}", rest.trim()),
                description: String::new(),
                available_versions: vec![],
                source_manager: PackageManagerKind::Dnf,
                is_installed: false,
                installed_version: None,
                index_source: IndexSource::Cached,
                homepage_url: None,
            });
        } else if let Some(rest) = line.strip_prefix("Summary : ") {
            if let Some(last) = out.last_mut() {
                last.description = rest.trim().to_string();
            }
        } else if let Some(rest) = line.strip_prefix("Name         : ") {
            // yum-style alternate layout
            out.push(SearchResult {
                name: rest.trim().to_string(),
                canonical_id: format!("dnf:{}", rest.trim()),
                description: String::new(),
                available_versions: vec![],
                source_manager: PackageManagerKind::Dnf,
                is_installed: false,
                installed_version: None,
                index_source: IndexSource::Cached,
                homepage_url: None,
            });
        }
    }
    let _ = current_name;
    out
}

fn pacman_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    // `pacman -Ss` groups by blank lines; each entry:
    //   repo/name version [installed]
    //   description
    let mut pending: Option<(String, String)> = None;
    for line in raw.lines() {
        if line.starts_with(char::is_whitespace) {
            // description line
            let desc = line.trim().to_string();
            if let Some((name, _)) = &pending {
                out.push(SearchResult {
                    name: name.clone(),
                    canonical_id: format!("pacman:{}", name),
                    description: desc,
                    available_versions: vec![],
                    source_manager: PackageManagerKind::Pacman,
                    is_installed: false,
                    installed_version: None,
                    index_source: IndexSource::Cached,
                    homepage_url: None,
                });
            }
            pending = None;
        } else if line.contains('/') {
            let trimmed = line.trim();
            let mut parts = trimmed.split_whitespace();
            if let Some(repo_name) = parts.next() {
                let name = repo_name.split('/').last().unwrap_or(repo_name).to_string();
                let version = parts.next().unwrap_or("").to_string();
                let installed = trimmed.contains("[installed]");
                pending = Some((name.clone(), version.clone()));
                out.push(SearchResult {
                    name,
                    canonical_id: format!("pacman:{}", repo_name),
                    description: String::new(),
                    available_versions: if version.is_empty() { vec![] } else { vec![version.clone()] },
                    source_manager: PackageManagerKind::Pacman,
                    is_installed: installed,
                    installed_version: if installed { Some(version) } else { None },
                    index_source: IndexSource::Cached,
                    homepage_url: None,
                });
            }
        }
    }
    out
}

fn zypper_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    for line in raw.lines() {
        // S | name | version | arch | summary
        let cols: Vec<&str> = line.split('|').map(|c| c.trim()).collect();
        if cols.len() == 5 && cols[0] == "S" {
            continue;
        }
        if cols.len() == 5 && !cols[1].is_empty() {
            out.push(SearchResult {
                name: cols[1].to_string(),
                canonical_id: format!("zypper:{}", cols[1]),
                description: cols[4].to_string(),
                available_versions: vec![cols[2].to_string()],
                source_manager: PackageManagerKind::Zypper,
                is_installed: false,
                installed_version: None,
                index_source: IndexSource::Cached,
                homepage_url: None,
            });
        }
    }
    out
}

fn apk_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // `apk search -v` → "name-version  description"
        if let Some((name_ver, desc)) = line.split_once(char::is_whitespace) {
            let name = name_ver.rsplit('-').skip(1).collect::<Vec<_>>().join("-");
            out.push(SearchResult {
                name: name.clone(),
                canonical_id: format!("apk:{}", name),
                description: desc.trim().to_string(),
                available_versions: vec![],
                source_manager: PackageManagerKind::Apk,
                is_installed: false,
                installed_version: None,
                index_source: IndexSource::Cached,
                homepage_url: None,
            });
        }
    }
    out
}

fn xbps_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // `[*] name-1.2.3   description`  (* = installed)
        let installed = line.starts_with("[*]");
        let rest = line.trim_start_matches("[*]").trim();
        if let Some((name_ver, desc)) = rest.split_once(char::is_whitespace) {
            let name = name_ver.rsplit('-').skip(1).collect::<Vec<_>>().join("-");
            out.push(SearchResult {
                name: name.clone(),
                canonical_id: format!("xbps:{}", name),
                description: desc.trim().to_string(),
                available_versions: vec![],
                source_manager: PackageManagerKind::Xbps,
                is_installed: installed,
                installed_version: None,
                index_source: IndexSource::Cached,
                homepage_url: None,
            });
        }
    }
    out
}

fn emerge_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    // Header lines like "*  dev-lang/php ([...])" then "      php is a ..."
    let mut pending: Option<String> = None;
    for line in raw.lines() {
        let line = line.trim();
        if line.starts_with('*') || line.starts_with("Searching") || line.contains("... done") {
            continue;
        }
        if let Some(rest) = line.strip_prefix("Started") {
            pending = Some(rest.trim().to_string());
        } else if let Some((cat_name, desc)) = line.split_once(char::is_whitespace) {
            let name = cat_name.split('/').last().unwrap_or(cat_name).to_string();
            out.push(SearchResult {
                name: name.clone(),
                canonical_id: format!("emerge:{}", cat_name),
                description: desc.trim().to_string(),
                available_versions: vec![],
                source_manager: PackageManagerKind::Emerge,
                is_installed: pending.as_deref() == Some(cat_name),
                installed_version: None,
                index_source: IndexSource::Cached,
                homepage_url: None,
            });
        }
    }
    out
}

fn eopkg_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    let mut current: Option<SearchResult> = None;
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Some(rest) = line.strip_prefix("Name: ") {
            current = Some(SearchResult {
                name: rest.trim().to_string(),
                canonical_id: format!("eopkg:{}", rest.trim()),
                description: String::new(),
                available_versions: vec![],
                source_manager: PackageManagerKind::Eopkg,
                is_installed: false,
                installed_version: None,
                index_source: IndexSource::Cached,
                homepage_url: None,
            });
        } else if let Some(rest) = line.strip_prefix("Summary: ") {
            if let Some(c) = current.as_mut() {
                c.description = rest.trim().to_string();
            }
        }
    }
    if let Some(c) = current {
        out.push(c);
    }
    out
}

fn brew_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("==>") || line.starts_with("Warning") {
            continue;
        }
        out.push(SearchResult {
            name: line.to_string(),
            canonical_id: format!("brew:{}", line),
            description: String::new(),
            available_versions: vec![],
            source_manager: PackageManagerKind::Brew,
            is_installed: false,
            installed_version: None,
            index_source: IndexSource::Cached,
            homepage_url: None,
        });
    }
    out
}

fn winget_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    let mut header: Option<Vec<String>> = None;
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("---") {
            continue;
        }
        let cells: Vec<&str> = line.split_whitespace().collect();
        // Header row: Name Id Version Source — detect by first cell being "Name".
        if cells.first().map(|c| *c == "Name").unwrap_or(false)
            && cells.len() >= 3
        {
            header = Some(cells.into_iter().map(|c| c.to_string()).collect());
            continue;
        }
        if header.is_none() {
            // Some winget versions omit header; fall back to single-name parse.
            if !cells.is_empty() {
                out.push(SearchResult {
                    name: cells[0].to_string(),
                    canonical_id: format!("winget:{}", cells[0]),
                    description: String::new(),
                    available_versions: vec![],
                    source_manager: PackageManagerKind::Winget,
                    is_installed: false,
                    installed_version: None,
                    index_source: IndexSource::Cached,
                    homepage_url: None,
                });
            }
            continue;
        }
        // Map cells to header columns by prefix matching.
        let id_idx = header
            .as_ref()
            .and_then(|h| h.iter().position(|c| c.eq_ignore_ascii_case("Id")))
            .unwrap_or(1);
        let ver_idx = header
            .as_ref()
            .and_then(|h| h.iter().position(|c| c.eq_ignore_ascii_case("Version")))
            .unwrap_or(2);
        let name = cells.get(0).copied().unwrap_or("").to_string();
        if name.is_empty() {
            continue;
        }
        let pkg_id = cells.get(id_idx).copied().unwrap_or(&name).to_string();
        let version = cells.get(ver_idx).copied().map(|v| v.to_string());
        out.push(SearchResult {
            name: pkg_id.clone(),
            canonical_id: format!("winget:{}", pkg_id),
            description: name,
            available_versions: version.clone().map(|v| vec![v]).unwrap_or_default(),
            source_manager: PackageManagerKind::Winget,
            is_installed: false,
            installed_version: version,
            index_source: IndexSource::Remote,
            homepage_url: None,
        });
    }
    out
}

fn choco_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("Chocolatey") || line.starts_with("Listing") {
            continue;
        }
        // Typically "PackageName  1.2.3" per line.
        let mut parts = line.splitn(2, char::is_whitespace);
        if let Some(name) = parts.next() {
            out.push(SearchResult {
                name: name.to_string(),
                canonical_id: format!("choco:{}", name),
                description: parts.next().unwrap_or("").trim().to_string(),
                available_versions: vec![],
                source_manager: PackageManagerKind::Choco,
                is_installed: false,
                installed_version: None,
                index_source: IndexSource::Cached,
                homepage_url: None,
            });
        }
    }
    out
}

fn scoop_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty()
            || line.starts_with("Name")
            || line.starts_with("----")
            || line.starts_with("Results")
        {
            continue;
        }
        // "name  version  source" or just "name"
        let name = line.split_whitespace().next().unwrap_or("").to_string();
        if name.is_empty() {
            continue;
        }
        out.push(SearchResult {
            name: name.clone(),
            canonical_id: format!("scoop:{}", name),
            description: String::new(),
            available_versions: vec![],
            source_manager: PackageManagerKind::Scoop,
            is_installed: false,
            installed_version: None,
            index_source: IndexSource::Cached,
            homepage_url: None,
        });
    }
    out
}

fn port_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("Searching") || line.contains("The following") {
            continue;
        }
        // "category/name   description"
        if let Some((name, desc)) = line.split_once(char::is_whitespace) {
            let simple = name.split('/').last().unwrap_or(name).to_string();
            out.push(SearchResult {
                name: simple.clone(),
                canonical_id: format!("port:{}", name),
                description: desc.trim().to_string(),
                available_versions: vec![],
                source_manager: PackageManagerKind::Port,
                is_installed: false,
                installed_version: None,
                index_source: IndexSource::Cached,
                homepage_url: None,
            });
        }
    }
    out
}

fn nix_normalize(raw: &str) -> Vec<SearchResult> {
    let mut out = Vec::new();
    // `nix search` JSON: { "packages": { "nixpkgs.php": { "pname", "version", "description" } } }
    let parsed: serde_json::Value = match serde_json::from_str(raw) {
        Ok(v) => v,
        Err(_) => return out,
    };
    if let Some(packages) = parsed.get("packages").and_then(|p| p.as_object()) {
        for (key, v) in packages {
            let name = v
                .get("pname")
                .and_then(|n| n.as_str())
                .map(|s| s.to_string())
                .or_else(|| key.split('.').last().map(|s| s.to_string()))
                .unwrap_or_else(|| key.clone());
            let version = v.get("version").and_then(|n| n.as_str()).map(|s| s.to_string());
            out.push(SearchResult {
                name: name.clone(),
                canonical_id: format!("nix:{}", key),
                description: v
                    .get("description")
                    .and_then(|d| d.as_str())
                    .unwrap_or("")
                    .to_string(),
                available_versions: version.clone().map(|v| vec![v]).unwrap_or_default(),
                source_manager: PackageManagerKind::Nix,
                is_installed: false,
                installed_version: version,
                index_source: IndexSource::Cached,
                homepage_url: None,
            });
        }
    }
    out
}

/// Route raw output to the correct normalizer by manager kind.
pub fn normalize_search(kind: PackageManagerKind, raw: &str) -> Vec<SearchResult> {
    let mut results = match kind {
        PackageManagerKind::Apt => apt_normalize(raw),
        PackageManagerKind::Dnf | PackageManagerKind::Yum => dnf_normalize(raw),
        PackageManagerKind::Pacman => pacman_normalize(raw),
        PackageManagerKind::Zypper => zypper_normalize(raw),
        PackageManagerKind::Apk => apk_normalize(raw),
        PackageManagerKind::Xbps => xbps_normalize(raw),
        PackageManagerKind::Emerge => emerge_normalize(raw),
        PackageManagerKind::Eopkg => eopkg_normalize(raw),
        PackageManagerKind::Nix => nix_normalize(raw),
        PackageManagerKind::Brew => brew_normalize(raw),
        PackageManagerKind::Port => port_normalize(raw),
        PackageManagerKind::Winget => winget_normalize(raw),
        PackageManagerKind::Choco => choco_normalize(raw),
        PackageManagerKind::Scoop => scoop_normalize(raw),
        PackageManagerKind::Static => vec![],
    };
    // Tag each result with how it was sourced so the UI can label "cached
    // (may be stale)" vs "live remote". The serde default is Cached, but we set
    // it explicitly so it always reflects the manager's real behavior.
    let src = default_index_source(kind);
    for r in results.iter_mut() {
        r.index_source = src;
    }
    results
}

/// Names of packages already installed, per manager. Used to tag results so the
/// UI can show "Installed" without a separate status pass.
pub fn installed_names(
    kind: PackageManagerKind,
    runner: &'static (dyn SearchRunner + Send + Sync),
) -> HashSet<String> {
    let bin = binary_name(kind);
    let raw = match kind {
        PackageManagerKind::Apt => runner.run(bin, &["list", "--installed"]),
        PackageManagerKind::Dnf | PackageManagerKind::Yum => runner.run(bin, &["list", "installed"]),
        PackageManagerKind::Pacman => runner.run(bin, &["-Q"]),
        PackageManagerKind::Zypper => runner.run(bin, &["search", "-i"]),
        PackageManagerKind::Apk => runner.run(bin, &["info", "-v"]),
        PackageManagerKind::Xbps => runner.run(bin, &["-l"]),
        PackageManagerKind::Emerge => runner.run(bin, &["--list-installed"]),
        PackageManagerKind::Eopkg => runner.run(bin, &["list-installed"]),
        PackageManagerKind::Nix => runner.run(bin, &["profile", "list"]),
        PackageManagerKind::Brew => runner.run(bin, &["list", "--formula"]),
        PackageManagerKind::Port => runner.run(bin, &["installed"]),
        PackageManagerKind::Winget => runner.run(bin, &["list"]),
        PackageManagerKind::Choco => runner.run(bin, &["list"]),
        PackageManagerKind::Scoop => runner.run(bin, &["list"]),
        PackageManagerKind::Static => None,
    };

    let mut set = HashSet::new();
    if let Some(raw) = raw {
        for line in raw.lines() {
            let name = match kind {
                PackageManagerKind::Apt => line
                    .split('/')
                    .next()
                    .and_then(|s| s.split_whitespace().next())
                    .unwrap_or("")
                    .to_string(),
                PackageManagerKind::Pacman => line
                    .split_whitespace()
                    .next()
                    .map(|s| s.rsplit('-').skip(1).collect::<Vec<_>>().join("-"))
                    .unwrap_or_default()
                    .to_string(),
                PackageManagerKind::Brew => line.trim().to_string(),
                PackageManagerKind::Winget => line
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .to_string(),
                _ => line
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .split('/')
                    .last()
                    .unwrap_or("")
                    .to_string(),
            };
            if !name.is_empty() {
                set.insert(name);
            }
        }
    }
    set
}

/// Collapse separators (`-`, `_`, `.`, whitespace) so that a typed phrase and a
/// package name are compared on equal footing. `"node js"`, `"node-js"`,
/// `"node.js"` and `"nodejs"` all reduce to `"nodejs"`, so a search for any of
/// them resolves the others. Used by `rank_and_filter`.
fn compact(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_whitespace() || c == '-' || c == '_' || c == '.' { '\u{0}' } else { c.to_ascii_lowercase() })
        .filter(|c: &char| *c != '\u{0}')
        .collect()
}

/// Rank and filter live-search results so they strictly reflect what the user
/// typed (see the precise-search spec):
///
///   1. Exact package-name match (normalized) — always first.
///   2. Name starts with the typed term.
///   3. Name contains the typed term as a substring.
///   4. Description contains the typed term as a substring.
///
/// Anything that doesn't hit one of those four tiers is dropped — we never
/// surface loosely "related" packages that don't actually contain the typed
/// characters. Ties keep a stable secondary sort by name. Separators are
/// normalized via `compact`, so `"node js"` and `"nodejs"` both match
/// `node.js` / `node-js`.
pub fn rank_and_filter(term: &str, mut results: Vec<SearchResult>) -> Vec<SearchResult> {
    let needle = compact(term);
    if needle.is_empty() {
        return results;
    }

    // Tier for a single result: None = doesn't match the typed phrase at all.
    let tier_of = |r: &SearchResult| -> Option<u8> {
        let name = compact(&r.name);
        if name == needle {
            Some(0)
        } else if name.starts_with(&needle) {
            Some(1)
        } else if name.contains(&needle) {
            Some(2)
        } else if compact(&r.description).contains(&needle) {
            Some(3)
        } else {
            None
        }
    };

    results.retain(|r| tier_of(r).is_some());
    results.sort_by(|a, b| {
        let ta = tier_of(a).unwrap_or(255);
        let tb = tier_of(b).unwrap_or(255);
        ta.cmp(&tb).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    results
}

/// Run a live search against `managers`, tagging results with their source
/// manager and merging duplicates (same manager + name). Installed names are
/// looked up once per manager and used to set `is_installed`.
pub fn search(
    term: &str,
    managers: &[PackageManagerKind],
    runner: &'static (dyn SearchRunner + Send + Sync),
) -> Vec<SearchResult> {
    if term.trim().is_empty() {
        return vec![];
    }

    let (tx, rx) = mpsc::channel::<(PackageManagerKind, Vec<SearchResult>)>();
    let mut handles = Vec::new();

    for mgr in managers.iter().copied() {
        let tx = tx.clone();
        let term = term.to_string();
        let handle = thread::spawn(move || {
            let argv = build_search_cmd(mgr, &term);
            // argv[0] is the actual program (may differ from `binary_name`, e.g.
            // `apt-cache` for apt offline search). Skip it to get the args.
            let (program, args) = match argv.split_first() {
                Some((p, rest)) => (p.clone(), rest.to_vec()),
                None => {
                    let _ = tx.send((mgr, vec![]));
                    return;
                }
            };
            let env = offline_env(mgr);
            let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
            let raw = match runner.run_env(&program, &args_refs, &env) {
                Some(r) => r,
                None => {
                    let _ = tx.send((mgr, vec![]));
                    return;
                }
            };
            let mut results = normalize_search(mgr, &raw);

            // Tag installed status.
            let installed = installed_names(mgr, runner);
            for r in results.iter_mut() {
                if installed.contains(&r.name) {
                    r.is_installed = true;
                    if r.installed_version.is_none() {
                        r.installed_version = Some("installed".to_string());
                    }
                }
            }

            let _ = tx.send((mgr, results));
        });
        handles.push(handle);
    }
    drop(tx);

    let mut merged: Vec<SearchResult> = Vec::new();
    let mut seen: HashSet<(PackageManagerKind, String)> = HashSet::new();
    for _ in managers.iter() {
        if let Ok((_, results)) = rx.recv() {
            for r in results {
                let key = (r.source_manager, r.name.clone());
                if seen.insert(key) {
                    merged.push(r);
                }
            }
        }
    }
    for h in handles {
        let _ = h.join();
    }
    rank_and_filter(term, merged)
}

/// Fetch details for a single package on a manager.
pub fn details(
    kind: PackageManagerKind,
    package: &str,
    runner: &'static (dyn SearchRunner + Send + Sync),
) -> PackageDetails {
    let bin = binary_name(kind);
    let argv = build_info_cmd(kind, package);
    let args: Vec<&str> = argv.iter().skip(1).map(|s| s.as_str()).collect();
    let raw = runner.run(bin, &args).unwrap_or_default();

    let mut description = String::new();
    let mut all_versions = Vec::new();
    let mut homepage = None;
    let mut license = None;

    // Generic field scan: capture common keys regardless of manager.
    for line in raw.lines() {
        let line = line.trim();
        if let Some(v) = line.strip_prefix("Description: ")
            .or_else(|| line.strip_prefix("Summary: "))
            .or_else(|| line.strip_prefix("desc:"))
        {
            if description.is_empty() {
                description = v.trim().to_string();
            }
        } else if let Some(v) = line.strip_prefix("Homepage: ")
            .or_else(|| line.strip_prefix("URL: "))
            .or_else(|| line.strip_prefix("Project URL: "))
        {
            homepage = Some(v.trim().to_string());
        } else if let Some(v) = line.strip_prefix("License: ") {
            license = Some(v.trim().to_string());
        } else if let Some(v) = line.strip_prefix("Version: ")
            .or_else(|| line.strip_prefix("Version    : "))
        {
            all_versions.push(v.trim().to_string());
        }
    }

    if description.is_empty() {
        description = format!("Package {} on {} repositories", package, bin);
    }

    PackageDetails {
        name: package.to_string(),
        canonical_id: format!("{}:{}", bin, package),
        source_manager: kind,
        description,
        all_versions,
        installed_version: None,
        homepage_url: homepage,
        license,
        installed: false,
        exact_command: argv.join(" "),
    }
}

/// Convenience: collect all manager kinds present in a detection result.
pub fn managers_from_detection(d: &DetectionResult) -> Vec<PackageManagerKind> {
    d.all_found.iter().map(|m| m.id).collect()
}
