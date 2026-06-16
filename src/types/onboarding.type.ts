export interface UserConfig {
    // Personal Information
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    bio: string;
    company: string;
    website: string;
    avatar: string | null;

    // Social Links
    github: string;
    twitter: string;
    linkedin: string;

    // Preferences
    theme: "light" | "dark" | "system";
    accentColor: string;
    sidebarCollapsed: boolean;
    fontSize: "small" | "medium" | "large";
    animations: boolean;

    // Paths
    hivePath: string;
    defaultProjectsPath: string;
    hiveDataPath: string;

    // Network
    domainTld: string;
    dnsResolver: "auto" | "dnsmasq" | "acrylic";
    proxyPort: number;
    autoStartProxy: boolean;

    // Startup
    launchOnLogin: boolean;
    startServicesOnLaunch: boolean;
    startLastProjects: boolean;
    minimizeToTray: boolean;

    // Notifications
    emailNotifications: boolean;
    desktopNotifications: boolean;
    soundEffects: boolean;

    // Advanced
    autoUpdate: boolean;
    telemetry: boolean;

    // System
    userCode: string;
    githubStarred: boolean;
    onboardingCompleted: boolean;

    // Runtime (PHP & Node.js)
    phpVersion?: string;
    nodeVersion?: string;
    phpPath?: string;
    nodePath?: string;
}

export const DEFAULT_USER_CONFIG: UserConfig = {
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    bio: "",
    company: "",
    website: "",
    avatar: null,

    // Social Links
    github: "",
    twitter: "",
    linkedin: "",

    // Preferences
    theme: "dark",
    accentColor: "#F59E0B",
    sidebarCollapsed: false,
    fontSize: "medium",
    animations: true,

    // Paths
    hivePath: "~/.hive",
    defaultProjectsPath: "~/Projects",
    hiveDataPath: "~/.hive",

    // Network
    domainTld: "test",
    dnsResolver: "auto",
    proxyPort: 80,
    autoStartProxy: true,

    // Startup
    launchOnLogin: true,
    startServicesOnLaunch: true,
    startLastProjects: false,
    minimizeToTray: true,

    // Notifications
    emailNotifications: true,
    desktopNotifications: true,
    soundEffects: false,

    // Advanced
    autoUpdate: true,
    telemetry: false,

    // System
    userCode: "",
    githubStarred: false,
    onboardingCompleted: false,

    // Runtime (PHP & Node.js)
    phpVersion: undefined,
    nodeVersion: undefined,
    phpPath: undefined,
    nodePath: undefined,
};
