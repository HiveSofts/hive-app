export interface UserProfile {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    bio: string;
    company: string;
    website: string;
    github: string;
    twitter: string;
    linkedin: string;
    avatar: string | null;
    emailNotifications: boolean;
    desktopNotifications: boolean;
    soundEffects: boolean;
}

export interface AppSettings {
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
    autoUpdate: boolean;
    telemetry: boolean;
}

export interface FullUserConfig {
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
    onboardingComplete: boolean;
}
