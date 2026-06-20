import { ComponentType } from "react";

export interface NodeVersion {
    id: string;
    major: string;
    full: string;
    lts: boolean;
    installPath: string;
    installedAt: string;
    state: "installed" | "installing" | "not-installed";
    isDefault: boolean;
    downloadSize: string;
    progress?: number;
}

export interface Project {
    id: number;
    name: string;
    type: string;
    nodeVersion: string | null;
}

export interface GlobalPackage {
    name: string;
    version: string;
    description: string;
}

export interface PackageManager {
    id: "npm" | "yarn" | "pnpm" | "bun";
    name: string;
    icon: ComponentType<{ className?: string }>;
    version: string;
    installed: boolean;
}
