export type LangId = "php" | "node" | "python" | "go" | "rust" | "java" | "ruby" | "dotnet";

export interface RuntimeVersion {
    version: string;
    installed: boolean;
    path?: string;
    isDefault?: boolean;
}

export interface LangMeta {
    id: LangId;
    name: string;
    icon: string;
    color: string;
    accent: string;
    description: string;
    versions: RuntimeVersion[];
    currentVersion: string | null;
    installed: boolean;
    packageManager: string;
    website: string;
    installPath?: string;
}

export interface Extension {
    name: string;
    enabled: boolean;
    version?: string;
    description?: string;
    category: string;
}

export interface IniSetting {
    key: string;
    value: string;
    description: string;
    type: "string" | "number" | "boolean" | "select";
    options?: string[];
}

export interface EnvVar {
    key: string;
    value: string;
    description: string;
}

export interface PhpInfo {
    version: string;
    sapi: string;
    extensions: Extension[];
    ini_settings: IniSetting[];
}

export interface AccentColors {
    bg: string;
    text: string;
    border: string;
    badge: string;
}

export interface ComposerPackage {
    name: string;
    version: string;
    type?: string;
    description?: string;
}

export interface PhpIniSetting {
    key: string;
    value: string;
}

export interface PhpIniFileInfo {
    path: string;
    content: string;
    isWritable: boolean;
}

export interface PhpExtensionToggleResult {
    success: boolean;
    message: string;
    requiresRestart: boolean;
}

export interface PhpVersionInfo {
    version: string;
    sapi: string;
    extensions: Extension[];
    ini_settings: IniSetting[];
    ini_path: string;
}