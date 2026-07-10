import { cn } from "@/core/lib/utils";
import {
    Activity,
    Box,
    CheckCircle2,
    Container,
    Database,
    HardDrive,
    Layers,
    Loader2,
    Monitor,
    MoreVertical,
    Play,
    RefreshCw,
    RotateCcw,
    Square,
    Terminal,
    Trash2,
    TrendingUp,
    Wifi,
    WifiOff,
    Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDocker } from "./hooks/useDocker";
import { ContainerInfo } from "./services/types";
import * as dockerService from "./services/docker.service";

interface ContainerCardProps {
    container: ContainerInfo;
    onStart: (name: string) => Promise<void>;
    onStop: (name: string) => Promise<void>;
    onRestart: (name: string) => Promise<void>;
    onRemove: (name: string, removeVolume: boolean) => Promise<void>;
    onLogs: (name: string) => void;
    onShell: (container: ContainerInfo) => void;
}

function ContainerStateTag({ state }: { state: string }) {
    const cfg: Record<string, { cls: string; dot: string; label: string }> = {
        running:  { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", dot: "bg-emerald-500 animate-pulse", label: "running" },
        exited:   { cls: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",          dot: "bg-zinc-400",                  label: "stopped" },
        paused:   { cls: "bg-amber-500/10 text-amber-600 border-amber-500/20",       dot: "bg-amber-500",                 label: "paused" },
        created:  { cls: "bg-blue-500/10 text-blue-600 border-blue-500/20",          dot: "bg-blue-500",                  label: "created" },
    };
    const { cls, dot, label } = cfg[state] ?? cfg.exited;
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label}
        </span>
    );
}

function ContainerRow({ container, onStart, onStop, onRestart, onRemove, onLogs, onShell }: ContainerCardProps) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState<string | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [stats, setStats] = useState<{ cpu: string; mem: string } | null>(null);

    const isRunning = container.state === "running";
    const port = container.ports[0]?.host_port;

    const act = async (label: string, fn: () => Promise<unknown>) => {
        setBusy(label);
        try { await fn(); } finally { setBusy(null); setShowMenu(false); }
    };

    useEffect(() => {
        if (!isRunning) return;
        const load = async () => {
            try {
                const s = await dockerService.getContainerStats(container.name);
                setStats({ cpu: s.cpu, mem: s.memory });
            } catch { /* ignore */ }
        };
        load();
        const id = setInterval(load, 8000);
        return () => clearInterval(id);
    }, [container.name, isRunning]);

    const imgName = container.image.split(":")[0].split("/").pop() ?? container.image;

    const handleNavigate = () => {
        navigate(`/docker/${container.name}`);
    };

    return (
        <div className={cn(
            "group flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer",
            confirmRemove && "bg-red-500/5"
        )}>
            <div 
                className="w-8 h-8 rounded-lg bg-muted/60 border flex items-center justify-center text-base shrink-0 font-mono text-muted-foreground select-none hover:bg-muted/80 transition-colors"
                onClick={handleNavigate}
            >
                {imgName.slice(0, 2).toUpperCase()}
            </div>

            <div 
                className="flex-1 min-w-0"
                onClick={handleNavigate}
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{container.name}</span>
                    <ContainerStateTag state={container.state} />
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-muted-foreground font-mono truncate">{container.image}</span>
                    {port && (
                        <span className="text-[11px] text-muted-foreground shrink-0">:{port}</span>
                    )}
                </div>
            </div>

            {stats && isRunning && (
                <div className="hidden md:flex items-center gap-4 text-[11px] text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {stats.cpu}
                    </span>
                    <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {stats.mem.split(" / ")[0]}
                    </span>
                </div>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                {isRunning ? (
                    <button
                        onClick={() => act("stop", () => onStop(container.name))}
                        disabled={!!busy}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Stop"
                    >
                        {busy === "stop" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                    </button>
                ) : (
                    <button
                        onClick={() => act("start", () => onStart(container.name))}
                        disabled={!!busy}
                        className="p-1.5 rounded-md hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors disabled:opacity-40"
                        title="Start"
                    >
                        {busy === "start" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                )}
                <button
                    onClick={() => act("restart", () => onRestart(container.name))}
                    disabled={!!busy}
                    className="p-1.5 rounded-md hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 transition-colors disabled:opacity-40"
                    title="Restart"
                >
                    {busy === "restart" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                </button>
                <button
                    onClick={() => onLogs(container.name)}
                    className="p-1.5 rounded-md hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors"
                    title="Logs"
                >
                    <Terminal className="w-3.5 h-3.5" />
                </button>
                {isRunning && (
                    <button
                        onClick={() => onShell(container)}
                        className="p-1.5 rounded-md hover:bg-purple-500/10 text-muted-foreground hover:text-purple-500 transition-colors"
                        title="Shell"
                    >
                        <Monitor className="w-3.5 h-3.5" />
                    </button>
                )}

                <div className="relative">
                    <button
                        onClick={() => { setShowMenu(m => !m); setConfirmRemove(false); }}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                    >
                        <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 z-50 bg-background border rounded-xl shadow-lg w-44 py-1 text-sm">
                            {!confirmRemove ? (
                                <button
                                    onClick={() => setConfirmRemove(true)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-red-500 hover:bg-red-500/10 text-xs"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Remove container
                                </button>
                            ) : (
                                <div className="px-3 py-2 space-y-1.5">
                                    <p className="text-[11px] text-muted-foreground">Remove container?</p>
                                    <button
                                        onClick={() => { setShowMenu(false); setConfirmRemove(false); act("remove", () => onRemove(container.name, false)); }}
                                        className="w-full text-[11px] py-1.5 rounded-lg bg-red-500/15 text-red-600 hover:bg-red-500/25 transition-colors"
                                    >
                                        Keep volume data
                                    </button>
                                    <button
                                        onClick={() => { setShowMenu(false); setConfirmRemove(false); act("remove", () => onRemove(container.name, true)); }}
                                        className="w-full text-[11px] py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                                    >
                                        Delete everything
                                    </button>
                                    <button
                                        onClick={() => { setShowMenu(false); setConfirmRemove(false); }}
                                        className="w-full text-[11px] py-1 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface LogsModalProps {
    containerName: string;
    onClose: () => void;
}

function LogsModal({ containerName, onClose }: LogsModalProps) {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    const fetch = async () => {
        setLoading(true);
        try {
            const lines = await dockerService.getContainerLogs(containerName, 300);
            setLogs(lines);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetch(); }, [containerName]);
    useEffect(() => { bottomRef?.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

    const getColor = (line: string) => {
        const l = line.toLowerCase();
        if (l.includes("error") || l.includes("fatal") || l.includes("err ")) return "text-red-400";
        if (l.includes("warn")) return "text-amber-400";
        if (l.includes("ready") || l.includes("started") || l.includes("success") || l.includes("✓")) return "text-emerald-400";
        if (l.includes("info")) return "text-blue-400";
        return "text-zinc-400";
    };

    const filtered = filter ? logs.filter(l => l.toLowerCase().includes(filter.toLowerCase())) : logs;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-zinc-950 border border-zinc-800 rounded-t-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col"
                style={{ height: "70vh" }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-red-500/80" onClick={onClose} style={{ cursor: "pointer" }} />
                            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                        </div>
                        <Terminal className="w-3.5 h-3.5 text-zinc-500 ml-2" />
                        <span className="font-mono text-sm text-zinc-300">{containerName}</span>
                        <span className="text-xs text-zinc-600">— logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Filter logs..."
                            className="h-6 text-xs bg-zinc-800 border border-zinc-700 rounded-md px-2 text-zinc-300 placeholder:text-zinc-600 w-36 focus:outline-none focus:border-zinc-500"
                        />
                        <button
                            onClick={fetch}
                            className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-0.5">
                    {loading ? (
                        <div className="flex items-center justify-center h-32 text-zinc-600">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Loading...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center text-zinc-600 py-16">
                            {filter ? "No matching log lines" : "No logs available"}
                        </div>
                    ) : (
                        filtered.map((line, i) => (
                            <div key={i} className={`flex gap-3 hover:bg-zinc-900/60 px-1 rounded ${getColor(line)}`}>
                                <span className="text-zinc-700 select-none shrink-0 w-8 text-right">{i + 1}</span>
                                <span className="break-all">{line}</span>
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}

interface ShellModalProps {
    container: ContainerInfo;
    onClose: () => void;
}

function ShellModal({ container, onClose }: ShellModalProps) {
    const [history, setHistory] = useState<Array<{ cmd: string; out: string; err: boolean }>>([]);
    const [input, setInput] = useState("");
    const [running, setRunning] = useState(false);
    const [cmdHistory, setCmdHistory] = useState<string[]>([]);
    const [historyIdx, setHistoryIdx] = useState(-1);

    const inputEl = useRef<HTMLInputElement>(null);
    const endEl = useRef<HTMLDivElement>(null);

    useEffect(() => { endEl?.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);
    useEffect(() => { inputEl?.current?.focus(); }, []);

    const run = async () => {
        if (!input.trim() || running) return;
        const cmd = input.trim();
        setInput("");
        setRunning(true);
        setCmdHistory(h => [cmd, ...h.slice(0, 49)]);
        setHistoryIdx(-1);
        try {
            const out = await dockerService.execInContainer(container.name, cmd);
            setHistory(h => [...h, { cmd, out, err: false }]);
        } catch (e: unknown) {
            setHistory(h => [...h, { cmd, out: String(e), err: true }]);
        } finally {
            setRunning(false);
            setTimeout(() => inputEl?.current?.focus(), 50);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") { run(); return; }
        if (e.key === "ArrowUp") {
            const idx = Math.min(historyIdx + 1, cmdHistory.length - 1);
            setHistoryIdx(idx);
            setInput(cmdHistory[idx] ?? "");
            e.preventDefault();
        }
        if (e.key === "ArrowDown") {
            const idx = Math.max(historyIdx - 1, -1);
            setHistoryIdx(idx);
            setInput(idx === -1 ? "" : (cmdHistory[idx] ?? ""));
            e.preventDefault();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-zinc-950 border border-zinc-800 rounded-t-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col"
                style={{ height: "70vh" }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-red-500/80 cursor-pointer" onClick={onClose} />
                            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                        </div>
                        <Monitor className="w-3.5 h-3.5 text-zinc-500 ml-2" />
                        <span className="font-mono text-sm text-zinc-300">{container.name}</span>
                        <span className="text-xs text-zinc-600">— shell</span>
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500 ml-1">
                            exec
                        </Badge>
                    </div>
                    <span className="text-[11px] text-zinc-600 font-mono">{container.image}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed">
                    <div className="text-zinc-600 mb-3 text-[11px]">
                        Connected to <span className="text-emerald-500">{container.name}</span> — type commands below
                    </div>
                    {history.map((h, i) => (
                        <div key={i} className="mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-emerald-500">❯</span>
                                <span className="text-zinc-200">{h.cmd}</span>
                            </div>
                            {h.out && (
                                <pre className={`pl-5 mt-1 whitespace-pre-wrap break-all text-[11px] ${h.err ? "text-red-400" : "text-zinc-400"}`}>
                                    {h.out}
                                </pre>
                            )}
                        </div>
                    ))}
                    <div ref={endEl} />
                </div>

                <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-900/50 flex items-center gap-2">
                    <span className="text-emerald-500 font-mono text-sm shrink-0">❯</span>
                    <input
                        ref={inputEl}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Type a command..."
                        className="flex-1 bg-transparent font-mono text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none"
                        disabled={running}
                    />
                    {running && <Loader2 className="w-3.5 h-3.5 text-zinc-600 animate-spin" />}
                </div>
            </div>
        </div>
    );
}

// Fix the hooks issue by properly referencing React
import React, { useRef } from "react";

export default function DockerManagerPage() {
    const navigate = useNavigate();
    const {
        dockerInfo,
        allContainers,
        containers,
        refreshing,
        runningCount,
        stoppedCount,
        dbRunning,
        refresh,
        startContainer,
        stopContainer,
        restartContainer,
        removeContainer,
    } = useDocker();

    const [logsName, setLogsName] = useState<string | null>(null);
    const [shellContainer, setShellContainer] = useState<ContainerInfo | null>(null);
    const [filter, setFilter] = useState<"all" | "running" | "stopped">("all");

    if (!dockerInfo) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!dockerInfo.installed || !dockerInfo.daemon_running) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 border flex items-center justify-center mb-4">
                    <WifiOff className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Docker not available</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    {!dockerInfo.installed
                        ? "Docker is not installed on this machine."
                        : "Docker daemon is not running. Start Docker Desktop or the Docker service."}
                </p>
                <Button size="sm" onClick={refresh} className="gap-2">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                </Button>
            </div>
        );
    }

    const displayContainers = allContainers.filter(c => {
        if (filter === "running") return c.state === "running";
        if (filter === "stopped") return c.state !== "running";
        return true;
    });

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-5 py-4 border-b flex items-center justify-between gap-4 bg-background">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Box className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold leading-tight">Docker Manager</h1>
                        <p className="text-[11px] text-muted-foreground">
                            {runningCount} running · {stoppedCount} stopped · v{dockerInfo.version}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        size="sm" 
                        className="gap-1.5 text-xs h-8 bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={() => navigate("/projects/new")}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Create Container
                    </Button>
                    <div className="flex items-center gap-1 p-0.5 bg-muted/50 rounded-lg border">
                        {(["all", "running", "stopped"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-3 py-1 text-xs rounded-md transition-colors capitalize",
                                    filter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={refresh} disabled={refreshing}>
                        <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats bar */}
            <div className="shrink-0 grid grid-cols-4 gap-0 border-b">
                {[
                    { icon: <Wifi className="w-3.5 h-3.5 text-emerald-500" />, label: "Daemon", value: "Active", color: "text-emerald-600" },
                    { icon: <Container className="w-3.5 h-3.5 text-blue-500" />, label: "Total", value: `${allContainers.length} containers`, color: "text-foreground" },
                    { icon: <Activity className="w-3.5 h-3.5 text-emerald-500" />, label: "Running", value: `${runningCount} active`, color: "text-emerald-600" },
                    { icon: <Database className="w-3.5 h-3.5 text-amber-500" />, label: "Databases", value: `${dbRunning}/${containers.length}`, color: "text-foreground" },
                ].map((s, i) => (
                    <div key={i} className={cn("px-4 py-3", i < 3 && "border-r")}>
                        <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className="text-[11px] text-muted-foreground">{s.label}</span></div>
                        <span className={`text-xs font-medium ${s.color}`}>{s.value}</span>
                    </div>
                ))}
            </div>

            {/* Container list */}
            <div className="flex-1 overflow-y-auto">
                {displayContainers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Container className="w-10 h-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">No containers found</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                            {filter !== "all" ? `No ${filter} containers` : "Pull an image or use Docker Apps to deploy"}
                        </p>
                    </div>
                ) : (
                    displayContainers.map(c => (
                        <ContainerRow
                            key={c.id}
                            container={c}
                            onStart={startContainer}
                            onStop={stopContainer}
                            onRestart={restartContainer}
                            onRemove={removeContainer}
                            onLogs={setLogsName}
                            onShell={setShellContainer}
                        />
                    ))
                )}
            </div>

            {/* Compose availability footer */}
            {dockerInfo.compose_available && (
                <div className="shrink-0 px-4 py-2 border-t flex items-center justify-between text-[11px] text-muted-foreground bg-muted/20">
                    <div className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3" />
                        Docker Compose {dockerInfo.compose_version}
                    </div>
                    <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        available
                    </div>
                </div>
            )}

            {logsName && <LogsModal containerName={logsName} onClose={() => setLogsName(null)} />}
            {shellContainer && <ShellModal container={shellContainer} onClose={() => setShellContainer(null)} />}
        </div>
    );
}