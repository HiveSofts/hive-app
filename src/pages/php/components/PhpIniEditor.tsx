import { useState } from "react";

import { AlertCircle, Cpu, Edit3, Save, Search, Settings, Upload, Zap } from "lucide-react";

import { PhpIcon } from "@/components/icons/PhpIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PhpVersion } from "@/pages/php/PhpManagerPage.tsx";

interface IniSetting {
    key: string;
    value: string;
    type: "text" | "toggle" | "select";
    options?: string[];
    description: string;
    group: string;
}

const INI_SETTINGS: IniSetting[] = [
    {
        key: "memory_limit",
        value: "256M",
        type: "text",
        description: "Max memory per script",
        group: "Resource Limits",
    },
    {
        key: "max_execution_time",
        value: "30",
        type: "text",
        description: "Max execution time (seconds)",
        group: "Resource Limits",
    },
    {
        key: "max_input_time",
        value: "60",
        type: "text",
        description: "Max input parsing time (seconds)",
        group: "Resource Limits",
    },
    {
        key: "post_max_size",
        value: "8M",
        type: "text",
        description: "Max POST body size",
        group: "Uploads",
    },
    {
        key: "upload_max_filesize",
        value: "2M",
        type: "text",
        description: "Max single file upload size",
        group: "Uploads",
    },
    {
        key: "max_file_uploads",
        value: "20",
        type: "text",
        description: "Max simultaneous file uploads",
        group: "Uploads",
    },
    {
        key: "display_errors",
        value: "On",
        type: "toggle",
        description: "Show errors in browser output",
        group: "Error Handling",
    },
    {
        key: "error_reporting",
        value: "E_ALL",
        type: "select",
        options: ["E_ALL", "E_ALL & ~E_DEPRECATED", "E_ERROR | E_WARNING", "0"],
        description: "Error reporting level",
        group: "Error Handling",
    },
    {
        key: "log_errors",
        value: "On",
        type: "toggle",
        description: "Log errors to file",
        group: "Error Handling",
    },
    {
        key: "date.timezone",
        value: "UTC",
        type: "select",
        options: ["UTC", "Asia/Tehran", "America/New_York", "Europe/London", "Asia/Tokyo"],
        description: "Default timezone",
        group: "General",
    },
    {
        key: "opcache.enable",
        value: "1",
        type: "toggle",
        description: "Enable OPcache bytecode cache",
        group: "OPcache",
    },
    {
        key: "opcache.memory_consumption",
        value: "128",
        type: "text",
        description: "OPcache memory (MB)",
        group: "OPcache",
    },
    {
        key: "opcache.validate_timestamps",
        value: "1",
        type: "toggle",
        description: "Revalidate cached files",
        group: "OPcache",
    },
];

const PRESETS: Record<string, Partial<Record<string, string>>> = {
    development: {
        memory_limit: "512M",
        max_execution_time: "120",
        display_errors: "On",
        "opcache.enable": "0",
        "opcache.validate_timestamps": "1",
    },
    production: {
        memory_limit: "256M",
        max_execution_time: "30",
        display_errors: "Off",
        "opcache.enable": "1",
        "opcache.validate_timestamps": "0",
    },
    laravel: {
        memory_limit: "1G",
        max_execution_time: "60",
        display_errors: "Off",
        "opcache.enable": "1",
        "opcache.memory_consumption": "256",
        post_max_size: "64M",
        upload_max_filesize: "64M",
    },
    wordpress: {
        memory_limit: "512M",
        max_execution_time: "60",
        upload_max_filesize: "64M",
        post_max_size: "64M",
        "opcache.enable": "1",
    },
};

const GROUP_ICONS: Record<string, React.ReactNode> = {
    "Resource Limits": <Cpu className="w-3.5 h-3.5" />,
    Uploads: <Upload className="w-3.5 h-3.5" />,
    "Error Handling": <AlertCircle className="w-3.5 h-3.5" />,
    General: <Settings className="w-3.5 h-3.5" />,
    OPcache: <Zap className="w-3.5 h-3.5" />,
};

export function PhpIniEditor({ versions }: { versions: PhpVersion[] }) {
    const installed = versions.filter((v) => v.state === "installed");
    const [selectedVer, setSelectedVer] = useState(installed[0]?.minor ?? "8.3");
    const [preset, setPreset] = useState<string>("custom");
    const [settings, setSettings] = useState<IniSetting[]>(INI_SETTINGS);
    const [search, setSearch] = useState("");
    const [activeGroup, setActiveGroup] = useState<string>("all");
    const [rawMode, setRawMode] = useState(false);
    const [saving, setSaving] = useState(false);

    const groups = ["all", ...Array.from(new Set(INI_SETTINGS.map((s) => s.group)))];
    const filtered = settings.filter(
        (s) =>
            (activeGroup === "all" || s.group === activeGroup) &&
            s.key.toLowerCase().includes(search.toLowerCase())
    );

    const applyPreset = (p: string) => {
        setPreset(p);
        if (p === "custom") return;
        const overrides = PRESETS[p] ?? {};
        setSettings((prev) => prev.map((s) => ({ ...s, value: overrides[s.key] ?? s.value })));
    };

    const updateSetting = (key: string, value: string) => {
        setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
        setPreset("custom");
    };

    const save = () => {
        setSaving(true);
        setTimeout(() => setSaving(false), 1500);
    };

    const rawContent = settings.map((s) => `${s.key} = ${s.value}`).join("\n");

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/40 text-xs">
                    <PhpIcon className="w-4 h-4" />
                    <select
                        value={selectedVer}
                        onChange={(e) => setSelectedVer(e.target.value)}
                        className="bg-transparent outline-none font-mono text-foreground cursor-pointer"
                    >
                        {installed.map((v) => (
                            <option key={v.id} value={v.minor}>
                                PHP {v.minor}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">Preset:</span>
                    {Object.entries({
                        development: "Development",
                        production: "Production",
                        laravel: "Laravel",
                        wordpress: "WordPress",
                        custom: "Custom",
                    }).map(([k, label]) => (
                        <button
                            key={k}
                            onClick={() => applyPreset(k)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${preset === k ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => setRawMode((r) => !r)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        {rawMode ? "Visual editor" : "Raw php.ini"}
                    </button>
                    <Button
                        size="sm"
                        onClick={save}
                        disabled={saving}
                        className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                    >
                        {saving ? (
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-3 h-3" />
                        )}
                        Apply & Restart
                    </Button>
                </div>
            </div>

            {rawMode ? (
                <div className="rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-950">
                    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        <span className="ml-2 text-[11px] text-zinc-500 font-mono">
                            ~/.hive/php/{selectedVer}/php.ini
                        </span>
                    </div>
                    <textarea
                        value={rawContent}
                        readOnly
                        className="w-full bg-transparent text-zinc-300 font-mono text-[11px] p-4 outline-none resize-none h-[420px] leading-relaxed"
                    />
                </div>
            ) : (
                <div className="rounded-xl border overflow-hidden bg-card">
                    <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30 flex-wrap">
                        <div className="flex gap-1 flex-wrap">
                            {groups.map((g) => (
                                <button
                                    key={g}
                                    onClick={() => setActiveGroup(g)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${activeGroup === g ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
                                >
                                    {GROUP_ICONS[g]}
                                    {g === "all" ? "All" : g}
                                </button>
                            ))}
                        </div>
                        <div className="relative ml-auto">
                            <Search className="absolute left-2.5 top-1.5 w-3 h-3 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="pl-7 h-7 text-xs w-36"
                            />
                        </div>
                    </div>
                    <div className="divide-y">
                        {filtered.map((s) => (
                            <div
                                key={s.key}
                                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-mono text-sm font-medium text-foreground">
                                        {s.key}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                        {s.description}
                                    </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                    {s.type === "toggle" && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">
                                                {s.value === "On" || s.value === "1" ? "On" : "Off"}
                                            </span>
                                            <Switch
                                                checked={s.value === "On" || s.value === "1"}
                                                onCheckedChange={(v) =>
                                                    updateSetting(
                                                        s.key,
                                                        v
                                                            ? s.value === "1"
                                                                ? "1"
                                                                : "On"
                                                            : s.value === "1"
                                                              ? "0"
                                                              : "Off"
                                                    )
                                                }
                                            />
                                        </div>
                                    )}
                                    {s.type === "select" && (
                                        <select
                                            value={s.value}
                                            onChange={(e) => updateSetting(s.key, e.target.value)}
                                            className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:border-amber-500 cursor-pointer"
                                        >
                                            {s.options?.map((o) => (
                                                <option key={o} value={o}>
                                                    {o}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {s.type === "text" && (
                                        <Input
                                            value={s.value}
                                            onChange={(e) => updateSetting(s.key, e.target.value)}
                                            className="w-28 h-7 text-xs font-mono text-right"
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                No settings match "{search}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
