import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AppSettings } from "../SettingsPage";

export function NetworkTab({
    settings,
    updateSetting,
}: {
    settings: AppSettings;
    updateSetting: (field: keyof AppSettings, value: any) => void;
}) {
    return (
        <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="space-y-1.5">
                <Label className="text-xs">Domain TLD</Label>
                <div className="flex gap-2">
                    <Input
                        value={settings.domainTld}
                        onChange={(e) => updateSetting("domainTld", e.target.value)}
                        className="font-mono text-xs h-8 w-32"
                    />
                    <span className="text-xs text-muted-foreground self-center">
                        *.{settings.domainTld} → localhost
                    </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                    All projects will be available at project-name.{settings.domainTld}
                </p>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs">DNS Resolver</Label>
                <div className="flex gap-2">
                    {["auto", "dnsmasq", "acrylic"].map((r) => (
                        <button
                            key={r}
                            onClick={() => updateSetting("dnsResolver", r as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${settings.dnsResolver === r ? "border-amber-500 bg-amber-500/10 text-amber-500" : "border-border hover:bg-muted"}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚡ DNS changes may require admin privileges
                </p>
            </div>
        </div>
    );
}
