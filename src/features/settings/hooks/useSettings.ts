import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_CONFIG, loadUserConfig, saveUserConfig } from "../services/settingsService";
import { AppSettings, FullUserConfig, UserProfile } from "../types";

export function useSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [config, setConfig] = useState<FullUserConfig>(DEFAULT_CONFIG);
    const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        loadConfig();
        return () => {
            if (savedTimer.current) clearTimeout(savedTimer.current);
        };
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        const data = await loadUserConfig();
        if (data) {
            setConfig(data);
        }
        setLoading(false);
    };

    const user: UserProfile = {
        firstName: config.firstName,
        lastName: config.lastName,
        email: config.email,
        username: config.username,
        bio: config.bio,
        company: config.company,
        website: config.website,
        github: config.github,
        twitter: config.twitter,
        linkedin: config.linkedin,
        avatar: config.avatar,
        emailNotifications: config.emailNotifications,
        desktopNotifications: config.desktopNotifications,
        soundEffects: config.soundEffects,
    };

    const settings: AppSettings = {
        theme: config.theme,
        accentColor: config.accentColor,
        sidebarCollapsed: config.sidebarCollapsed,
        fontSize: config.fontSize,
        animations: config.animations,
        hivePath: config.hivePath,
        defaultProjectsPath: config.defaultProjectsPath,
        hiveDataPath: config.hiveDataPath,
        domainTld: config.domainTld,
        dnsResolver: config.dnsResolver,
        proxyPort: config.proxyPort,
        autoStartProxy: config.autoStartProxy,
        launchOnLogin: config.launchOnLogin,
        startServicesOnLaunch: config.startServicesOnLaunch,
        startLastProjects: config.startLastProjects,
        minimizeToTray: config.minimizeToTray,
        autoUpdate: config.autoUpdate,
        telemetry: config.telemetry,
    };

    const updateUser = useCallback((field: keyof UserProfile, value: any) => {
        setConfig((prev) => ({ ...prev, [field]: value }));
    }, []);

    const updateSetting = useCallback((field: keyof AppSettings, value: any) => {
        setConfig((prev) => ({ ...prev, [field]: value }));
    }, []);

    const resetToDefaults = useCallback(() => {
        setConfig((prev) => ({
            ...DEFAULT_CONFIG,
            userCode: prev.userCode,
            onboardingComplete: prev.onboardingComplete,
            githubStarred: prev.githubStarred,
        }));
    }, []);

    const save = useCallback(async () => {
        setSaving(true);
        setSaved(false);
        try {
            await saveUserConfig(config);
            setSaved(true);
            if (savedTimer.current) clearTimeout(savedTimer.current);
            savedTimer.current = setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error("Failed to save config:", error);
        } finally {
            setSaving(false);
        }
    }, [config]);

    return {
        loading,
        saving,
        saved,
        user,
        settings,
        updateUser,
        updateSetting,
        resetToDefaults,
        save,
    };
}
