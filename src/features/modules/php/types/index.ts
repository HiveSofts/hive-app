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
}

export interface Project {
    id: number;
    name: string;
    type: string;
    phpVersion: string | null;
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
}
