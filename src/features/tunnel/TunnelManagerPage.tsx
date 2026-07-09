import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Cloud,
    CloudOff,
    Copy,
    Download,
    ExternalLink,
    FolderOpen,
    Globe,
    Info,
    Key,
    Loader2,
    PlayCircle,
    RefreshCw,
    Settings,
    Share2,
    Square,
    Terminal,
    Wifi,
    X,
    Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useTunnel } from "./hooks/useTunnel";
import {
    TunnelSession,
    buildLocalUrl,
    getTunnelHistory,
    getTunnelLogs,
} from "./services/tunnelService";

interface Project {
    id: number;
    name: string;
    path: string;
    port: number;
    status: string;
}

interface RunningServer {
    project_path: string;
    project_name: string;
    project_type: string;
    port: number;
    pid: number;
    url: string;
    started_at: string;
    is_running: boolean;
}

function normalizeLog(l: any): { line: string; isError: boolean; timestamp?: string } {
    return {
        line: l.line ?? l.message ?? "",
        isError: l.is_error ?? l.isError ?? false,
        timestamp: l.timestamp,
    };
}

function classifyLine(line: string): "error" | "warn" | "url" | "info" | "debug" {
    const lo = line.toLowerCase();
    if (lo.includes("error") || lo.includes("failed") || lo.includes("fatal")) return "error";
    if (lo.includes("warn") || lo.includes("warning")) return "warn";
    if (lo.includes("https://") && (lo.includes("trycloudflare") || lo.includes("cfargotunnel")))
        return "url";
    if (
        lo.includes("inf") ||
        lo.includes("info") ||
        lo.includes("connected") ||
        lo.includes("registered")
    )
        return "info";
    return "debug";
}

function stripPrefix(line: string): string {
    return line
        .replace(/^\[\d{4}-[^\]]+\]\s*/, "")
        .replace(/^\[(INF|ERR|WRN|DBG|inf|err|wrn|dbg)\]\s*/i, "")
        .trim();
}

function StatusPill({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        active: {
            label: "Active",
            cls: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        },
        connecting: {
            label: "Connecting…",
            cls: "text-amber-400  border-amber-400/30  bg-amber-400/10",
        },
        stopped: {
            label: "Stopped",
            cls: "text-zinc-400   border-zinc-600/40                     ",
        },
        error: { label: "Error", cls: "text-red-400    border-red-500/30    bg-red-500/10" },
    };
    const s = map[status] ?? map.stopped;
    return (
        <Badge variant="outline" className={`text-[10px] gap-1 shrink-0 ${s.cls}`}>
            {status === "connecting" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
            {status === "active" && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            )}
            {s.label}
        </Badge>
    );
}

function InstallPanel({
    onInstall,
    progress,
    isInstalling,
}: {
    onInstall: () => void;
    progress: number;
    isInstalling: boolean;
}) {
    return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
                <CloudOff className="w-8 h-8 text-amber-500" />
                <div>
                    <p className="font-semibold text-sm">cloudflared not installed</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Hive will download it automatically to{" "}
                        <code className="font-mono">~/.hive/bin/</code>
                    </p>
                </div>
            </div>
            {isInstalling ? (
                <div className="space-y-2">
                    <Progress value={progress} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground text-center">
                        Downloading cloudflared… {progress}%
                    </p>
                </div>
            ) : (
                <Button
                    onClick={onInstall}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
                >
                    <Download className="w-4 h-4" /> Install cloudflared
                </Button>
            )}
        </div>
    );
}

function ActiveBanner({
    session,
    onStop,
    onCopy,
}: {
    session: TunnelSession;
    onStop: () => void;
    onCopy: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        onCopy();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    <span className="text-sm font-semibold">Tunnel Active</span>
                    <Badge
                        variant="outline"
                        className="text-emerald-400 border-emerald-500/30 text-[10px]"
                    >
                        {session.project_name}
                    </Badge>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10"
                    onClick={onStop}
                >
                    <Square className="w-3 h-3" /> Stop
                </Button>
            </div>

            <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Public URL
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono bg-black/20 border border-border/50 px-3 py-2 rounded-lg flex-1 break-all text-emerald-300">
                        {session.public_url ?? "Waiting for URL…"}
                    </code>
                    {session.public_url && (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={handleCopy}
                                title="Copy URL"
                            >
                                {copied ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => window.open(session.public_url, "_blank")}
                                title="Open"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                    { label: "Local", value: session.local_url },
                    { label: "Started", value: new Date(session.started_at).toLocaleTimeString() },
                    { label: "Status", value: <StatusPill status={session.status} /> },
                ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                        <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
                        <div className="text-xs font-mono font-semibold truncate">{value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StartForm({
    projects,
    onStart,
    isConnecting,
    onRefresh,
}: {
    projects: Project[];
    onStart: (localUrl: string, name: string, path: string) => void;
    isConnecting: boolean;
    onRefresh: () => void;
}) {
    const running = projects.filter((p) => p.status === "running");
    const [selectedPath, setSelectedPath] = useState("");
    const [customUrl, setCustomUrl] = useState("");
    const [useCustom, setUseCustom] = useState(false);
    const selected = running.find((p) => p.path === selectedPath);

    const handleStart = () => {
        if (useCustom) {
            if (!customUrl.trim()) return;
            onStart(customUrl.trim(), "custom", "custom");
        } else {
            if (!selected) return;
            onStart(buildLocalUrl(selected.port ?? 8000), selected.name, selected.path);
        }
    };

    return (
        <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium">Start Tunnel</span>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={onRefresh}
                    title="Refresh projects"
                >
                    <RefreshCw className="w-3 h-3" />
                </Button>
            </div>

            <div className="flex gap-2">
                {["Running Project", "Custom URL"].map((label, i) => (
                    <button
                        key={label}
                        onClick={() => setUseCustom(i === 1)}
                        className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                            useCustom === (i === 1)
                                ? "bg-foreground text-background border-foreground"
                                : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {!useCustom ? (
                <Card className="w-full border-border/60 shadow-sm">
                    <CardContent className="space-y-4 p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-primary" />
                                <p className="text-sm font-medium">Running Projects</p>
                            </div>

                            <Badge variant="secondary">{running.length} Running</Badge>
                        </div>

                        <Select value={selectedPath} onValueChange={setSelectedPath}>
                            <SelectTrigger className="w-full h-11">
                                <SelectValue placeholder="Select a running project..." />
                            </SelectTrigger>

                            <SelectContent className="w-full">
                                {running.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <PlayCircle className="mb-2 h-8 w-8 text-muted-foreground/40" />

                                        <p className="text-sm font-medium">No running projects</p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Start a project first to share it publicly.
                                        </p>
                                    </div>
                                ) : (
                                    running.map((project) => (
                                        <SelectItem
                                            key={project.path}
                                            value={project.path}
                                            className="py-3"
                                        >
                                            <div className="flex w-full items-center justify-between gap-4">
                                                <div className="truncate font-medium">
                                                    {project.name}
                                                </div>

                                                <Badge variant="outline" className="font-mono">
                                                    :{project.port ?? 8000}
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>

                        {running.length > 0 && selectedPath && (
                            <div className="rounded-lg border bg-muted/40 px-3 py-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Globe className="h-3.5 w-3.5" />
                                    Ready to expose the selected project.
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card className="w-full border-border/60 shadow-sm">
                    <CardContent className="space-y-4 p-5">
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Custom Local URL</p>
                        </div>

                        <Input
                            className="h-11 w-full font-mono"
                            placeholder="http://localhost:8000"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                        />

                        <p className="text-xs text-muted-foreground">
                            Enter any local HTTP URL you want to expose publicly.
                        </p>
                    </CardContent>
                </Card>
            )}
            <Button
                onClick={handleStart}
                disabled={
                    isConnecting ||
                    (!useCustom && !selectedPath) ||
                    (useCustom && !customUrl.trim())
                }
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
                {isConnecting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Connecting…
                    </>
                ) : (
                    <>
                        <Cloud className="w-4 h-4" /> Start Tunnel
                    </>
                )}
            </Button>
        </div>
    );
}

function LogLine({ raw, index }: { raw: any; index: number }) {
    const { line, isError, timestamp } = normalizeLog(raw);
    const clean = stripPrefix(line);
    const kind = isError ? "error" : classifyLine(clean || line);

    const kindMeta = {
        error: {
            cls: "text-red-400",
            bg: "hover:bg-red-500/5",
            icon: <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />,
        },
        warn: {
            cls: "text-amber-300",
            bg: "hover:bg-amber-500/5",
            icon: <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0 mt-0.5" />,
        },
        url: {
            cls: "text-emerald-300 font-semibold",
            bg: "hover:bg-emerald-500/5",
            icon: <Zap className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />,
        },
        info: {
            cls: "text-blue-300",
            bg: "hover:bg-blue-500/5",
            icon: <Info className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />,
        },
        debug: {
            cls: "text-zinc-400",
            bg: "hover:bg-white/2",
            icon: (
                <span className="w-3 h-3 shrink-0 mt-0.5 text-zinc-600 font-mono text-[9px] flex items-center justify-center">
                    ›
                </span>
            ),
        },
    } as const;

    const meta = kindMeta[kind];
    const displayText = clean || line;
    const urlMatch = displayText.match(/https?:\/\/[^\s"',]+/);

    return (
        <div
            className={`flex items-start gap-2 px-3 py-[3px] rounded transition-colors group ${meta.bg}`}
        >
            <span className="text-zinc-700 font-mono text-[9px] w-6 text-right shrink-0 select-none mt-0.5 group-hover:text-zinc-500 transition-colors">
                {index + 1}
            </span>
            {meta.icon}
            {timestamp && (
                <span className="text-zinc-600 font-mono text-[10px] shrink-0 mt-0.5 tabular-nums">
                    {new Date(timestamp).toLocaleTimeString("en-US", {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    })}
                </span>
            )}
            <span className={`font-mono text-[11px] leading-relaxed break-all ${meta.cls}`}>
                {urlMatch ? (
                    <>
                        {displayText.slice(0, displayText.indexOf(urlMatch[0]))}
                        <a
                            href={urlMatch[0]}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => {
                                e.preventDefault();
                                window.open(urlMatch[0], "_blank");
                            }}
                            className="underline decoration-dotted underline-offset-2 hover:decoration-solid cursor-pointer"
                        >
                            {urlMatch[0]}
                        </a>
                        {displayText.slice(displayText.indexOf(urlMatch[0]) + urlMatch[0].length)}
                    </>
                ) : (
                    displayText
                )}
            </span>
        </div>
    );
}

function LogsPanel({
    logs,
    onClear,
    onRefresh,
    isLoading,
    sessionId,
}: {
    logs: any[];
    onClear: () => void;
    onRefresh: () => void;
    isLoading: boolean;
    sessionId?: number;
}) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const [filter, setFilter] = useState<"all" | "error" | "warn" | "info" | "url">("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        setFilter("all");
        setSearch("");
        setAutoScroll(true);
    }, [sessionId]);

    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, autoScroll]);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        setAutoScroll(scrollHeight - scrollTop - clientHeight < 60);
    };

    const filtered = logs.filter((l) => {
        const { line, isError } = normalizeLog(l);
        const clean = stripPrefix(line);
        const kind = isError ? "error" : classifyLine(clean || line);
        if (filter !== "all" && kind !== filter) return false;
        if (search && !(clean || line).toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const counts = {
        error: logs.filter((l) => {
            const { line, isError } = normalizeLog(l);
            return isError || classifyLine(stripPrefix(line)) === "error";
        }).length,
        warn: logs.filter((l) => {
            const { line } = normalizeLog(l);
            return classifyLine(stripPrefix(line)) === "warn";
        }).length,
        url: logs.filter((l) => {
            const { line } = normalizeLog(l);
            return classifyLine(stripPrefix(line)) === "url";
        }).length,
        info: logs.filter((l) => {
            const { line, isError } = normalizeLog(l);
            return !isError && classifyLine(stripPrefix(line)) === "info";
        }).length,
    };

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20 flex-wrap">
                <Terminal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium">Logs</span>
                {sessionId && (
                    <span className="text-[10px] text-zinc-600 font-mono">#{sessionId}</span>
                )}
                <div className="flex gap-1 ml-auto flex-wrap">
                    {(
                        [
                            { k: "all", label: `All (${logs.length})`, cls: undefined },
                            { k: "error", label: `Error (${counts.error})`, cls: "text-red-400" },
                            { k: "warn", label: `Warn (${counts.warn})`, cls: "text-amber-300" },
                            { k: "url", label: `URL (${counts.url})`, cls: "text-emerald-300" },
                            { k: "info", label: `Info (${counts.info})`, cls: "text-blue-300" },
                        ] as const
                    ).map(({ k, label, cls }) => (
                        <button
                            key={k}
                            onClick={() => setFilter(k as any)}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                                filter === k
                                    ? "bg-foreground text-background border-foreground"
                                    : `border-border hover:bg-muted ${cls ?? "text-muted-foreground"}`
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] gap-1"
                        onClick={onRefresh}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] gap-1"
                        onClick={onClear}
                    >
                        <X className="w-3 h-3" /> Clear
                    </Button>
                </div>
            </div>

            <div className="px-3 py-1.5 border-b bg-black/10">
                <input
                    placeholder="Search logs…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-mono text-foreground placeholder:text-zinc-600 outline-none"
                />
            </div>

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-[380px] overflow-y-auto py-1.5 bg-[#0d0d0f] scroll-smooth"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center h-full gap-2 text-zinc-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs">Loading logs…</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-600">
                        <Terminal className="w-8 h-8 opacity-30" />
                        <span className="text-xs">
                            {search || filter !== "all"
                                ? "No matching logs"
                                : "No logs yet — start a tunnel to see output here"}
                        </span>
                    </div>
                ) : (
                    <>
                        {filtered.map((l, i) => (
                            <LogLine key={i} raw={l} index={i} />
                        ))}
                        <div ref={bottomRef} />
                    </>
                )}
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/10 text-[10px] text-zinc-600">
                <span>
                    {filtered.length} of {logs.length} lines
                </span>
                <button
                    onClick={() => {
                        setAutoScroll(true);
                        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`transition-colors ${autoScroll ? "text-emerald-500" : "hover:text-foreground"}`}
                >
                    {autoScroll ? "● Auto-scroll on" : "↓ Jump to bottom"}
                </button>
            </div>
        </div>
    );
}

function HistoryPanel() {
    const [history, setHistory] = useState<TunnelSession[]>([]);
    const [expandedSession, setExpandedSession] = useState<number | null>(null);
    const [sessionLogs, setSessionLogs] = useState<Record<number, any[]>>({});
    const [loadingLogs, setLoadingLogs] = useState<Record<number, boolean>>({});
    const [copiedId, setCopiedId] = useState<number | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const data = await getTunnelHistory(50);
        setHistory(data);
        setExpandedSession((prev) => {
            if (prev !== null) fetchLogsForSession(prev, true);
            return prev;
        });
    };

    const fetchLogsForSession = async (sessionId: number, force = false) => {
        if (!force && sessionLogs[sessionId]) return;
        setLoadingLogs((prev) => ({ ...prev, [sessionId]: true }));
        try {
            const logs = await getTunnelLogs(sessionId, 200);
            setSessionLogs((prev) => ({ ...prev, [sessionId]: logs }));
        } catch {
            setSessionLogs((prev) => ({ ...prev, [sessionId]: [] }));
        } finally {
            setLoadingLogs((prev) => ({ ...prev, [sessionId]: false }));
        }
    };

    const toggleSession = async (sessionId: number) => {
        if (expandedSession === sessionId) {
            setExpandedSession(null);
            return;
        }
        setExpandedSession(sessionId);
        await fetchLogsForSession(sessionId, true);
    };

    const copyUrl = async (text: string, id: number) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Recent Tunnels
                </p>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] gap-1"
                    onClick={loadHistory}
                >
                    <RefreshCw className="w-3 h-3" /> Refresh
                </Button>
            </div>

            {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                    No tunnel history yet
                </p>
            ) : (
                <div className="space-y-2">
                    {history.map((s) => {
                        const isExpanded = expandedSession === s.id;
                        const logs = sessionLogs[s.id] ?? [];
                        const loading = loadingLogs[s.id] ?? false;

                        return (
                            <div key={s.id} className="rounded-lg border bg-card overflow-hidden">
                                <div
                                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => toggleSession(s.id)}
                                >
                                    <span className="text-muted-foreground shrink-0">
                                        {isExpanded ? (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        ) : (
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        )}
                                    </span>
                                    <StatusPill status={s.status} />
                                    <span className="font-medium text-xs truncate max-w-[100px]">
                                        {s.project_name}
                                    </span>
                                    <span className="text-muted-foreground font-mono flex-1 truncate text-[10px]">
                                        {s.public_url ?? s.local_url}
                                    </span>
                                    <span className="text-muted-foreground text-[10px] whitespace-nowrap shrink-0">
                                        {new Date(s.started_at).toLocaleTimeString()}
                                    </span>
                                    {s.public_url && (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(s.public_url, "_blank");
                                                }}
                                                className="text-muted-foreground hover:text-foreground shrink-0"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyUrl(s.public_url!, s.id);
                                                }}
                                                className="text-muted-foreground hover:text-foreground shrink-0"
                                            >
                                                {copiedId === s.id ? (
                                                    <Check className="w-3 h-3 text-emerald-400" />
                                                ) : (
                                                    <Copy className="w-3 h-3" />
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>

                                {isExpanded && (
                                    <div className="border-t bg-[#0d0d0f]">
                                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
                                            <span className="text-[10px] text-zinc-600 font-mono">
                                                {loading ? "loading…" : `${logs.length} lines`}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    fetchLogsForSession(s.id, true);
                                                }}
                                                disabled={loading}
                                                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
                                            >
                                                <RefreshCw
                                                    className={`w-2.5 h-2.5 ${loading ? "animate-spin" : ""}`}
                                                />
                                                Refresh
                                            </button>
                                        </div>

                                        {loading ? (
                                            <div className="flex items-center justify-center py-8 gap-2 text-zinc-500">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-xs">Loading logs…</span>
                                            </div>
                                        ) : logs.length === 0 ? (
                                            <div className="text-center py-8 text-xs text-zinc-600 flex flex-col items-center gap-2">
                                                <Terminal className="w-6 h-6 opacity-30" />
                                                No logs saved for this session
                                                <button
                                                    onClick={() => fetchLogsForSession(s.id, true)}
                                                    className="text-zinc-500 hover:text-zinc-300 underline text-[10px]"
                                                >
                                                    Try again
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="py-1.5 max-h-[300px] overflow-y-auto">
                                                {logs.map((log, i) => (
                                                    <LogLine key={i} raw={log} index={i} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function SettingsPanel({
    config,
    onSaveToken,
    onDeleteToken,
}: {
    config: any;
    onSaveToken: (t: string) => void;
    onDeleteToken: () => void;
}) {
    const [token, setToken] = useState("");
    const [showToken, setShowToken] = useState(false);

    return (
        <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <CheckCircle2
                        className={`w-4 h-4 ${config?.cloudflared_installed ? "text-emerald-500" : "text-muted-foreground"}`}
                    />
                    <span className="text-sm font-medium">cloudflared</span>
                    {config?.cloudflared_version && (
                        <Badge variant="outline" className="text-[10px] ml-auto">
                            {config.cloudflared_version}
                        </Badge>
                    )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                    Binary location: <code className="font-mono">~/.hive/bin/cloudflared</code>
                </p>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-500" />
                    <div>
                        <p className="text-sm font-medium">Auth Token (optional)</p>
                        <p className="text-[11px] text-muted-foreground">
                            For named tunnels with your Cloudflare account
                        </p>
                    </div>
                    {config?.has_auth && (
                        <Badge
                            variant="outline"
                            className="ml-auto text-emerald-500 border-emerald-500/30 text-[10px]"
                        >
                            Saved
                        </Badge>
                    )}
                </div>

                {!config?.has_auth ? (
                    <div className="space-y-2">
                        <Input
                            type={showToken ? "text" : "password"}
                            placeholder="Paste your Cloudflare tunnel token"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="h-8 text-xs font-mono"
                        />
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px]"
                                onClick={() => setShowToken(!showToken)}
                            >
                                {showToken ? "Hide" : "Show"}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    onSaveToken(token);
                                    setToken("");
                                }}
                                disabled={!token.trim()}
                                className="flex-1"
                            >
                                Save Token
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        onClick={onDeleteToken}
                    >
                        Remove Token
                    </Button>
                )}

                <p className="text-[10px] text-muted-foreground">
                    Quick tunnels work without any token. Get a token from{" "}
                    <button
                        className="underline"
                        onClick={() => window.open("https://one.dash.cloudflare.com/", "_blank")}
                    >
                        Cloudflare Zero Trust
                    </button>
                    .
                </p>
            </div>
        </div>
    );
}

export default function TunnelManagerPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    const loadProjects = useCallback(async () => {
        try {
            const [allProjects, runningServers] = await Promise.all([
                invoke<any[]>("list_all_projects"),
                invoke<RunningServer[]>("get_all_running_servers"),
            ]);

            const runningMap = new Map<string, RunningServer>(
                (runningServers ?? []).map((s) => [s.project_path, s])
            );

            const merged: Project[] = (allProjects ?? []).map((p) => {
                const running = runningMap.get(p.path);
                return {
                    id: p.id,
                    name: p.name,
                    path: p.path,
                    port: running?.port ?? p.port ?? 8000,
                    status: running ? "running" : "stopped",
                };
            });

            setProjects(merged);
        } catch {
            setProjects([]);
        }
    }, []);

    useEffect(() => {
        loadProjects();
        const interval = setInterval(loadProjects, 5000);
        return () => clearInterval(interval);
    }, [loadProjects]);

    const {
        session,
        config,
        logs,
        installProgress,
        error,
        activeTunnels,
        isInstalled,
        isConnecting,
        isInstalling,
        checkSetup,
        installBinary,
        startTunnel,
        stopTunnel,
        saveToken,
        removeToken,
        clearLogs,
        copyPublicUrl,
        reset,
        loadLogs,
    } = useTunnel({ autoCheck: true });

    const isActive = session?.status === "active" || session?.status === "connecting";

    const handleRefreshLogs = async () => {
        if (!session?.id) return;
        setIsLoadingLogs(true);
        try {
            await loadLogs(session.id);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const prevSessionIdRef = useRef<number | undefined>(undefined);
    useEffect(() => {
        if (session?.id !== undefined && session.id !== prevSessionIdRef.current) {
            prevSessionIdRef.current = session.id;
            handleRefreshLogs();
        }
    }, [session?.id]);

    return (
        <div className="min-h-screen p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Share2 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Tunnel Manager</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Expose local projects via Cloudflare
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isInstalled && (
                        <Badge
                            variant="outline"
                            className="text-emerald-500 border-emerald-500/30 text-[10px] gap-1"
                        >
                            <CheckCircle2 className="w-3 h-3" /> cloudflared ready
                        </Badge>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={checkSetup}
                        title="Refresh"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 text-xs text-red-400">{error}</div>
                    <button onClick={reset} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {!isInstalled && (
                <InstallPanel
                    onInstall={installBinary}
                    progress={installProgress}
                    isInstalling={isInstalling}
                />
            )}

            {isInstalled && (
                <>
                    {isActive && session ? (
                        <ActiveBanner
                            session={session}
                            onStop={() => stopTunnel(session.id)}
                            onCopy={copyPublicUrl}
                        />
                    ) : (
                        <StartForm
                            projects={projects}
                            onStart={(url, name, path) =>
                                startTunnel({ localUrl: url, projectName: name, projectPath: path })
                            }
                            isConnecting={isConnecting}
                            onRefresh={loadProjects}
                        />
                    )}

                    {activeTunnels.filter((t) => t.id !== session?.id).length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                                Other active tunnels
                            </p>
                            {activeTunnels
                                .filter((t) => t.id !== session?.id)
                                .map((t) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/20 text-xs"
                                    >
                                        <StatusPill status={t.status} />
                                        <span className="font-medium">{t.project_name}</span>
                                        <span className="text-muted-foreground font-mono flex-1 truncate">
                                            {t.public_url ?? t.local_url}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 text-red-400"
                                            onClick={() => stopTunnel(t.id)}
                                        >
                                            <Square className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                        </div>
                    )}

                    <Tabs defaultValue="logs">
                        <TabsList className="flex h-auto gap-0.5 bg-muted/40 p-1 rounded-xl mb-4 w-full sm:w-auto">
                            {[
                                {
                                    id: "logs",
                                    label: "Logs",
                                    icon: <Terminal className="w-3.5 h-3.5" />,
                                },
                                {
                                    id: "history",
                                    label: "History",
                                    icon: <Activity className="w-3.5 h-3.5" />,
                                },
                                {
                                    id: "settings",
                                    label: "Settings",
                                    icon: <Settings className="w-3.5 h-3.5" />,
                                },
                            ].map((t) => (
                                <TabsTrigger
                                    key={t.id}
                                    value={t.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                >
                                    {t.icon}
                                    {t.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <TabsContent value="logs" className="mt-0">
                            <LogsPanel
                                logs={logs}
                                onClear={clearLogs}
                                onRefresh={handleRefreshLogs}
                                isLoading={isLoadingLogs}
                                sessionId={session?.id}
                            />
                        </TabsContent>
                        <TabsContent value="history" className="mt-0">
                            <HistoryPanel />
                        </TabsContent>
                        <TabsContent value="settings" className="mt-0">
                            <SettingsPanel
                                config={config}
                                onSaveToken={saveToken}
                                onDeleteToken={removeToken}
                            />
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}
