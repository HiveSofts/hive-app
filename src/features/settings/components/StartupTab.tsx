import { useEffect, useState } from "react";

import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

import { Switch } from "@/components/ui/switch";

import { AppSettings } from "../types";

interface StartupTabProps {
    settings: AppSettings;
    updateSetting: (field: keyof AppSettings, value: any) => void;
}

export function StartupTab({ settings, updateSetting }: StartupTabProps) {
    const [autostartEnabled, setAutostartEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAutostartStatus();
    }, []);

    const checkAutostartStatus = async () => {
        setLoading(true);
        try {
            const enabled = await isEnabled();
            setAutostartEnabled(enabled);
            updateSetting("launchOnLogin", enabled);
        } catch (error) {
            console.error("Failed to check autostart:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAutostart = async (checked: boolean) => {
        try {
            if (checked) {
                await enable();
            } else {
                await disable();
            }
            setAutostartEnabled(checked);
            updateSetting("launchOnLogin", checked);
        } catch (error) {
            console.error("Failed to toggle autostart:", error);
            setAutostartEnabled(!checked);
        }
    };

    const items: {
        field: keyof AppSettings;
        label: string;
        desc: string;
        checked: boolean;
        onChange: (value: boolean) => void;
        loading?: boolean;
    }[] = [
        {
            field: "launchOnLogin",
            label: "Launch Hive on Login",
            desc: "Start Hive automatically when you log in",
            checked: autostartEnabled,
            onChange: toggleAutostart,
            loading,
        },
        {
            field: "startServicesOnLaunch",
            label: "Start Services on Launch",
            desc: "Automatically start PHP, MySQL, and other services",
            checked: settings.startServicesOnLaunch,
            onChange: (value: boolean) => updateSetting("startServicesOnLaunch", value),
        },
        {
            field: "startLastProjects",
            label: "Start Last Projects",
            desc: "Resume previously running projects",
            checked: settings.startLastProjects,
            onChange: (value: boolean) => updateSetting("startLastProjects", value),
        },
        {
            field: "minimizeToTray",
            label: "Minimize to System Tray",
            desc: "Keep Hive running in background",
            checked: settings.minimizeToTray,
            onChange: (value: boolean) => updateSetting("minimizeToTray", value),
        },
    ];

    return (
        <div className="rounded-xl border bg-card divide-y">
            {items.map((item) => (
                <div key={item.field} className="flex items-center justify-between p-4">
                    <div>
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                    </div>
                    {item.loading ? (
                        <div className="w-9 h-5 bg-muted rounded-full animate-pulse" />
                    ) : (
                        <Switch
                            checked={item.checked}
                            onCheckedChange={item.onChange}
                            disabled={item.field === "launchOnLogin" && item.loading}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
