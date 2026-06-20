import { useState } from "react";

import { AlertCircle, Search } from "lucide-react";

import { PhpIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { getExtensions } from "../services/phpService";
import { Extension, PhpVersion } from "../types";

interface PhpExtensionsPanelProps {
    versions: PhpVersion[];
}

export function PhpExtensionsPanel({ versions }: PhpExtensionsPanelProps) {
    const installed = versions.filter((v) => v.state === "installed");
    const [selectedVer, setSelectedVer] = useState(installed[0]?.minor ?? "8.3");
    const [extensions, setExtensions] = useState<Extension[]>(() => getExtensions());
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");

    const toggle = (name: string) => {
        setExtensions((prev) =>
            prev.map((e) => (e.name === name ? { ...e, enabled: !e.enabled } : e))
        );
    };

    const filtered = extensions.filter(
        (e) =>
            e.name.includes(search) &&
            (filter === "all" ||
                (filter === "enabled" && e.enabled) ||
                (filter === "disabled" && !e.enabled))
    );

    const enabledCount = extensions.filter((e) => e.enabled).length;
    const missing = ["gd", "imagick", "redis", "xdebug"].filter(
        (n) => !extensions.find((e) => e.name === n && e.enabled)
    );

    return (
        <div className="space-y-4">
            {missing.length > 0 && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                            Recommended extensions not enabled
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {missing.map((m) => (
                                <button
                                    key={m}
                                    onClick={() => toggle(m)}
                                    className="text-[11px] font-mono px-2 py-0.5 rounded border border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                                >
                                    + Enable {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/40 text-xs">
                    <PhpIcon className="w-4 h-4" />
                    <select
                        value={selectedVer}
                        onChange={(e) => setSelectedVer(e.target.value)}
                        className="bg-transparent outline-none font-mono cursor-pointer"
                    >
                        {installed.map((v) => (
                            <option key={v.id} value={v.minor}>
                                PHP {v.minor}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search extensions..."
                        className="pl-8 h-8 text-xs"
                    />
                </div>
                <div className="flex gap-1">
                    {(["all", "enabled", "disabled"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${filter === f ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                        >
                            {f === "all"
                                ? `All (${extensions.length})`
                                : f === "enabled"
                                  ? `On (${enabledCount})`
                                  : `Off (${extensions.length - enabledCount})`}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {filtered.map((ext) => (
                    <div
                        key={ext.name}
                        onClick={() => !ext.builtin && toggle(ext.name)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
                            ${ext.enabled ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/20 opacity-60"}`}
                    >
                        <div>
                            <div className="font-mono text-xs font-semibold">{ext.name}</div>
                            {ext.builtin && (
                                <div className="text-[10px] text-muted-foreground">built-in</div>
                            )}
                        </div>
                        <Switch
                            checked={ext.enabled}
                            disabled={ext.builtin}
                            onCheckedChange={() => !ext.builtin && toggle(ext.name)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
