import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { AppSettings } from "../SettingsPage";

export function PathsTab({
    settings,
    updateSetting,
}: {
    settings: AppSettings;
    updateSetting: (field: keyof AppSettings, value: any) => void;
}) {
    return (
        <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="space-y-1.5">
                <Label className="text-xs">Projects Directory</Label>
                <Input
                    value={settings.projectsPath}
                    onChange={(e) => updateSetting("projectsPath", e.target.value)}
                    className="font-mono text-xs h-8"
                />
                <p className="text-[10px] text-muted-foreground">
                    Default location for new projects
                </p>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs">Hive Data Directory</Label>
                <Input
                    value={settings.hiveDataPath}
                    onChange={(e) => updateSetting("hiveDataPath", e.target.value)}
                    className="font-mono text-xs h-8"
                />
                <p className="text-[10px] text-muted-foreground">
                    Where Hive stores PHP, Node.js, and databases
                </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm font-medium">Auto-start Proxy</div>
                    <div className="text-[11px] text-muted-foreground">
                        Automatically start reverse proxy on launch
                    </div>
                </div>
                <Switch
                    checked={settings.autoStartProxy}
                    onCheckedChange={(v) => updateSetting("autoStartProxy", v)}
                />
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs">Proxy Port</Label>
                <Input
                    type="number"
                    value={settings.proxyPort}
                    onChange={(e) => updateSetting("proxyPort", parseInt(e.target.value))}
                    className="font-mono text-xs h-8 w-32"
                />
            </div>
        </div>
    );
}
