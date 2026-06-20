import { invoke } from "@tauri-apps/api/core";
import { homeDir } from "@tauri-apps/api/path";

import { Arch, NodeManifest, OS, PhpManifest, RuntimeInfo } from "../types";

export const PHP_MANIFEST_URL =
    "https://raw.githubusercontent.com/LaraPire/hive-runtime-php/refs/heads/main/manifest.json";
export const NODE_MANIFEST_URL =
    "https://raw.githubusercontent.com/LaraPire/hive-runtime-nodejs/refs/heads/main/manifest.json";

let cachedHomeDir: string | null = null;

export async function expandHomePath(path: string): Promise<string> {
    if (!cachedHomeDir) {
        cachedHomeDir = await homeDir();
    }
    return path.replace(/^~/, cachedHomeDir);
}

export function hiveInstallPath(type: "php" | "node", version: string): string {
    return `~/.hive/runtimes/${type}/${version}`;
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function getPhpDownloadUrl(entry: PhpManifest["php"][string], os: OS): string | null {
    if (os === "windows") return entry.windows?.url ?? null;
    if (os === "linux") return entry.linux?.url ?? null;
    return null;
}

export function getNodeDownloadUrl(
    entry: NodeManifest["node"][string],
    os: OS,
    arch: Arch
): string | null {
    if (os === "windows") return entry.windows?.url ?? null;
    if (os === "linux") return entry.linux?.url ?? null;
    if (os === "macos") return entry.macos?.[arch]?.url ?? null;
    return null;
}

export async function detectPhp(): Promise<RuntimeInfo> {
    try {
        const result = await invoke<{ version: string; path: string; is_hive: boolean }>(
            "detect_php"
        );
        return { found: true, version: result.version, path: result.path, isHive: result.is_hive };
    } catch {
        return { found: false };
    }
}

export async function detectNode(): Promise<RuntimeInfo> {
    try {
        const result = await invoke<{ version: string; path: string; is_hive: boolean }>(
            "detect_node"
        );
        return { found: true, version: result.version, path: result.path, isHive: result.is_hive };
    } catch {
        return { found: false };
    }
}

export async function getInstalledHiveRuntimes(type: "php" | "node"): Promise<string[]> {
    try {
        return await invoke<string[]>("get_installed_runtimes", { type });
    } catch {
        return [];
    }
}

export async function downloadAndExtract(
    runtime: string,
    version: string,
    url: string,
    archiveType: string
): Promise<void> {
    await invoke("install_runtime", {
        runtime,
        version,
        downloadUrl: url,
        archiveType,
    });
}

export async function checkAndInstallDependencies(): Promise<
    {
        step: string;
        message: string;
        progress: number | null;
        success: boolean;
    }[]
> {
    return await invoke("check_and_install_dependencies");
}

export async function getOs(): Promise<OS> {
    return await invoke<OS>("get_os");
}

export async function getArch(): Promise<Arch> {
    return await invoke<Arch>("get_arch");
}

export async function fetchPhpManifest(): Promise<PhpManifest> {
    const response = await fetch(PHP_MANIFEST_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function fetchNodeManifest(): Promise<NodeManifest> {
    const response = await fetch(NODE_MANIFEST_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}
