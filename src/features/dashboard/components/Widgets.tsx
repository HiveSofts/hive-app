import { cn } from "@/core/lib/utils";

import { useState, useEffect } from "react";

import { Database, Network, Shield } from "lucide-react";

import { invoke } from "@tauri-apps/api/core";

import { WidgetsState } from "../types";

export function Widgets({
    widgets,
    setWidgets,
    widgetData,
}: {
    widgets: WidgetsState;
    setWidgets: (w: WidgetsState) => void;
    widgetData: {
        dbConnections: { name: string; driver: string; db: string; status: string }[];
        sslCerts: { domain: string; expiry: string; daysLeft: number }[];
        tunnels: { projectName: string; localUrl: string; publicUrl?: string; status: string; startedAt: string }[];
    };
}) {
    const [phpInfo, setPhpInfo] = useState<{ version: string; path: string; extensions: number; opcache: boolean } | null>(null);
    const [nodeVersions, setNodeVersions] = useState<string[]>([]);
    const [npmVersion, setNpmVersion] = useState<string | null>(null);

    useEffect(() => {
        const fetchRuntimeInfo = async () => {
            try {
                const php = await invoke<{ version: string; path: string; extensions: number; opcache: boolean } | null>("get_php_version_info");
                setPhpInfo(php);
            } catch {
                setPhpInfo(null);
            }

            try {
                const nodes = await invoke<string[]>("get_installed_runtimes", { type: "node" });
                setNodeVersions(nodes);
            } catch {
                setNodeVersions([]);
            }

            try {
                const npm = await invoke<string | null>("execute_shell_command", {
                    command: "npm --version",
                    cwd: "/tmp",
                });
                setNpmVersion(npm || null);
            } catch {
                setNpmVersion(null);
            }
        };

        if (widgets.php || widgets.node) {
            fetchRuntimeInfo();
        }
    }, [widgets.php, widgets.node]);

    const toggleWidget = (id: keyof WidgetsState) => {
        setWidgets({ ...widgets, [id]: !widgets[id] });
    };

    const displayNode = nodeVersions.length > 0 ? nodeVersions.join(", ") : "v20.14.0 LTS";
    const displayNpm = npmVersion || "10.7.0";

    return (
        <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
                {[
                    { id: "php" as const, label: "PHP Info" },
                    { id: "node" as const, label: "Node.js Info" },
                    { id: "db" as const, label: "DB Connections" },
                    { id: "ssl" as const, label: "SSL Certificates" },
                    { id: "tunnel" as const, label: "Tunnel Status" },
                ].map((w) => (
                    <button
                        key={w.id}
                        onClick={() => toggleWidget(w.id)}
                        className={cn(
                            "text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors",
                            widgets[w.id]
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                                : "border-border text-muted-foreground hover:bg-muted"
                        )}
                    >
                        {widgets[w.id] ? "✓ " : "+ "}
                        {w.label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {widgets.php && (
                    <div className="rounded-xl border bg-card p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-base">🐘</span>
                            <span className="text-sm font-medium">PHP Info</span>
                        </div>
                        <div className="space-y-1 text-xs font-mono text-muted-foreground">
                            <div className="flex justify-between">
                                <span>Default</span>
                                <span className="text-foreground">{phpInfo?.version || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Path</span>
                                <span className="text-foreground truncate">{phpInfo?.path || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Extensions</span>
                                <span className="text-foreground">
                                    {phpInfo?.extensions !== undefined ? `${phpInfo.extensions} loaded` : "—"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>OPcache</span>
                                <span className={cn(phpInfo?.opcache ? "text-emerald-500" : "text-muted-foreground")}>
                                    {phpInfo ? (phpInfo.opcache ? "enabled" : "disabled") : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                {widgets.node && (
                    <div className="rounded-xl border bg-card p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-base">🟩</span>
                            <span className="text-sm font-medium">Node.js Info</span>
                        </div>
                        <div className="space-y-1 text-xs font-mono text-muted-foreground">
                            <div className="flex justify-between">
                                <span>Node</span>
                                <span className="text-foreground">{displayNode}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>npm</span>
                                <span className="text-foreground">{displayNpm}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>pnpm</span>
                                <span className="text-muted-foreground">—</span>
                            </div>
                            <div className="flex justify-between">
                                <span>bun</span>
                                <span className="text-foreground">—</span>
                            </div>
                        </div>
                    </div>
                )}
                {widgets.db && (
                    <div className="rounded-xl border bg-card p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium">DB Connections</span>
                        </div>
                        <div className="space-y-1.5">
                            {widgetData.dbConnections.map((c) => (
                                <div key={c.name} className="flex items-center gap-2 text-xs">
                                    <span
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                            c.status === "connected"
                                                ? "bg-emerald-500 animate-pulse"
                                                : "bg-zinc-400"
                                        )}
                                    />
                                    <span className="font-mono truncate flex-1 text-muted-foreground">
                                        {c.name}
                                    </span>
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                        {c.driver}
                                    </span>
                                    <span
                                        className={cn(
                                            "text-[10px]",
                                            c.status === "connected"
                                                ? "text-emerald-500"
                                                : "text-zinc-400"
                                        )}
                                    >
                                        {c.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {widgets.ssl && (
                    <div className="rounded-xl border bg-card p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium">SSL Certificates</span>
                        </div>
                        <div className="space-y-1.5">
                            {widgetData.sslCerts.map((c) => (
                                <div key={c.domain} className="text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-foreground">
                                            {c.domain}
                                        </span>
                                        <span
                                            className={cn(
                                                "text-[10px] font-medium",
                                                c.daysLeft < 30
                                                    ? "text-red-500"
                                                    : c.daysLeft < 90
                                                      ? "text-yellow-500"
                                                      : "text-emerald-500"
                                            )}
                                        >
                                            {c.daysLeft}d left
                                        </span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1 mt-1">
                                        <div
                                            className={cn(
                                                "h-1 rounded-full transition-all",
                                                c.daysLeft < 30
                                                    ? "bg-red-500"
                                                    : c.daysLeft < 90
                                                      ? "bg-yellow-500"
                                                      : "bg-emerald-500"
                                            )}
                                            style={{
                                                width: `${Math.min(100, (c.daysLeft / 365) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {widgets.tunnel && (
                    <div className="rounded-xl border bg-card p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <Network className="w-4 h-4 text-purple-500" />
                            <span className="text-sm font-medium">Tunnel</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">
                                Expose
                            </span>
                        </div>
                        <div className="space-y-1 text-xs font-mono text-muted-foreground">
                            {widgetData.tunnels.length === 0 ? (
                                <>
                                    <div className="flex justify-between">
                                        <span>Status</span>
                                        <span className="text-yellow-500">inactive</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>URL</span>
                                        <span className="text-muted-foreground/40">—</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Requests</span>
                                        <span className="text-muted-foreground/40">—</span>
                                    </div>
                                </>
                            ) : (
                                widgetData.tunnels.map((t) => (
                                    <div key={t.projectName} className="space-y-1">
                                        <div className="flex justify-between">
                                            <span>{t.projectName}</span>
                                            <span className={cn(
                                                "text-[10px]",
                                                t.status === "active" ? "text-emerald-500" : "text-yellow-500"
                                            )}>
                                                {t.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Local</span>
                                            <span className="text-foreground truncate">{t.localUrl}</span>
                                        </div>
                                        {t.publicUrl && (
                                            <div className="flex justify-between">
                                                <span>Public</span>
                                                <span className="text-foreground truncate">{t.publicUrl}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        {widgetData.tunnels.length === 0 && (
                            <button className="w-full mt-1 text-[11px] py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted transition-colors">
                                Start tunnel
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}