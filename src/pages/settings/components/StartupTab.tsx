import { Switch } from "@/components/ui/switch";

import { AppSettings } from "../SettingsPage";

export function StartupTab({
    settings,
    updateSetting,
}: {
    settings: AppSettings;
    updateSetting: (field: keyof AppSettings, value: any) => void;
}) {
    const items = [
        {
            field: "launchOnLogin",
            label: "Launch Hive on Login",
            desc: "Start Hive automatically when you log in",
        },
        {
            field: "startServicesOnLaunch",
            label: "Start Services on Launch",
            desc: "Automatically start PHP, MySQL, and other services",
        },
        {
            field: "startLastProjects",
            label: "Start Last Projects",
            desc: "Resume previously running projects",
        },
        {
            field: "minimizeToTray",
            label: "Minimize to System Tray",
            desc: "Keep Hive running in background",
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
                    <Switch
                        checked={settings[item.field as keyof AppSettings] as boolean}
                        onCheckedChange={(v) => updateSetting(item.field as keyof AppSettings, v)}
                    />
                </div>
            ))}
        </div>
    );
}
