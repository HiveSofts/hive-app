import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { AppSettings } from "../SettingsPage";

export function SecurityTab({
    settings,
    updateSetting,
}: {
    settings: AppSettings;
    updateSetting: (field: keyof AppSettings, value: any) => void;
}) {
    return (
        <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm font-medium">Auto-Update</div>
                    <div className="text-[11px] text-muted-foreground">
                        Automatically install Hive updates
                    </div>
                </div>
                <Switch
                    checked={settings.autoUpdate}
                    onCheckedChange={(v) => updateSetting("autoUpdate", v)}
                />
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm font-medium">Anonymous Telemetry</div>
                    <div className="text-[11px] text-muted-foreground">
                        Help improve Hive by sending anonymous usage data
                    </div>
                </div>
                <Switch
                    checked={settings.telemetry}
                    onCheckedChange={(v) => updateSetting("telemetry", v)}
                />
            </div>
            <Separator />
            <div>
                <Button variant="destructive" size="sm" className="gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All Data
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2">
                    This will remove all projects, settings, and configurations. This action cannot
                    be undone.
                </p>
            </div>
        </div>
    );
}
