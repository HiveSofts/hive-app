import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { RotateCcw, Save, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AdvancedTab } from "./components/AdvancedTab";
import { AppearanceTab } from "./components/AppearanceTab";
import { NetworkTab } from "./components/NetworkTab";
import { PathsTab } from "./components/PathsTab";
import { ProfileTab } from "./components/ProfileTab";
import { SecurityTab } from "./components/SecurityTab";
import { StartupTab } from "./components/StartupTab";

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
    projectsPath: string;
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

export interface FullUserConfig extends UserProfile, AppSettings {
    userCode: string;
    githubStarred: boolean;
    onboardingCompleted: boolean;
}

const DEFAULT_USER: UserProfile = {
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    bio: "",
    company: "",
    website: "",
    github: "",
    twitter: "",
    linkedin: "",
    avatar: null,
    emailNotifications: true,
    desktopNotifications: true,
    soundEffects: false,
};

const DEFAULT_SETTINGS: AppSettings = {
    theme: "dark",
    accentColor: "#F59E0B",
    sidebarCollapsed: false,
    fontSize: "medium",
    animations: true,
    projectsPath: "~/Projects",
    hiveDataPath: "~/.hive",
    domainTld: "test",
    dnsResolver: "auto",
    proxyPort: 80,
    autoStartProxy: true,
    launchOnLogin: true,
    startServicesOnLaunch: true,
    startLastProjects: false,
    minimizeToTray: true,
    autoUpdate: true,
    telemetry: false,
};

export default function SettingsPage() {
    const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const config = await invoke<FullUserConfig>("get_user_config");
            if (config) {
                setUser({
                    firstName: config.firstName || "",
                    lastName: config.lastName || "",
                    email: config.email || "",
                    username: config.username || "",
                    bio: config.bio || "",
                    company: config.company || "",
                    website: config.website || "",
                    github: config.github || "",
                    twitter: config.twitter || "",
                    linkedin: config.linkedin || "",
                    avatar: config.avatar || null,
                    emailNotifications: config.emailNotifications ?? true,
                    desktopNotifications: config.desktopNotifications ?? true,
                    soundEffects: config.soundEffects ?? false,
                });
                setSettings({
                    theme: config.theme || "dark",
                    accentColor: config.accentColor || "#F59E0B",
                    sidebarCollapsed: config.sidebarCollapsed || false,
                    fontSize: config.fontSize || "medium",
                    animations: config.animations ?? true,
                    projectsPath: "~/Projects",
                    hiveDataPath: config.hiveDataPath || "~/.hive",
                    domainTld: config.domainTld || "test",
                    dnsResolver: config.dnsResolver || "auto",
                    proxyPort: config.proxyPort || 80,
                    autoStartProxy: config.autoStartProxy ?? true,
                    launchOnLogin: config.launchOnLogin ?? true,
                    startServicesOnLaunch: config.startServicesOnLaunch ?? true,
                    startLastProjects: config.startLastProjects || false,
                    minimizeToTray: config.minimizeToTray ?? true,
                    autoUpdate: config.autoUpdate ?? true,
                    telemetry: config.telemetry || false,
                });
            }
        } catch (error) {
            console.error("Failed to load config:", error);
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async (updatedUser: UserProfile, updatedSettings: AppSettings) => {
        setSaving(true);
        try {
            const fullConfig: FullUserConfig = {
                ...updatedUser,
                ...updatedSettings,
                hiveDataPath: updatedSettings.hiveDataPath,
                userCode: "",
                githubStarred: false,
                onboardingCompleted: true,
            };
            await invoke("save_user_config", { config: fullConfig });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error("Failed to save config:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => {
        saveConfig(user, settings);
    };

    const handleReset = () => {
        setUser(DEFAULT_USER);
        setSettings(DEFAULT_SETTINGS);
        saveConfig(DEFAULT_USER, DEFAULT_SETTINGS);
    };

    const updateUser = (field: keyof UserProfile, value: any) => {
        setUser((prev) => ({ ...prev, [field]: value }));
    };

    const updateSetting = (field: keyof AppSettings, value: any) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center">
                        <Settings className="w-6 h-6 text-zinc-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Manage your preferences and account
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8"
                        onClick={handleReset}
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="gap-1.5 text-xs h-8 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        {saving ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-3.5 h-3.5" />
                        )}
                        {saved ? "Saved!" : "Save Changes"}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="profile">
                <TabsList className="flex h-auto gap-0.5 bg-muted/40 p-1 rounded-xl mb-6 w-full sm:w-auto flex-wrap">
                    {[
                        { id: "profile", label: "Profile" },
                        { id: "appearance", label: "Appearance" },
                        { id: "paths", label: "Paths" },
                        { id: "network", label: "Network" },
                        { id: "startup", label: "Startup" },
                        { id: "security", label: "Security" },
                        { id: "advanced", label: "Advanced" },
                    ].map((t) => (
                        <TabsTrigger
                            key={t.id}
                            value={t.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="profile" className="mt-0">
                    <ProfileTab user={user} updateUser={updateUser} />
                </TabsContent>
                <TabsContent value="appearance" className="mt-0">
                    <AppearanceTab settings={settings} updateSetting={updateSetting} />
                </TabsContent>
                <TabsContent value="paths" className="mt-0">
                    <PathsTab settings={settings} updateSetting={updateSetting} />
                </TabsContent>
                <TabsContent value="network" className="mt-0">
                    <NetworkTab settings={settings} updateSetting={updateSetting} />
                </TabsContent>
                <TabsContent value="startup" className="mt-0">
                    <StartupTab settings={settings} updateSetting={updateSetting} />
                </TabsContent>
                <TabsContent value="security" className="mt-0">
                    <SecurityTab settings={settings} updateSetting={updateSetting} />
                </TabsContent>
                <TabsContent value="advanced" className="mt-0">
                    <AdvancedTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
