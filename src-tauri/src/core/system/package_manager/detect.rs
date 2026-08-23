use std::process::Command;

use super::registry::{MANAGERS, binary_name};
use super::types::*;

/// Abstraction over OS command execution so detection can be unit-tested
/// without touching the real filesystem / PATH (NFR: OS-independent tests).
pub trait CommandExecutor {
    /// True if `bin` resolves on PATH (`which`/`where`, with a direct-invoke fallback).
    fn exists_on_path(&self, bin: &str) -> bool;
    /// Run `bin args` and return trimmed stdout (or stderr) on success.
    fn run_version(&self, bin: &str, args: &[&str]) -> Option<String>;
    /// Raw contents of `/etc/os-release`, if readable.
    fn read_os_release(&self) -> Option<String>;
}

/// The real executor used by Tauri commands.
pub struct SystemExecutor;

impl CommandExecutor for SystemExecutor {
    fn exists_on_path(&self, bin: &str) -> bool {
        let probe = if cfg!(windows) { "where" } else { "which" };
        if Command::new(probe)
            .arg(bin)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            return true;
        }
        // Fallback: `which`/`where` may be absent in minimal environments.
        Command::new(bin)
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    fn run_version(&self, bin: &str, args: &[&str]) -> Option<String> {
        let mut cmd = Command::new(bin);
        for a in args {
            cmd.arg(a);
        }
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

    fn read_os_release(&self) -> Option<String> {
        std::fs::read_to_string("/etc/os-release").ok()
    }
}

/// Parse `/etc/os-release` content into structured distro context.
/// Pure function — testable without reading a file.
pub fn parse_os_release(content: &str) -> DistroInfo {
    let mut id = None;
    let mut id_like = None;
    let mut name = None;

    for line in content.lines() {
        let (key, value) = match line.split_once('=') {
            Some((k, v)) => (k.trim(), v.trim().trim_matches('"')),
            None => continue,
        };
        match key {
            "ID" => id = Some(value.to_string()),
            "ID_LIKE" => id_like = Some(value.to_string()),
            "PRETTY_NAME" => name = Some(value.to_string()),
            _ => {}
        }
    }

    DistroInfo { id, id_like, name }
}

fn current_os_family() -> OsFamily {
    match std::env::consts::OS {
        "macos" => OsFamily::Macos,
        "windows" => OsFamily::Windows,
        _ => OsFamily::Linux,
    }
}

/// Detect every supported manager present on PATH, then choose a recommended
/// one using priority order and distro context.
pub fn detect_managers(exec: &dyn CommandExecutor) -> DetectionResult {
    let os_family = current_os_family();
    let distro = exec
        .read_os_release()
        .map(|c| parse_os_release(&c))
        .unwrap_or_default();

    let mut found: Vec<DetectedManager> = Vec::new();

    for m in MANAGERS.iter() {
        if m.kind == PackageManagerKind::Static || m.os != os_family {
            continue;
        }
        let bin = binary_name(m.kind);
        if !bin.is_empty() && exec.exists_on_path(bin) {
            let version = exec.run_version(bin, &["--version"]);
            found.push(DetectedManager {
                id: m.kind,
                display: m.display.to_string(),
                version,
                requires_elevation: m.requires_elevation,
                priority: m.priority,
                source_based: m.source_based,
                index_updated_at: None,
            });
        }
    }

    // Priority is highest first; tie-break by display name.
    found.sort_by(|a, b| {
        b.priority
            .cmp(&a.priority)
            .then_with(|| a.display.cmp(&b.display))
    });

    // NixOS is the one case where Nix should win over a possibly-present
    // foreign manager: boost Nix when explicitly detected.
    if distro.id.as_deref() == Some("nixos") {
        found.sort_by(|a, b| {
            let a_nix = a.id == PackageManagerKind::Nix;
            let b_nix = b.id == PackageManagerKind::Nix;
            b_nix.cmp(&a_nix).then_with(|| b.priority.cmp(&a.priority))
        });
    }

    let recommended = found.first().cloned();
    let uses_static_fallback = found.is_empty();

    DetectionResult {
        all_found: found,
        recommended,
        os_family,
        distro,
        uses_static_fallback,
    }
}
