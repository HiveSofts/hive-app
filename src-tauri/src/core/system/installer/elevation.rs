use std::process::Command;

/// How a managed install should be elevated.
#[derive(Debug, Clone, Default)]
pub enum ElevationKind {
    /// No elevation needed / manager self-elevates (UAC).
    #[default]
    None,
    /// Wrap the command with `pkexec` (graphical sudo on Linux).
    Pkexec,
    /// Wrap the command with `sudo` (terminal sudo).
    Sudo,
}

/// Resolved elevation plan for a manager that requires privilege.
#[derive(Debug, Clone, Default)]
pub struct Elevation {
    pub needs: bool,
    pub kind: ElevationKind,
}

fn which(bin: &str) -> bool {
    let probe = if cfg!(windows) { "where" } else { "which" };
    Command::new(probe)
        .arg(bin)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Determine how (and whether) to elevate for a manager that `requires`
/// privilege. macOS/Windows managers self-elevate via UAC, so we don't add a
/// prefix; on Linux we prefer `pkexec` (graphical) then fall back to `sudo`.
pub fn resolve_elevation(requires: bool) -> Elevation {
    if !requires {
        return Elevation::default();
    }

    if cfg!(target_os = "linux") {
        if which("pkexec") {
            return Elevation { needs: true, kind: ElevationKind::Pkexec };
        }
        if which("sudo") {
            return Elevation { needs: true, kind: ElevationKind::Sudo };
        }
        // No graphical/terminal helper available: caller must surface the
        // command for the user to run manually.
        return Elevation { needs: true, kind: ElevationKind::None };
    }

    // macOS/Windows: winget/choco/brew handle elevation internally via UAC.
    Elevation { needs: true, kind: ElevationKind::None }
}

/// The argv prefix (e.g. `["pkexec"]`) to prepend before the manager command.
pub fn elevation_prefix(e: &Elevation) -> Vec<String> {
    match e.kind {
        ElevationKind::Pkexec => vec!["pkexec".into()],
        ElevationKind::Sudo => vec!["sudo".into()],
        ElevationKind::None => vec![],
    }
}
