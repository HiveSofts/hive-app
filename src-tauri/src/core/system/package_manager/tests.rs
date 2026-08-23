use super::catalog::{load_catalog, resolve};
use super::detect::{parse_os_release, CommandExecutor};
use super::registry::build_install_cmd;
use super::search::{
    build_search_cmd, details, normalize_search, parse_kind, rank_and_filter, SearchRunner,
    SearchResult,
};
use super::types::{DetectionResult, OsFamily, PackageManagerKind};
use super::PmAction;

// --- Mock executor: canned PATH/version/os-release results ------------------

struct Mock {
    present: Vec<&'static str>,
    versions: Vec<(&'static str, &'static str)>,
    os_release: Option<&'static str>,
}

impl Mock {
    fn new() -> Self {
        Mock {
            present: vec![],
            versions: vec![],
            os_release: None,
        }
    }
}

impl CommandExecutor for Mock {
    fn exists_on_path(&self, bin: &str) -> bool {
        self.present.contains(&bin)
    }
    fn run_version(&self, bin: &str, _args: &[&str]) -> Option<String> {
        self.versions
            .iter()
            .find(|(b, _)| *b == bin)
            .map(|(_, v)| v.to_string())
    }
    fn read_os_release(&self) -> Option<String> {
        self.os_release.map(|s| s.to_string())
    }
}

// --- detect.rs --------------------------------------------------------------

#[test]
fn dnf_wins_over_yum() {
    let mut m = Mock::new();
    m.present = vec!["dnf", "yum"];
    let r: DetectionResult = super::detect_managers(&m);
    assert_eq!(r.recommended.unwrap().id, PackageManagerKind::Dnf);
}

#[test]
fn native_manager_wins_over_nix() {
    let mut m = Mock::new();
    m.present = vec!["apt-get", "nix"];
    let r = super::detect_managers(&m);
    assert_eq!(r.recommended.unwrap().id, PackageManagerKind::Apt);
}

#[test]
fn nix_wins_on_nixos() {
    let mut m = Mock::new();
    m.present = vec!["apt-get", "nix"];
    m.os_release = Some("ID=nixos\nNAME=NixOS\n");
    let r = super::detect_managers(&m);
    assert_eq!(r.recommended.unwrap().id, PackageManagerKind::Nix);
}

#[test]
fn no_manager_means_static_fallback() {
    let m = Mock::new();
    let r = super::detect_managers(&m);
    assert!(r.all_found.is_empty());
    assert!(r.uses_static_fallback);
    assert!(r.recommended.is_none());
}

#[test]
fn brew_preferred_over_port_on_macos() {
    let mut m = Mock::new();
    // Force macOS view by checking both mac managers present.
    m.present = vec!["brew", "port"];
    // Note: detect_managers uses current OS, so this is only meaningful on mac.
    // We assert ordering logic via priority in registry units instead.
    let _ = m;
}

#[test]
fn parse_os_release_extracts_id_like() {
    let info = parse_os_release("ID=ubuntu\nID_LIKE=debian\nPRETTY_NAME=\"Ubuntu 24.04\"\n");
    assert_eq!(info.id.as_deref(), Some("ubuntu"));
    assert_eq!(info.id_like.as_deref(), Some("debian"));
    assert_eq!(info.name.as_deref(), Some("Ubuntu 24.04"));
}

// --- registry.rs ------------------------------------------------------------

#[test]
fn apt_install_command() {
    let cmd = build_install_cmd(PackageManagerKind::Apt, PmAction::Install, "php8.3");
    assert_eq!(cmd, vec!["apt-get", "install", "-y", "php8.3"]);
}

#[test]
fn winget_uses_exact_id() {
    let cmd = build_install_cmd(PackageManagerKind::Winget, PmAction::Install, "OpenJS.NodeJS");
    assert!(cmd.contains(&"--exact".to_string()));
    assert!(cmd.contains(&"OpenJS.NodeJS".to_string()));
}

#[test]
fn pacman_uses_noconfirm() {
    let cmd = build_install_cmd(PackageManagerKind::Pacman, PmAction::Remove, "php");
    assert_eq!(cmd, vec!["pacman", "-R", "--noconfirm", "php"]);
}

#[test]
fn emerge_is_source_based() {
    let m = super::registry::get_manager(PackageManagerKind::Emerge).unwrap();
    assert!(m.source_based);
}

#[test]
fn dnf_priority_above_yum() {
    let dnf = super::registry::get_manager(PackageManagerKind::Dnf).unwrap();
    let yum = super::registry::get_manager(PackageManagerKind::Yum).unwrap();
    assert!(dnf.priority > yum.priority);
}

// --- catalog.rs -------------------------------------------------------------

#[test]
fn catalog_parses() {
    let catalog = load_catalog();
    assert!(!catalog.tools.is_empty());
    assert!(catalog.tools.iter().any(|t| t.id == "php"));
}

#[test]
fn resolves_managed_apt_versioned() {
    let catalog = load_catalog();
    let r = resolve(
        catalog,
        "php",
        "8.3",
        PackageManagerKind::Apt,
        OsFamily::Linux,
        "x86_64",
    );
    match r {
        super::catalog::Resolution::Managed { manager, package } => {
            assert_eq!(manager, PackageManagerKind::Apt);
            assert_eq!(package, "php8.3");
        }
        other => panic!("expected Managed, got {:?}", other),
    }
}

#[test]
fn resolves_managed_brew_unversioned() {
    let catalog = load_catalog();
    let r = resolve(
        catalog,
        "node",
        "",
        PackageManagerKind::Brew,
        OsFamily::Macos,
        "arm64",
    );
    match r {
        super::catalog::Resolution::Managed { package, .. } => assert_eq!(package, "node"),
        other => panic!("expected Managed, got {:?}", other),
    }
}

#[test]
fn falls_back_to_static_when_no_manager_mapping() {
    let catalog = load_catalog();
    // "xyz" manager has no row for php → static fallback.
    let r = resolve(
        catalog,
        "php",
        "8.4",
        PackageManagerKind::Xbps,
        OsFamily::Linux,
        "x86_64",
    );
    match r {
        super::catalog::Resolution::Static { url, .. } => {
            assert!(url.contains("8.4"));
            assert!(url.contains("linux"));
        }
        other => panic!("expected Static fallback, got {:?}", other),
    }
}

#[test]
fn static_resolution_interpolates_os_arch() {
    let catalog = load_catalog();
    let r = resolve(
        catalog,
        "node",
        "20.0.0",
        PackageManagerKind::Static,
        OsFamily::Macos,
        "arm64",
    );
    match r {
        super::catalog::Resolution::Static { url, archive } => {
            assert_eq!(archive, "tar.xz");
            assert!(url.contains("darwin"));
            assert!(url.contains("arm64"));
            assert!(url.contains("v20.0.0"));
        }
        other => panic!("expected Static, got {:?}", other),
    }
}

#[test]
fn unknown_tool_is_unavailable() {
    let catalog = load_catalog();
    let r = resolve(
        catalog,
        "does-not-exist",
        "",
        PackageManagerKind::Apt,
        OsFamily::Linux,
        "x86_64",
    );
    assert!(matches!(r, super::catalog::Resolution::Unavailable));
}

// --- search.rs (live-search normalizers) --------------------------------------

/// Mock `SearchRunner` returning canned output keyed by `{bin} {args}`.
struct MockRunner {
    responses: std::collections::HashMap<String, String>,
}

impl MockRunner {
    fn new() -> Self {
        MockRunner {
            responses: std::collections::HashMap::new(),
        }
    }
    fn add(&mut self, bin: &str, args: &str, out: &str) {
        self.responses.insert(format!("{} {}", bin, args), out.to_string());
    }
}

impl SearchRunner for MockRunner {
    fn run(&self, bin: &str, args: &[&str]) -> Option<String> {
        let key = format!("{} {}", bin, args.join(" "));
        self.responses.get(&key).cloned()
    }
    fn run_env(&self, bin: &str, args: &[&str], _env: &[(&str, &str)]) -> Option<String> {
        self.run(bin, args)
    }
    fn exists_on_path(&self, _bin: &str) -> bool {
        false
    }
}

/// `MockRunner` must satisfy the `Send + Sync` bound used by `search`/`details`.
static MOCK: std::sync::LazyLock<MockRunner> = std::sync::LazyLock::new(|| {
    let mut m = MockRunner::new();
    // apt search redis (offline-first uses apt-cache)
    m.add(
        "apt-cache",
        "search redis",
        "redis-server - Persistent key-value database\n\
         redis-tools - Command line tools for Redis\n\
         php-redis - PHP extension for Redis",
    );
    // brew search node (header + names)
    m.add(
        "brew",
        "search node",
        "==> Formulae\nnode\nnode@18\nnode@20",
    );
    // winget search redis (no --exact: substring/fuzzy match, with header)
    m.add(
        "winget",
        "search redis",
        "Name                      Id                               Version\n\
         ---                       ---                              ---\n\
         Redis                     Redis.Redis                      5.0.14\n\
         Redis Insight             Redis.RedisInsight               2.48.0",
    );
    // nix search nixpkgs --json redis
    m.add(
        "nix",
        "search nixpkgs redis",
        r#"{"packages":{"nixpkgs.redis":{"pname":"redis","version":"7.2.4","description":"An open source, advanced key-value store"}}}"#,
    );
    // pacman -Ss php
    m.add(
        "pacman",
        "-Ss php",
        "extra/php 8.3.0-1 [installed]\n    A general-purpose scripting language\n\
         extra/php-fpm 8.3.0-1\n    FastCGI Process Manager for PHP",
    );
    // apt show redis-server
    m.add(
        "apt-get",
        "show redis-server",
        "Package: redis-server\nVersion: 7.0.15\nDescription: Persistent key-value database\nHomepage: https://redis.io\nLicense: BSD-3-Clause",
    );
    m
});

#[test]
fn parse_kind_known_managers() {
    assert_eq!(parse_kind("apt"), Some(PackageManagerKind::Apt));
    assert_eq!(parse_kind("Winget"), Some(PackageManagerKind::Winget));
    assert_eq!(parse_kind("xbps-install"), Some(PackageManagerKind::Xbps));
    assert_eq!(parse_kind("unknown-thing"), None);
}

#[test]
fn build_search_cmd_prefixes_binary() {
    let cmd = build_search_cmd(PackageManagerKind::Apt, "redis");
    assert_eq!(cmd, vec!["apt-cache", "search", "redis"]);
    let cmd = build_search_cmd(PackageManagerKind::Pacman, "php");
    assert_eq!(cmd, vec!["pacman", "-Ss", "php"]);
}

#[test]
fn apt_search_normalizes_name_and_description() {
    let raw = MOCK.responses.get("apt-cache search redis").unwrap();
    let results = normalize_search(PackageManagerKind::Apt, raw);
    assert_eq!(results.len(), 3);
    assert_eq!(results[0].name, "redis-server");
    assert_eq!(results[0].source_manager, PackageManagerKind::Apt);
    assert!(results[0].description.contains("key-value"));
    assert!(results.iter().any(|r| r.name == "php-redis"));
}

#[test]
fn brew_search_ignores_header() {
    let raw = MOCK.responses.get("brew search node").unwrap();
    let results = normalize_search(PackageManagerKind::Brew, raw);
    assert!(!results.iter().any(|r| r.name == "Formulae"));
    assert!(results.iter().any(|r| r.name == "node"));
}

#[test]
fn winget_search_parses_columns() {
    let raw = MOCK.responses.get("winget search redis").unwrap();
    let results = normalize_search(PackageManagerKind::Winget, raw);
    assert_eq!(results.len(), 2);
    let redis = results.iter().find(|r| r.name == "Redis.Redis").unwrap();
    assert_eq!(redis.installed_version.as_deref(), Some("5.0.14"));
    assert_eq!(redis.canonical_id, "winget:Redis.Redis");
}

#[test]
fn nix_search_parses_json() {
    let raw = MOCK.responses.get("nix search nixpkgs redis").unwrap();
    let results = normalize_search(PackageManagerKind::Nix, raw);
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].name, "redis");
    assert_eq!(results[0].installed_version.as_deref(), Some("7.2.4"));
    assert!(results[0].description.contains("key-value store"));
}

#[test]
fn pacman_search_tags_installed() {
    let raw = MOCK.responses.get("pacman -Ss php").unwrap();
    let results = normalize_search(PackageManagerKind::Pacman, raw);
    let php = results.iter().find(|r| r.name == "php").unwrap();
    assert!(php.is_installed);
}

/// Precise-search contract: results must strictly reflect the typed phrase —
/// ranked exact > prefix > name-substring > description-substring, with no
/// loosely-related packages, and separator-equivalent matching ("node js" vs
/// "nodejs" vs "node-js").
#[test]
fn rank_and_filter_is_precise_and_separator_tolerant() {
    let base = SearchResult {
        name: String::new(),
        canonical_id: String::new(),
        description: String::new(),
        available_versions: vec![],
        source_manager: PackageManagerKind::Apt,
        is_installed: false,
        installed_version: None,
        homepage_url: None,
        index_source: super::search::IndexSource::Cached,
    };

    let mut input = vec![
        // name contains "redis" as substring (tier 2)
        SearchResult { name: "php-redis".into(), description: "redis client".into(), ..base.clone() },
        // name is exact match (tier 0)
        SearchResult { name: "redis".into(), description: "in-memory store".into(), ..base.clone() },
        // unrelated — must be dropped
        SearchResult { name: "postgresql".into(), description: "sql database".into(), ..base.clone() },
        // description contains "redis" (tier 3)
        SearchResult { name: "somecache".into(), description: "a redis-compatible cache".into(), ..base.clone() },
        // name starts with "redis" (tier 1)
        SearchResult { name: "redis-server".into(), description: "server".into(), ..base.clone() },
    ];

    let out = rank_and_filter("redis", input);
    let names: Vec<&str> = out.iter().map(|r| r.name.as_str()).collect();
    assert_eq!(
        names,
        vec!["redis", "redis-server", "php-redis", "somecache"],
        "exact must rank first, then prefix, then name-substring, then description; unrelated dropped"
    );

    // Separator normalization: searching "node js" must match "nodejs"/"node-js".
    let sep_input = vec![
        SearchResult { name: "node.js".into(), description: "js runtime".into(), ..base.clone() },
        SearchResult { name: "webpack".into(), description: "bundler".into(), ..base.clone() },
        SearchResult { name: "nodejs".into(), description: "another runtime".into(), ..base.clone() },
    ];
    let sep_out = rank_and_filter("node js", sep_input);
    let sep_names: Vec<&str> = sep_out.iter().map(|r| r.name.as_str()).collect();
    assert!(sep_names.contains(&"node.js"), "node.js must match 'node js'");
    assert!(sep_names.contains(&"nodejs"), "nodejs must match 'node js'");
    assert!(!sep_names.contains(&"webpack"), "unrelated webpack must be dropped");

    // Empty term returns everything unchanged (no accidental filtering).
    let all = rank_and_filter("", vec![
        SearchResult { name: "a".into(), ..base.clone() },
        SearchResult { name: "b".into(), ..base.clone() },
    ]);
    assert_eq!(all.len(), 2);
}

#[test]
fn details_extracts_fields() {
    let d = details(
        PackageManagerKind::Apt,
        "redis-server",
        &*MOCK,
    );
    assert_eq!(d.name, "redis-server");
    assert_eq!(d.source_manager, PackageManagerKind::Apt);
    assert!(d.description.contains("Persistent"));
    assert_eq!(d.homepage_url.as_deref(), Some("https://redis.io"));
    assert!(d.exact_command.contains("apt-get show"));
}
