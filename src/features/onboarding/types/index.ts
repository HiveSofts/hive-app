export interface UserConfig {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    bio: string;
    company: string;
    website: string;
    avatar: string | null;
    github: string;
    twitter: string;
    linkedin: string;
    theme: "light" | "dark" | "system";
    accentColor: string;
    sidebarCollapsed: boolean;
    fontSize: "small" | "medium" | "large";
    animations: boolean;
    hivePath: string;
    defaultProjectsPath: string;
    hiveDataPath: string;
    domainTld: string;
    dnsResolver: "auto" | "dnsmasq" | "acrylic";
    proxyPort: number;
    autoStartProxy: boolean;
    launchOnLogin: boolean;
    startServicesOnLaunch: boolean;
    startLastProjects: boolean;
    minimizeToTray: boolean;
    emailNotifications: boolean;
    desktopNotifications: boolean;
    soundEffects: boolean;
    autoUpdate: boolean;
    telemetry: boolean;
    userCode: string;
    githubStarred: boolean;
    onboarding_complete: boolean;
    phpVersion?: string;
    nodeVersion?: string;
    phpPath?: string;
    nodePath?: string;
}

export interface RuntimeInfo {
    found: boolean;
    version?: string;
    path?: string;
    isHive?: boolean;
}

export interface InstallJob {
    type: "php" | "node";
    version: string;
    status: "idle" | "downloading" | "extracting" | "done" | "error";
    progress: number;
    error?: string;
    url: string;
    destPath: string;
    archiveType: string;
}

export interface PhpManifest {
    latest: string;
    php: Record<
        string,
        {
            full: string;
            windows?: { url: string; size: number; type: string };
            linux?: { url: string; size: number; type: string };
        }
    >;
}

export interface NodeManifest {
    latest: string;
    node: Record<
        string,
        {
            full: string;
            lts: boolean;
            releaseDate: string;
            windows?: { url: string; type: string };
            linux?: { url: string; type: string };
            macos?: { x64: { url: string }; arm64: { url: string } };
        }
    >;
    npm: { bundled: Record<string, string> };
}

export type OS = "windows" | "linux" | "macos";
export type Arch = "x64" | "arm64";
