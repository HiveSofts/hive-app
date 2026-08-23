use super::types::{OsFamily, PackageManager, PackageManagerKind};

/// Action performed by a managed install command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PmAction {
    Install,
    Update,
    Remove,
}

/// Registry of every supported package manager.
///
/// Extensibility: to support a new manager, add one entry here and the
/// matching rows in `catalog.json`. Core detection/resolution logic is
/// data-driven and does not need to change.
///
/// `priority` rules:
///   - dnf(90) > yum(80)   (yum may be symlinked to dnf)
///   - distro-native managers(90) > nix(40)
///   - mac: brew(90) > port(70)
///   - win: winget(90) > choco(70) > scoop(60)
///   - Static is only used as an explicit fallback (never auto-preferred).
pub static MANAGERS: &[PackageManager] = &[
    PackageManager {
        kind: PackageManagerKind::Apt,
        display: "APT",
        os: OsFamily::Linux,
        requires_elevation: true,
        priority: 90,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Dnf,
        display: "DNF",
        os: OsFamily::Linux,
        requires_elevation: true,
        priority: 90,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Yum,
        display: "YUM",
        os: OsFamily::Linux,
        requires_elevation: true,
        priority: 80,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Pacman,
        display: "Pacman",
        os: OsFamily::Linux,
        requires_elevation: true,
        priority: 90,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Zypper,
        display: "Zypper",
        os: OsFamily::Linux,
        requires_elevation: true,
        priority: 90,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Apk,
        display: "APK",
        os: OsFamily::Linux,
        requires_elevation: true,
        priority: 90,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Xbps,
        display: "XBPS",
        os: OsFamily::Linux,
        requires_elevation: true,
        priority: 90,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Emerge,
        display: "Portage (emerge)",
        os: OsFamily::Linux,
        requires_elevation: true,
        priority: 90,
        source_based: true,
    },
    PackageManager {
        kind: PackageManagerKind::Eopkg,
        display: "eopkg",
        os: OsFamily::Linux,
        requires_elevation: true,
        priority: 90,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Nix,
        display: "Nix",
        os: OsFamily::Linux,
        requires_elevation: false,
        priority: 40,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Brew,
        display: "Homebrew",
        os: OsFamily::Macos,
        requires_elevation: false,
        priority: 90,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Port,
        display: "MacPorts",
        os: OsFamily::Macos,
        requires_elevation: true,
        priority: 70,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Winget,
        display: "winget",
        os: OsFamily::Windows,
        requires_elevation: false,
        priority: 90,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Choco,
        display: "Chocolatey",
        os: OsFamily::Windows,
        requires_elevation: false,
        priority: 70,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Scoop,
        display: "Scoop",
        os: OsFamily::Windows,
        requires_elevation: false,
        priority: 60,
        source_based: false,
    },
    PackageManager {
        kind: PackageManagerKind::Static,
        display: "Static Binary (Hive-managed)",
        os: OsFamily::Linux,
        requires_elevation: false,
        priority: 0,
        source_based: false,
    },
];

/// Returns the registry entry for a manager kind, if known.
pub fn get_manager(kind: PackageManagerKind) -> Option<&'static PackageManager> {
    MANAGERS.iter().find(|m| m.kind == kind)
}

/// Whether installing with this manager normally requires privileged write
/// (elevation). Mirrors the install-time check used by the installer module.
pub fn requires_elevation(kind: PackageManagerKind) -> bool {
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

/// Returns all managers belonging to an OS family (excluding Static).
pub fn managers_for_os(os: OsFamily) -> Vec<&'static PackageManager> {
    MANAGERS.iter().filter(|m| m.os == os && m.kind != PackageManagerKind::Static).collect()
}

/// The binary name probed on PATH for each manager.
pub fn binary_name(kind: PackageManagerKind) -> &'static str {
    match kind {
        PackageManagerKind::Apt => "apt-get",
        PackageManagerKind::Dnf => "dnf",
        PackageManagerKind::Yum => "yum",
        PackageManagerKind::Pacman => "pacman",
        PackageManagerKind::Zypper => "zypper",
        PackageManagerKind::Apk => "apk",
        PackageManagerKind::Xbps => "xbps-install",
        PackageManagerKind::Emerge => "emerge",
        PackageManagerKind::Eopkg => "eopkg",
        PackageManagerKind::Nix => "nix",
        PackageManagerKind::Brew => "brew",
        PackageManagerKind::Port => "port",
        PackageManagerKind::Winget => "winget",
        PackageManagerKind::Choco => "choco",
        PackageManagerKind::Scoop => "scoop",
        PackageManagerKind::Static => "",
    }
}

/// Builds the command argv for an action against a package on the given
/// manager. The first element is the manager binary; callers prepend an
/// elevation prefix (e.g. `pkexec`) when required.
///
/// Pure function — easy to unit test without executing anything.
pub fn build_install_cmd(kind: PackageManagerKind, action: PmAction, pkg: &str) -> Vec<String> {
    match kind {
        PackageManagerKind::Apt => match action {
            PmAction::Install => vec!["apt-get".into(), "install".into(), "-y".into(), pkg.into()],
            PmAction::Update => vec!["apt-get".into(), "install".into(), "-y".into(), "--only-upgrade".into(), pkg.into()],
            PmAction::Remove => vec!["apt-get".into(), "remove".into(), "-y".into(), pkg.into()],
        },
        PackageManagerKind::Dnf | PackageManagerKind::Yum => match action {
            PmAction::Install => vec![binary_name(kind).into(), "install".into(), "-y".into(), pkg.into()],
            PmAction::Update => vec![binary_name(kind).into(), "upgrade".into(), "-y".into(), pkg.into()],
            PmAction::Remove => vec![binary_name(kind).into(), "remove".into(), "-y".into(), pkg.into()],
        },
        PackageManagerKind::Pacman => match action {
            PmAction::Install => vec!["pacman".into(), "-S".into(), "--noconfirm".into(), pkg.into()],
            PmAction::Update => vec!["pacman".into(), "-S".into(), "--noconfirm".into(), pkg.into()],
            PmAction::Remove => vec!["pacman".into(), "-R".into(), "--noconfirm".into(), pkg.into()],
        },
        PackageManagerKind::Zypper => match action {
            PmAction::Install => vec!["zypper".into(), "install".into(), "-y".into(), pkg.into()],
            PmAction::Update => vec!["zypper".into(), "update".into(), "-y".into(), pkg.into()],
            PmAction::Remove => vec!["zypper".into(), "remove".into(), "-y".into(), pkg.into()],
        },
        PackageManagerKind::Apk => match action {
            PmAction::Install => vec!["apk".into(), "add".into(), pkg.into()],
            PmAction::Update => vec!["apk".into(), "add".into(), "-u".into(), pkg.into()],
            PmAction::Remove => vec!["apk".into(), "del".into(), pkg.into()],
        },
        PackageManagerKind::Xbps => match action {
            PmAction::Install => vec!["xbps-install".into(), "-y".into(), pkg.into()],
            PmAction::Update => vec!["xbps-install".into(), "-u".into(), "-y".into(), pkg.into()],
            PmAction::Remove => vec!["xbps-remove".into(), "-y".into(), pkg.into()],
        },
        PackageManagerKind::Emerge => match action {
            PmAction::Install => vec!["emerge".into(), pkg.into()],
            PmAction::Update => vec!["emerge".into(), "--update".into(), pkg.into()],
            PmAction::Remove => vec!["emerge".into(), "--unmerge".into(), pkg.into()],
        },
        PackageManagerKind::Eopkg => match action {
            PmAction::Install => vec!["eopkg".into(), "install".into(), pkg.into()],
            PmAction::Update => vec!["eopkg".into(), "upgrade".into(), pkg.into()],
            PmAction::Remove => vec!["eopkg".into(), "remove".into(), pkg.into()],
        },
        PackageManagerKind::Nix => match action {
            PmAction::Install => vec!["nix".into(), "profile".into(), "install".into(), format!("nixpkgs#{}", pkg)],
            PmAction::Update => vec!["nix".into(), "profile".into(), "upgrade".into(), format!("nixpkgs#{}", pkg)],
            PmAction::Remove => vec!["nix".into(), "profile".into(), "remove".into(), pkg.into()],
        },
        PackageManagerKind::Brew => match action {
            PmAction::Install => vec!["brew".into(), "install".into(), pkg.into()],
            PmAction::Update => vec!["brew".into(), "upgrade".into(), pkg.into()],
            PmAction::Remove => vec!["brew".into(), "uninstall".into(), pkg.into()],
        },
        PackageManagerKind::Port => match action {
            PmAction::Install => vec!["port".into(), "install".into(), pkg.into()],
            PmAction::Update => vec!["port".into(), "selfupdate".into(), pkg.into()],
            PmAction::Remove => vec!["port".into(), "uninstall".into(), pkg.into()],
        },
        PackageManagerKind::Winget => match action {
            PmAction::Install => vec![
                "winget".into(),
                "install".into(),
                "--exact".into(),
                "--id".into(),
                pkg.into(),
                "--accept-package-agreements".into(),
                "--accept-source-agreements".into(),
            ],
            PmAction::Update => vec!["winget".into(), "upgrade".into(), "--exact".into(), "--id".into(), pkg.into()],
            PmAction::Remove => vec!["winget".into(), "uninstall".into(), "--exact".into(), "--id".into(), pkg.into()],
        },
        PackageManagerKind::Choco => match action {
            PmAction::Install => vec!["choco".into(), "install".into(), pkg.into(), "-y".into()],
            PmAction::Update => vec!["choco".into(), "upgrade".into(), pkg.into(), "-y".into()],
            PmAction::Remove => vec!["choco".into(), "uninstall".into(), pkg.into(), "-y".into()],
        },
        PackageManagerKind::Scoop => match action {
            PmAction::Install => vec!["scoop".into(), "install".into(), pkg.into()],
            PmAction::Update => vec!["scoop".into(), "update".into(), pkg.into()],
            PmAction::Remove => vec!["scoop".into(), "uninstall".into(), pkg.into()],
        },
        PackageManagerKind::Static => vec![],
    }
}
