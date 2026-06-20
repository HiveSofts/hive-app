import { invoke } from "@tauri-apps/api/core";

import { FullUserConfig } from "../types";

export const loadUserConfig = async (): Promise<FullUserConfig | null> => {
    try {
        return await invoke<FullUserConfig>("get_user_config");
    } catch (error) {
        console.error("Failed to load config:", error);
        return null;
    }
};

export const saveUserConfig = async (config: FullUserConfig): Promise<void> => {
    await invoke("save_user_config", { config });
};

export const DEFAULT_CONFIG: FullUserConfig = {
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    bio: "",
    company: "",
    website: "",
    avatar: null,
    github: "",
    twitter: "",
    linkedin: "",
    theme: "dark",
    accentColor: "#F59E0B",
    sidebarCollapsed: false,
    fontSize: "medium",
    animations: true,
    hivePath: "~/.hive",
    defaultProjectsPath: "~/Projects",
    hiveDataPath: "~/.hive",
    domainTld: "test",
    dnsResolver: "auto",
    proxyPort: 80,
    autoStartProxy: true,
    launchOnLogin: true,
    startServicesOnLaunch: true,
    startLastProjects: false,
    minimizeToTray: true,
    emailNotifications: true,
    desktopNotifications: true,
    soundEffects: false,
    autoUpdate: true,
    telemetry: false,
    userCode: "",
    githubStarred: false,
    onboardingComplete: false,
};
