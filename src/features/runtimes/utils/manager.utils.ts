import type { PackageManagerKind } from "../types/package.types";

/// Human-readable label for each manager kind (mirrors registry display names).
export const MANAGER_LABELS: Record<PackageManagerKind, string> = {
    apt: "APT",
    dnf: "DNF",
    yum: "YUM",
    pacman: "Pacman",
    zypper: "Zypper",
    apk: "APK",
    xbps: "XBPS",
    emerge: "Portage",
    eopkg: "eopkg",
    nix: "Nix",
    brew: "Homebrew",
    port: "MacPorts",
    winget: "winget",
    choco: "Chocolatey",
    scoop: "Scoop",
    static: "Static",
};

export function managerLabel(kind: PackageManagerKind): string {
    return MANAGER_LABELS[kind] ?? kind;
}
