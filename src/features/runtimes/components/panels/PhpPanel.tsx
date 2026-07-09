import { useState, useEffect } from "react";
import {
    Layers,
    Settings,
    Info,
    Terminal,
    Search,
    FileText,
    Play,
    RefreshCw,
    Package,
    Code2,
    XCircle,
    CheckCircle2,
    Download,
    AlertCircle,
    Save,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    Filter,
    Zap,
    Clock,
    HardDrive,
    Globe,
    Shield,
    Database,
    Eye,
    EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/core/lib/utils";
import { Extension, IniSetting, LangMeta } from "../../types/runtime.types";
import { accentMap } from "../../utils/accent.utils";
import { runtimeService } from "../../services/runtime.service";
import { CopyButton } from "@/components/ui/CopyButton";
import { toast } from "sonner";

interface PhpPanelProps {
    lang: LangMeta;
}

const normalizeExtensionKey = (name: string): string => {
    return name.toLowerCase().trim().replace(/\s+/g, " ");
};

const normalizeExtensions = (exts: Extension[]): Extension[] => {
    const seen = new Map<string, Extension>();
    for (const ext of exts) {
        const key = normalizeExtensionKey(ext.name);
        if (!seen.has(key)) {
            seen.set(key, { ...ext, name: key });
        } else {
            const existing = seen.get(key)!;
            if (ext.enabled && !existing.enabled) {
                seen.set(key, { ...ext, name: key });
            }
            if (ext.category && !existing.category) {
                seen.set(key, { ...ext, name: key });
            }
            if (ext.version && !existing.version) {
                seen.set(key, { ...ext, name: key });
            }
            if (ext.description && !existing.description) {
                seen.set(key, { ...ext, name: key });
            }
        }
    }
    return Array.from(seen.values());
};

const INI_SECTIONS: { label: string; icon: React.ReactNode; keys: string[] }[] = [
    {
        label: "Performance",
        icon: <Zap className="w-3.5 h-3.5" />,
        keys: [
            "memory_limit",
            "max_execution_time",
            "max_input_time",
            "realpath_cache_size",
            "realpath_cache_ttl",
            "opcache.enable",
            "opcache.memory_consumption",
            "opcache.interned_strings_buffer",
            "opcache.max_accelerated_files",
            "opcache.revalidate_freq",
        ],
    },
    {
        label: "File & Upload",
        icon: <HardDrive className="w-3.5 h-3.5" />,
        keys: [
            "file_uploads",
            "upload_max_filesize",
            "post_max_size",
            "max_file_uploads",
            "upload_tmp_dir",
        ],
    },
    {
        label: "Network & URL",
        icon: <Globe className="w-3.5 h-3.5" />,
        keys: ["allow_url_fopen", "allow_url_include", "default_socket_timeout", "user_agent"],
    },
    {
        label: "Security",
        icon: <Shield className="w-3.5 h-3.5" />,
        keys: [
            "expose_php",
            "display_errors",
            "display_startup_errors",
            "log_errors",
            "error_log",
            "error_reporting",
            "open_basedir",
            "disable_functions",
            "disable_classes",
        ],
    },
    {
        label: "Session",
        icon: <Clock className="w-3.5 h-3.5" />,
        keys: [
            "session.save_handler",
            "session.save_path",
            "session.gc_maxlifetime",
            "session.cookie_lifetime",
            "session.cookie_secure",
            "session.cookie_httponly",
            "session.cookie_samesite",
            "session.use_strict_mode",
        ],
    },
    {
        label: "Database",
        icon: <Database className="w-3.5 h-3.5" />,
        keys: [
            "mysqli.default_host",
            "mysqli.default_port",
            "pdo_mysql.default_socket",
            "pgsql.allow_persistent",
        ],
    },
];

function groupIniSettings(
    settings: IniSetting[]
): { section: (typeof INI_SECTIONS)[0]; items: IniSetting[] }[] {
    const result: { section: (typeof INI_SECTIONS)[0]; items: IniSetting[] }[] = [];
    const usedKeys = new Set<string>();

    for (const section of INI_SECTIONS) {
        const items = settings.filter((s) => section.keys.includes(s.key));
        if (items.length > 0) {
            result.push({ section, items });
            items.forEach((i) => usedKeys.add(i.key));
        }
    }

    const remaining = settings.filter((s) => !usedKeys.has(s.key));
    if (remaining.length > 0) {
        result.push({
            section: { label: "Other", icon: <Settings className="w-3.5 h-3.5" />, keys: [] },
            items: remaining,
        });
    }

    return result;
}

function buildDiff(original: string, current: string): {
    added: number;
    removed: number;
    changed: number;
} {
    const origLines = original.split("\n");
    const currLines = current.split("\n");
    let added = 0,
        removed = 0,
        changed = 0;

    const origMap = new Map<string, string>();
    for (const l of origLines) {
        const m = l.match(/^\s*([^;#\s][^=]*)=(.*)$/);
        if (m) origMap.set(m[1].trim(), m[2].trim());
    }
    const currMap = new Map<string, string>();
    for (const l of currLines) {
        const m = l.match(/^\s*([^;#\s][^=]*)=(.*)$/);
        if (m) currMap.set(m[1].trim(), m[2].trim());
    }

    for (const [k, v] of currMap) {
        if (!origMap.has(k)) added++;
        else if (origMap.get(k) !== v) changed++;
    }
    for (const k of origMap.keys()) {
        if (!currMap.has(k)) removed++;
    }

    return { added, removed, changed };
}

export function PhpPanel({ lang }: PhpPanelProps) {
    const [activeTab, setActiveTab] = useState("extensions");
    const [extSearch, setExtSearch] = useState("");
    const [extCategory, setExtCategory] = useState("all");
    const [extensions, setExtensions] = useState<Extension[]>([]);
    const [togglingExtension, setTogglingExtension] = useState<string | null>(null);
    const [iniSettings, setIniSettings] = useState<IniSetting[]>([]);
    const [iniSearch, setIniSearch] = useState("");
    const [rawIni, setRawIni] = useState("");
    const [originalIniContent, setOriginalIniContent] = useState("");
    const [rawMode, setRawMode] = useState(false);
    const [iniPath, setIniPath] = useState("");
    const [savingIni, setSavingIni] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["Performance", "Security", "File & Upload"])
    );
    const [iniDirty, setIniDirty] = useState(false);
    const [showOnlyChanged, setShowOnlyChanged] = useState(false);
    const [phpInfo, setPhpInfo] = useState<any>(null);
    const [phpVersion, setPhpVersion] = useState<string | null>(null);
    const [isPhpInstalled, setIsPhpInstalled] = useState<boolean | null>(null);
    const [phpInfoLoading, setPhpInfoLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [runOutput, setRunOutput] = useState("");
    const [runCode, setRunCode] = useState("<?php\necho phpversion();\n");
    const [running, setRunning] = useState(false);
    const [showRestartDialog, setShowRestartDialog] = useState(false);
    const [pendingToggle, setPendingToggle] = useState<{ name: string; enable: boolean } | null>(
        null
    );
    const [restarting, setRestarting] = useState(false);
    const [originalSettings, setOriginalSettings] = useState<Map<string, string>>(new Map());

    const colors = accentMap[lang.accent];

    const categories = [
        "all",
        ...Array.from(
            new Set(
                extensions
                    .map((e) => e.category)
                    .filter((c): c is string => c !== undefined && c !== null && c !== "")
            )
        ).sort(),
    ];

    const enabledCount = extensions.filter((e) => e.enabled).length;

    useEffect(() => {
        checkPhpInstallation();
    }, []);

    useEffect(() => {
        if (rawMode) setIniDirty(rawIni !== originalIniContent);
    }, [rawIni, originalIniContent, rawMode]);

    useEffect(() => {
        if (!rawMode) {
            const dirty = iniSettings.some((s) => originalSettings.get(s.key) !== s.value);
            setIniDirty(dirty);
        }
    }, [iniSettings, originalSettings, rawMode]);

    const checkPhpInstallation = async () => {
        setPhpInfoLoading(true);
        setError(null);
        try {
            const info = await runtimeService.getPhpInfo();
            if (info?.version) {
                setIsPhpInstalled(true);
                setPhpVersion(info.version);
                setPhpInfo(info);
                if (info.extensions?.length) {
                    const normalized = normalizeExtensions(info.extensions);
                    setExtensions(normalized);
                }
                if (info.ini_settings?.length) {
                    setIniSettings(info.ini_settings);
                    const map = new Map<string, string>();
                    info.ini_settings.forEach((s: IniSetting) => map.set(s.key, s.value));
                    setOriginalSettings(map);
                }
                const path = await runtimeService.getPhpIniPath();
                setIniPath(path);
                const content = await runtimeService.getPhpIniContent();
                setOriginalIniContent(content);
                setRawIni(content);
            } else {
                setIsPhpInstalled(false);
                setError("PHP is not installed on your system.");
            }
        } catch {
            setIsPhpInstalled(false);
            setError("PHP is not installed on your system.");
        } finally {
            setPhpInfoLoading(false);
        }
    };

    const loadPhpInfo = async () => {
        setPhpInfoLoading(true);
        try {
            const info = await runtimeService.getPhpInfo();
            setPhpInfo(info);
            setPhpVersion(info.version);
            if (info.extensions?.length) {
                const normalized = normalizeExtensions(info.extensions);
                setExtensions(normalized);
            }
            if (info.ini_settings?.length) {
                setIniSettings(info.ini_settings);
                const map = new Map<string, string>();
                info.ini_settings.forEach((s: IniSetting) => map.set(s.key, s.value));
                setOriginalSettings(map);
            }
            const content = await runtimeService.getPhpIniContent();
            setOriginalIniContent(content);
            setRawIni(content);
            setIniDirty(false);
        } catch {
            setError("Failed to load PHP info");
        } finally {
            setPhpInfoLoading(false);
        }
    };

    const toggleExtension = async (name: string, currentEnabled: boolean) => {
        const newState = !currentEnabled;
        setTogglingExtension(name);
        try {
            await runtimeService.togglePhpExtension(name, newState);
            setExtensions((prev) =>
                prev.map((e) => (e.name === name ? { ...e, enabled: newState } : e))
            );
            setPendingToggle({ name, enable: newState });
            setShowRestartDialog(true);
            toast.success(`${name} ${newState ? "enabled" : "disabled"}`);
        } catch {
            setExtensions((prev) =>
                prev.map((e) => (e.name === name ? { ...e, enabled: currentEnabled } : e))
            );
            toast.error(`Failed to ${newState ? "enable" : "disable"} ${name}`);
        } finally {
            setTogglingExtension(null);
        }
    };

    const handleIniSettingChange = (key: string, value: string) => {
        setIniSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
    };

    const saveIniSettings = async () => {
        setSavingIni(true);
        try {
            if (rawMode) {
                await runtimeService.savePhpIniContent(rawIni);
                setOriginalIniContent(rawIni);
            } else {
                for (const s of iniSettings) {
                    const orig = originalSettings.get(s.key);
                    if (orig !== s.value) {
                        await runtimeService.updatePhpIniSetting(s.key, s.value);
                    }
                }
                const map = new Map<string, string>();
                iniSettings.forEach((s) => map.set(s.key, s.value));
                setOriginalSettings(map);
            }
            setIniDirty(false);
            toast.success("php.ini saved");
            setShowRestartDialog(true);
        } catch (err) {
            toast.error(String(err));
        } finally {
            setSavingIni(false);
        }
    };

    const resetIni = async () => {
        try {
            const content = await runtimeService.getPhpIniContent();
            setRawIni(content);
            setOriginalIniContent(content);
            const info = await runtimeService.getPhpInfo();
            if (info?.ini_settings?.length) {
                setIniSettings(info.ini_settings);
                const map = new Map<string, string>();
                info.ini_settings.forEach((s: IniSetting) => map.set(s.key, s.value));
                setOriginalSettings(map);
            }
            setIniDirty(false);
            toast.success("Reset to saved configuration");
        } catch (err) {
            toast.error(String(err));
        }
    };

    const toggleSection = (label: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    };

    const handleRestartPhp = async () => {
        setShowRestartDialog(false);
        setRestarting(true);
        try {
            const result = await runtimeService.restartPhp();
            toast.success(result || "PHP restarted");
            await new Promise((r) => setTimeout(r, 2000));
            await loadPhpInfo();
        } catch {
            toast.error("Restart failed");
        } finally {
            setRestarting(false);
            setPendingToggle(null);
        }
    };

    const runPhpCode = async () => {
        setRunning(true);
        try {
            const result = await runtimeService.executePhpCode(runCode);
            setRunOutput(result);
        } catch (err) {
            setRunOutput(String(err));
        } finally {
            setRunning(false);
        }
    };

    const filteredExtensions = extensions.filter((e) => {
        const matchSearch = e.name.toLowerCase().includes(extSearch.toLowerCase());
        const matchCat = extCategory === "all" || e.category === extCategory;
        return matchSearch && matchCat;
    });

    const groupedIni = groupIniSettings(
        iniSettings
            .filter(
                (s) =>
                    s.key.toLowerCase().includes(iniSearch.toLowerCase()) ||
                    s.description?.toLowerCase().includes(iniSearch.toLowerCase())
            )
            .filter((s) => !showOnlyChanged || originalSettings.get(s.key) !== s.value)
    );

    const rawDiff = rawMode ? buildDiff(originalIniContent, rawIni) : null;

    if (isPhpInstalled === false) {
        return (
            <div
                className={cn(
                    "rounded-2xl border-2 border-dashed p-10 text-center",
                    colors.border,
                    colors.bg
                )}
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                        <XCircle className="w-7 h-7 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-white">PHP not detected</h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                            Install PHP and ensure it's on your PATH, then click Check Again.
                        </p>
                        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-white/10 bg-white/5"
                            onClick={checkPhpInstallation}
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Check Again
                        </Button>
                        <Button
                            size="sm"
                            className={cn(colors.bg, colors.text, "border", colors.border)}
                            onClick={() => window.open("https://php.net/downloads", "_blank")}
                        >
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Download PHP
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (phpInfoLoading && isPhpInstalled === null) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Checking PHP installation…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div
                className={cn(
                    "rounded-xl border px-4 py-2.5 flex items-center justify-between",
                    colors.border,
                    colors.bg
                )}
            >
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                                PHP {phpVersion ?? "Unknown"}
                            </span>
                            <span className="text-[10px] text-muted-foreground bg-white/5 border border-white/10 rounded px-1.5 py-px">
                                {phpInfo?.sapi ?? "CLI"}
                            </span>
                            <Badge
                                variant="outline"
                                className="text-[10px] border-green-500/30 text-green-400 px-1.5 py-0 h-4"
                            >
                                Active
                            </Badge>
                        </div>
                        {iniPath && (
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-sm">
                                {iniPath}
                            </span>
                        )}
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1.5"
                    onClick={loadPhpInfo}
                    disabled={phpInfoLoading || restarting}
                >
                    <RefreshCw
                        className={cn("w-3 h-3", (phpInfoLoading || restarting) && "animate-spin")}
                    />
                    {restarting ? "Restarting…" : "Refresh"}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto gap-1">
                    {[
                        {
                            id: "extensions",
                            label: "Extensions",
                            icon: <Layers className="w-3.5 h-3.5" />,
                        },
                        {
                            id: "ini",
                            label: "php.ini",
                            icon: <Settings className="w-3.5 h-3.5" />,
                            dirty: iniDirty,
                        },
                        {
                            id: "info",
                            label: "Runtime Info",
                            icon: <Info className="w-3.5 h-3.5" />,
                        },
                        {
                            id: "repl",
                            label: "REPL",
                            icon: <Terminal className="w-3.5 h-3.5" />,
                        },
                    ].map((t) => (
                        <TabsTrigger
                            key={t.id}
                            value={t.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white"
                        >
                            {t.icon}
                            {t.label}
                            {"dirty" in t && t.dirty && (
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 ml-0.5" />
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="extensions" className="mt-4 space-y-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search extensions…"
                                value={extSearch}
                                onChange={(e) => setExtSearch(e.target.value)}
                                className="pl-8 h-8 text-xs bg-white/5 border-white/10"
                            />
                        </div>
                        <Select value={extCategory} onValueChange={setExtCategory}>
                            <SelectTrigger className="w-36 h-8 text-xs bg-white/5 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((c) => (
                                    <SelectItem key={c} value={c} className="text-xs">
                                        {c === "all" ? "All categories" : c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("font-semibold", colors.text)}>{enabledCount}</span>
                        <span>/ {extensions.length} enabled</span>
                        {extSearch && (
                            <span className="ml-2 text-white/30">
                                · {filteredExtensions.length} shown
                            </span>
                        )}
                    </div>

                    {extensions.length === 0 ? (
                        <div className="rounded-xl border border-white/10 p-8 text-center">
                            <p className="text-sm text-muted-foreground">No extensions found</p>
                            <code className="text-xs text-white/40 mt-1 block">php -m</code>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                            {filteredExtensions.map((ext) => (
                                <div
                                    key={ext.name}
                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
                                >
                                    <Switch
                                        checked={ext.enabled}
                                        onCheckedChange={() =>
                                            toggleExtension(ext.name, ext.enabled)
                                        }
                                        className="scale-[0.8] shrink-0"
                                        disabled={togglingExtension === ext.name || restarting}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[13px] font-mono font-medium text-white/90">
                                                {ext.name}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 py-0 h-3.5 border-white/10 text-white/40"
                                            >
                                                {ext.category}
                                            </Badge>
                                            {ext.enabled ? (
                                                <Badge className="text-[10px] px-1.5 py-0 h-3.5 bg-green-500/15 text-green-400 border-green-500/25">
                                                    on
                                                </Badge>
                                            ) : (
                                                <Badge className="text-[10px] px-1.5 py-0 h-3.5 bg-white/5 text-white/25 border-white/10">
                                                    off
                                                </Badge>
                                            )}
                                        </div>
                                        {ext.description && (
                                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                                {ext.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {ext.version && (
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                v{ext.version}
                                            </span>
                                        )}
                                        {togglingExtension === ext.name && (
                                            <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                            ))}
                            {filteredExtensions.length === 0 && (
                                <div className="py-8 text-center text-xs text-muted-foreground">
                                    No match
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="ini" className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        {!rawMode && (
                            <div className="relative flex-1 min-w-[160px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search settings…"
                                    value={iniSearch}
                                    onChange={(e) => setIniSearch(e.target.value)}
                                    className="pl-8 h-8 text-xs bg-white/5 border-white/10"
                                />
                            </div>
                        )}
                        {rawMode &&
                            rawDiff &&
                            (rawDiff.added + rawDiff.changed + rawDiff.removed > 0) && (
                                <div className="flex items-center gap-1.5 text-[10px] font-mono flex-1">
                                    {rawDiff.added > 0 && (
                                        <span className="text-green-400">+{rawDiff.added}</span>
                                    )}
                                    {rawDiff.changed > 0 && (
                                        <span className="text-yellow-400">~{rawDiff.changed}</span>
                                    )}
                                    {rawDiff.removed > 0 && (
                                        <span className="text-red-400">-{rawDiff.removed}</span>
                                    )}
                                    <span className="text-muted-foreground ml-1">changes</span>
                                </div>
                            )}
                        {!rawMode && (
                            <Button
                                variant={showOnlyChanged ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                    "h-8 text-xs gap-1.5",
                                    showOnlyChanged
                                        ? cn(colors.bg, colors.text, "border", colors.border)
                                        : "border-white/10 bg-white/5"
                                )}
                                onClick={() => setShowOnlyChanged((v) => !v)}
                            >
                                <Filter className="w-3 h-3" />
                                Changed
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 border-white/10 bg-white/5"
                            onClick={() => {
                                setRawMode((v) => !v);
                                if (!rawMode) setRawIni(originalIniContent);
                            }}
                        >
                            {rawMode ? (
                                <>
                                    <Eye className="w-3 h-3" /> Visual
                                </>
                            ) : (
                                <>
                                    <FileText className="w-3 h-3" /> Raw
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 border-white/10 bg-white/5"
                            onClick={resetIni}
                            disabled={savingIni || !iniDirty}
                        >
                            <RotateCcw className="w-3 h-3" /> Reset
                        </Button>
                        <Button
                            size="sm"
                            className={cn(
                                "h-8 text-xs gap-1.5",
                                colors.bg,
                                colors.text,
                                "border",
                                colors.border,
                                !iniDirty && "opacity-50 pointer-events-none"
                            )}
                            onClick={saveIniSettings}
                            disabled={savingIni || !iniDirty}
                        >
                            {savingIni ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                                <Save className="w-3 h-3" />
                            )}
                            Save
                        </Button>
                    </div>

                    {iniPath && (
                        <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-[11px] font-mono text-muted-foreground truncate flex-1">
                                {iniPath}
                            </span>
                            <CopyButton text={iniPath} />
                        </div>
                    )}

                    {rawMode ? (
                        <div className="space-y-2">
                            <Textarea
                                value={rawIni}
                                onChange={(e) => setRawIni(e.target.value)}
                                className="font-mono text-[11px] leading-5 bg-[#0d0d0d] border-white/10 min-h-[480px] resize-y"
                                spellCheck={false}
                                placeholder="; php.ini content…"
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {groupedIni.length === 0 && (
                                <div className="rounded-xl border border-white/10 p-6 text-center text-xs text-muted-foreground">
                                    {showOnlyChanged ? "No changed settings" : "No settings found"}
                                </div>
                            )}
                            {groupedIni.map(({ section, items }) => {
                                const isOpen = expandedSections.has(section.label);
                                const changedInSection = items.filter(
                                    (s) => originalSettings.get(s.key) !== s.value
                                ).length;

                                return (
                                    <div
                                        key={section.label}
                                        className="rounded-xl border border-white/10 overflow-hidden"
                                    >
                                        <button
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left"
                                            onClick={() => toggleSection(section.label)}
                                        >
                                            <span className={colors.text}>{section.icon}</span>
                                            <span className="text-xs font-semibold text-white/80 flex-1">
                                                {section.label}
                                            </span>
                                            {changedInSection > 0 && (
                                                <Badge className="text-[10px] h-4 px-1.5 bg-yellow-500/15 text-yellow-400 border-yellow-500/25">
                                                    {changedInSection} changed
                                                </Badge>
                                            )}
                                            <span className="text-[10px] text-muted-foreground">
                                                {items.length}
                                            </span>
                                            {isOpen ? (
                                                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                            )}
                                        </button>

                                        {isOpen && (
                                            <div className="divide-y divide-white/5">
                                                {items.map((setting) => {
                                                    const isChanged =
                                                        originalSettings.get(setting.key) !==
                                                        setting.value;
                                                    return (
                                                        <div
                                                            key={setting.key}
                                                            className={cn(
                                                                "flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors",
                                                                isChanged &&
                                                                    "bg-yellow-500/[0.04]"
                                                            )}
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[12px] font-mono text-white/85">
                                                                        {setting.key}
                                                                    </span>
                                                                    {isChanged && (
                                                                        <span className="text-[10px] text-yellow-400/70 font-mono">
                                                                            {originalSettings.get(
                                                                                setting.key
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {setting.description && (
                                                                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-4">
                                                                        {setting.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="w-44 shrink-0">
                                                                {setting.type === "boolean" ? (
                                                                    <Select
                                                                        value={setting.value}
                                                                        onValueChange={(v) =>
                                                                            handleIniSettingChange(
                                                                                setting.key,
                                                                                v
                                                                            )
                                                                        }
                                                                    >
                                                                        <SelectTrigger
                                                                            className={cn(
                                                                                "h-7 text-xs bg-white/5 border-white/10",
                                                                                isChanged &&
                                                                                    "border-yellow-500/40"
                                                                            )}
                                                                        >
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem
                                                                                value="On"
                                                                                className="text-xs"
                                                                            >
                                                                                On
                                                                            </SelectItem>
                                                                            <SelectItem
                                                                                value="Off"
                                                                                className="text-xs"
                                                                            >
                                                                                Off
                                                                            </SelectItem>
                                                                            <SelectItem
                                                                                value="1"
                                                                                className="text-xs"
                                                                            >
                                                                                1
                                                                            </SelectItem>
                                                                            <SelectItem
                                                                                value="0"
                                                                                className="text-xs"
                                                                            >
                                                                                0
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : setting.type === "select" ? (
                                                                    <Select
                                                                        value={setting.value}
                                                                        onValueChange={(v) =>
                                                                            handleIniSettingChange(
                                                                                setting.key,
                                                                                v
                                                                            )
                                                                        }
                                                                    >
                                                                        <SelectTrigger
                                                                            className={cn(
                                                                                "h-7 text-xs bg-white/5 border-white/10",
                                                                                isChanged &&
                                                                                    "border-yellow-500/40"
                                                                            )}
                                                                        >
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {setting.options?.map(
                                                                                (o) => (
                                                                                    <SelectItem
                                                                                        key={o}
                                                                                        value={o}
                                                                                        className="text-xs"
                                                                                    >
                                                                                        {o}
                                                                                    </SelectItem>
                                                                                )
                                                                            )}
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : (
                                                                    <Input
                                                                        value={setting.value}
                                                                        onChange={(e) =>
                                                                            handleIniSettingChange(
                                                                                setting.key,
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            "h-7 text-xs font-mono bg-white/5 border-white/10",
                                                                            isChanged &&
                                                                                "border-yellow-500/40 bg-yellow-500/5"
                                                                        )}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="info" className="mt-4 space-y-4">
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={loadPhpInfo}
                            className={cn(
                                "text-xs gap-1.5",
                                colors.bg,
                                colors.text,
                                "border",
                                colors.border
                            )}
                            disabled={phpInfoLoading || restarting}
                        >
                            <RefreshCw
                                className={cn(
                                    "w-3.5 h-3.5",
                                    (phpInfoLoading || restarting) && "animate-spin"
                                )}
                            />
                            {phpInfoLoading ? "Loading…" : "Refresh"}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1.5 border-white/10 bg-white/5"
                            onClick={async () => {
                                const content = await runtimeService.getPhpIniContent();
                                setRawIni(content);
                                setRawMode(true);
                                setActiveTab("ini");
                            }}
                        >
                            <FileText className="w-3.5 h-3.5" /> Edit php.ini
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            {
                                label: "PHP Version",
                                value: phpVersion ?? "Unknown",
                                icon: <Code2 className="w-4 h-4" />,
                            },
                            {
                                label: "SAPI",
                                value: phpInfo?.sapi ?? "Unknown",
                                icon: <Terminal className="w-4 h-4" />,
                            },
                            {
                                label: "Active Extensions",
                                value: String(enabledCount),
                                icon: <Layers className="w-4 h-4" />,
                            },
                            {
                                label: "Package Manager",
                                value: lang.packageManager,
                                icon: <Package className="w-4 h-4" />,
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className={cn("rounded-xl p-4 border", colors.bg, colors.border)}
                            >
                                <div className={cn("mb-2", colors.text)}>{item.icon}</div>
                                <p className="text-[11px] text-muted-foreground">{item.label}</p>
                                <p className="text-sm font-semibold text-white mt-0.5 font-mono">
                                    {item.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-xl border border-white/10 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                            <span className="text-xs font-medium">phpinfo() summary</span>
                            <CopyButton
                                text={[
                                    `PHP Version => ${phpVersion ?? "Unknown"}`,
                                    `Server API => ${phpInfo?.sapi ?? "CLI"}`,
                                    `Configuration File => ${iniPath}`,
                                    `memory_limit => ${
                                        iniSettings.find((s) => s.key === "memory_limit")?.value ??
                                        "128M"
                                    }`,
                                    `max_execution_time => ${
                                        iniSettings.find((s) => s.key === "max_execution_time")
                                            ?.value ?? "30"
                                    }`,
                                    `upload_max_filesize => ${
                                        iniSettings.find((s) => s.key === "upload_max_filesize")
                                            ?.value ?? "2M"
                                    }`,
                                    `post_max_size => ${
                                        iniSettings.find((s) => s.key === "post_max_size")
                                            ?.value ?? "8M"
                                    }`,
                                ].join("\n")}
                            />
                        </div>
                        <div className="p-4 font-mono text-[11px] text-muted-foreground space-y-1.5 max-h-72 overflow-y-auto">
                            {[
                                ["PHP Version", phpVersion ?? "Unknown"],
                                ["Server API", phpInfo?.sapi ?? "CLI"],
                                ["Configuration File", iniPath || "/etc/php/php.ini"],
                                [
                                    "memory_limit",
                                    iniSettings.find((s) => s.key === "memory_limit")?.value ??
                                        "128M",
                                ],
                                [
                                    "max_execution_time",
                                    iniSettings.find((s) => s.key === "max_execution_time")
                                        ?.value ?? "30",
                                ],
                                [
                                    "upload_max_filesize",
                                    iniSettings.find((s) => s.key === "upload_max_filesize")
                                        ?.value ?? "2M",
                                ],
                                [
                                    "post_max_size",
                                    iniSettings.find((s) => s.key === "post_max_size")?.value ??
                                        "8M",
                                ],
                                [
                                    "display_errors",
                                    iniSettings.find((s) => s.key === "display_errors")?.value ??
                                        "Off",
                                ],
                                [
                                    "error_reporting",
                                    iniSettings.find((s) => s.key === "error_reporting")?.value ??
                                        "E_ALL",
                                ],
                                [
                                    "allow_url_fopen",
                                    iniSettings.find((s) => s.key === "allow_url_fopen")?.value ??
                                        "On",
                                ],
                            ].map(([k, v]) => (
                                <div
                                    key={k}
                                    className="flex gap-2 hover:text-white/70 transition-colors"
                                >
                                    <span className="text-white/50 min-w-[160px] shrink-0">
                                        {k}
                                    </span>
                                    <span className="text-white/30">=&gt;</span>
                                    <span>{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="repl" className="mt-4 space-y-3">
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                            <span className="text-xs font-medium">PHP Runner</span>
                            <div className="flex items-center gap-2">
                                <CopyButton text={runCode} />
                                <Button
                                    size="sm"
                                    onClick={runPhpCode}
                                    disabled={running || restarting}
                                    className={cn(
                                        "h-6 text-[11px] gap-1 px-2.5",
                                        colors.bg,
                                        colors.text,
                                        "border",
                                        colors.border
                                    )}
                                >
                                    {running ? (
                                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                    ) : (
                                        <Play className="w-2.5 h-2.5" />
                                    )}
                                    Run
                                </Button>
                            </div>
                        </div>
                        <Textarea
                            value={runCode}
                            onChange={(e) => setRunCode(e.target.value)}
                            className="font-mono text-[11px] leading-5 bg-[#0d0d0d] border-0 resize-none min-h-[160px] rounded-none focus-visible:ring-0"
                            spellCheck={false}
                            onKeyDown={(e) => {
                                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                    e.preventDefault();
                                    runPhpCode();
                                }
                            }}
                        />
                    </div>
                    {runOutput && (
                        <div className="rounded-xl border border-white/10 overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-white/10 bg-white/5 flex items-center gap-2">
                                <Terminal className="w-3.5 h-3.5 text-green-400" />
                                <span className="text-xs font-medium">Output</span>
                                <CopyButton text={runOutput} className="ml-auto" />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 text-[10px] px-1.5 text-muted-foreground"
                                    onClick={() => setRunOutput("")}
                                >
                                    Clear
                                </Button>
                            </div>
                            <pre className="p-4 text-[11px] font-mono text-green-300/80 max-h-52 overflow-auto whitespace-pre-wrap leading-5">
                                {runOutput}
                            </pre>
                        </div>
                    )}
                    <p className="text-[10px] text-muted-foreground text-center">
                        Ctrl+Enter to run
                    </p>
                </TabsContent>
            </Tabs>

            <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
                <DialogContent className="bg-zinc-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <AlertCircle className="w-4 h-4 text-yellow-400" />
                            Restart Required
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs leading-5 mt-1">
                            PHP configuration changes take effect after restart.
                            {pendingToggle && (
                                <span className="block mt-2 text-white/70">
                                    {pendingToggle.enable ? "Enabled" : "Disabled"}:{" "}
                                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono">
                                        {pendingToggle.name}
                                    </code>
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-white/10 bg-white/5 text-xs"
                            onClick={() => setShowRestartDialog(false)}
                            disabled={restarting}
                        >
                            Later
                        </Button>
                        <Button
                            size="sm"
                            className={cn(
                                "text-xs gap-1.5",
                                colors.bg,
                                colors.text,
                                "border",
                                colors.border
                            )}
                            onClick={handleRestartPhp}
                            disabled={restarting}
                        >
                            {restarting ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Restarting…
                                </>
                            ) : (
                                "Restart PHP Now"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}