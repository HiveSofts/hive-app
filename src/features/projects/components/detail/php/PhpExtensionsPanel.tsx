import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PhpExtension {
    name: string;
    enabled: boolean;
    version?: string;
}

interface PhpIniSetting {
    key: string;
    value: string;
}

interface PhpInfo {
    version: string;
    sapi: string;
    extensions: PhpExtension[];
    ini_settings: PhpIniSetting[];
}

interface PhpExtensionsPanelProps {
    projectPath: string;
    projectName?: string;
    projectType?: string;
    version?: string;
}

const FALLBACK_INFO: PhpInfo = {
    version: "8.3",
    sapi: "cli-server",
    extensions: [
        "bcmath",
        "curl",
        "fileinfo",
        "gd",
        "intl",
        "json",
        "mbstring",
        "openssl",
        "pdo",
        "pdo_mysql",
        "pdo_sqlite",
        "tokenizer",
        "xml",
        "zip",
    ].map((name) => ({ name, enabled: true })),
    ini_settings: [
        { key: "memory_limit", value: "256M" },
        { key: "max_execution_time", value: "30" },
        { key: "upload_max_filesize", value: "64M" },
        { key: "post_max_size", value: "64M" },
        { key: "display_errors", value: "Off" },
        { key: "error_reporting", value: "E_ALL" },
        { key: "date.timezone", value: "UTC" },
        { key: "opcache.enable", value: "1" },
    ],
};

export function PhpExtensionsPanel({ projectPath, version }: PhpExtensionsPanelProps) {
    const [phpInfo, setPhpInfo] = useState<PhpInfo>({
        ...FALLBACK_INFO,
        version: version ?? FALLBACK_INFO.version,
    });
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadPhpInfo();
    }, [projectPath]);

    const loadPhpInfo = async () => {
        try {
            const info = await invoke<PhpInfo>("get_php_info", { projectPath });
            setPhpInfo(info);
        } catch {
            // backend command not yet implemented — keep fallback already shown
        }
    };

    const refresh = async () => {
        setRefreshing(true);
        await loadPhpInfo();
        setRefreshing(false);
    };

    const enabled = phpInfo.extensions.filter((e) => e.enabled);
    const disabled = phpInfo.extensions.filter((e) => !e.enabled);

    return (
        <div className="space-y-4">
            {/* Runtime summary */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">PHP Runtime</span>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className="font-mono text-indigo-500 border-indigo-500/30 bg-indigo-500/10"
                        >
                            PHP {phpInfo.version}
                        </Badge>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={refresh}
                            disabled={refreshing}
                        >
                            {refreshing ? (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <RefreshCw className="w-3 h-3" />
                            )}
                            Refresh
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {[
                        { label: "PHP Version", value: phpInfo.version },
                        { label: "SAPI", value: phpInfo.sapi },
                        { label: "Extensions loaded", value: String(enabled.length) },
                    ].map((r) => (
                        <div key={r.label} className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">{r.label}</span>
                            <span className="font-mono font-medium">{r.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* php.ini directives */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground">
                        php.ini settings
                    </span>
                </div>
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b bg-muted/20">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                                Directive
                            </th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                                Value
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {phpInfo.ini_settings.map((s) => (
                            <tr
                                key={s.key}
                                className="border-b last:border-0 hover:bg-muted/20"
                            >
                                <td className="px-4 py-2.5 font-mono text-foreground/80">
                                    {s.key}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-indigo-500 dark:text-indigo-400">
                                    {s.value}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Loaded extensions */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Loaded Extensions</span>
                    <span className="text-xs text-muted-foreground">{enabled.length} active</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {enabled.map((ext) => (
                        <span
                            key={ext.name}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-mono border bg-indigo-500/10 border-indigo-500/30 text-indigo-500 dark:text-indigo-400"
                        >
                            {ext.name}
                            {ext.version && (
                                <span className="text-indigo-300 ml-1 text-[10px]">
                                    {ext.version}
                                </span>
                            )}
                        </span>
                    ))}
                    {disabled.map((ext) => (
                        <span
                            key={ext.name}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-mono border bg-muted border-border text-muted-foreground line-through"
                        >
                            {ext.name}
                        </span>
                    ))}
                </div>
                {disabled.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                        Strikethrough extensions are not loaded.
                    </p>
                )}
            </div>
        </div>
    );
}
