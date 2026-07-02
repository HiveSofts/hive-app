export interface PhpVersion {
    id: string;
    minor: string;
    patch: string;
    full: string;
    installPath: string;
    installedAt: string;
    state: "installed" | "installing" | "not-installed";
    isDefault: boolean;
    downloadSize: string;
    progress?: number;
    alias?: string;
    eol?: boolean;
    releaseDate?: string;
}

export interface Project {
    id: number;
    name: string;
    type: string;
    phpVersion: string | null;
    path?: string;
}

export interface IniSetting {
    key: string;
    value: string;
    type: "text" | "toggle" | "select";
    options?: string[];
    description: string;
    group: string;
}

export interface Extension {
    name: string;
    enabled: boolean;
    builtin: boolean;
    description?: string;
    category?: string;
}

export interface ShellAlias {
    alias: string;
    version: string;
    command: string;
    isActive: boolean;
}