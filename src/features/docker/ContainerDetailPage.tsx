import { cn } from "@/core/lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    Check,
    ChevronDown,
    Clock,
    Copy,
    Cpu,
    Database,
    Download,
    Edit2,
    ExternalLink,
    FileText,
    Globe,
    HardDrive,
    Info,
    Loader2,
    Monitor,
    MoreHorizontal,
    Network,
    Package,
    Play,
    RefreshCw,
    RotateCcw,
    Save,
    Server,
    Settings,
    Shield,
    Square,
    Tag,
    Terminal,
    Trash2,
    X,
    Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as dockerService from "./services/docker.service";
import { ContainerDetails, ContainerInfo, ContainerStats } from "./services/types";

type TabKey = "overview" | "logs" | "shell" | "inspect" | "network" | "volumes" | "env" | "processes";

function formatBytes(mb: number): string {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
}

function formatDate(dateStr: string): string {
    if (!dateStr || dateStr === "0001-01-01T00:00:00Z") return "—";
    try {
        return new Intl.DateTimeFormat("en", {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        }).format(new Date(dateStr));
    } catch {
        return dateStr;
    }
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => {
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            }}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        </button>
    );
}

function StatCard({ icon, label, value, sub, color }: {
    icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
    return (
        <div className={cn("rounded-2xl border p-4 flex flex-col gap-2", color)}>
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
                <div className="opacity-60">{icon}</div>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
            {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        </div>
    );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
    return (
        <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
        </div>
    );
}

function InfoRow({ label, value, mono, copy }: {
    label: string; value: string; mono?: boolean; copy?: boolean;
}) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0 gap-4">
            <span className="text-[12px] text-muted-foreground shrink-0 w-36">{label}</span>
            <div className="flex items-center gap-1.5 min-w-0 ml-auto">
                <span className={cn("text-[12px] text-right truncate", mono ? "font-mono" : "")}>{value || "—"}</span>
                {copy && value && <CopyButton text={value} />}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label, badge }: {
    active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-lg transition-all whitespace-nowrap",
                active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
        >
            <span className={cn("w-3.5 h-3.5", active ? "opacity-100" : "opacity-60")}>{icon}</span>
            {label}
            {badge && (
                <span className={cn(
                    "text-[10px] px-1.5 py-px rounded-full font-bold",
                    active ? "bg-background/20" : "bg-muted text-muted-foreground"
                )}>{badge}</span>
            )}
        </button>
    );
}

function StateIndicator({ state }: { state: string }) {
    const cfg: Record<string, { cls: string; dot: string }> = {
        running: { cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25", dot: "bg-emerald-500 animate-pulse" },
        exited: { cls: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20", dot: "bg-zinc-400" },
        paused: { cls: "bg-amber-500/10 text-amber-600 border-amber-500/20", dot: "bg-amber-500 animate-pulse" },
        created: { cls: "bg-blue-500/10 text-blue-600 border-blue-500/20", dot: "bg-blue-400" },
    };
    const { cls, dot } = cfg[state] ?? cfg.exited;
    return (
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold", cls)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
            {state}
        </span>
    );
}

function LogsPanel({ containerName }: { containerName: string }) {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [tail, setTail] = useState(300);
    const [autoScroll, setAutoScroll] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const l = await dockerService.getContainerLogs(containerName, tail);
            setLogs(l || []);
        } catch (e) {
            console.error("Error fetching logs:", e);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [containerName, tail]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    useEffect(() => {
        if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs, autoScroll]);

    const colorLine = (line: string) => {
        const l = line.toLowerCase();
        if (l.includes("error") || l.includes("fatal") || l.includes(" err ")) return "text-red-400";
        if (l.includes("warn")) return "text-amber-400";
        if (l.includes("ready") || l.includes("started") || l.includes("success") || l.includes("✓")) return "text-emerald-400";
        if (l.includes("info") || l.includes("debug")) return "text-blue-400";
        return "text-zinc-400";
    };

    const filtered = filter ? logs.filter(l => l.toLowerCase().includes(filter.toLowerCase())) : logs;

    const downloadLogs = async () => {
        const content = filtered.join("\n");
        try {
            const filePath = await save({
                defaultPath: `${containerName}-logs.txt`,
                filters: [{ name: "Text Files", extensions: ["txt"] }],
            });
            if (filePath) {
                await writeTextFile(filePath, content);
            }
        } catch {
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${containerName}-logs.txt`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500/60" />
                        <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                        <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
                    </div>
                    <Terminal className="w-3.5 h-3.5 text-zinc-500 ml-2" />
                    <span className="text-xs font-mono text-zinc-400">{containerName}</span>
                    <span className="text-[10px] text-zinc-600">logs — {filtered.length} lines</span>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={tail}
                        onChange={e => setTail(Number(e.target.value))}
                        className="h-6 text-[11px] bg-zinc-800 border border-zinc-700 rounded px-1.5 text-zinc-300 focus:outline-none"
                    >
                        {[100, 300, 500, 1000].map(n => <option key={n} value={n}>last {n}</option>)}
                    </select>
                    <input
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Filter..."
                        className="h-6 text-[11px] bg-zinc-800 border border-zinc-700 rounded px-2 text-zinc-300 placeholder:text-zinc-600 w-28 focus:outline-none focus:border-zinc-500"
                    />
                    <button
                        onClick={() => setAutoScroll(a => !a)}
                        className={cn("px-2 py-1 rounded text-[10px] border font-medium transition-colors",
                            autoScroll ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-zinc-700 text-zinc-500 hover:border-zinc-500")}
                    >
                        AUTO
                    </button>
                    <button
                        onClick={downloadLogs}
                        title="Download logs"
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={fetchLogs}
                        disabled={loading}
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-px">
                {loading ? (
                    <div className="flex items-center justify-center h-32 text-zinc-600">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />Loading...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-zinc-600 gap-2">
                        <FileText className="w-6 h-6 opacity-30" />
                        <span>{filter ? "No lines match the filter" : "No logs available"}</span>
                    </div>
                ) : (
                    filtered.map((line, i) => (
                        <div key={i} className={cn("flex gap-3 hover:bg-zinc-900/60 px-1 rounded group", colorLine(line))}>
                            <span className="text-zinc-700 select-none w-8 text-right shrink-0">{i + 1}</span>
                            <span className="break-all flex-1">{line}</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <CopyButton text={line} />
                            </span>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

function ShellPanel({ containerName }: { containerName: string }) {
    const [history, setHistory] = useState<Array<{ cmd: string; out: string; err: boolean }>>([]);
    const [input, setInput] = useState("");
    const [running, setRunning] = useState(false);
    const [cmdHistory, setCmdHistory] = useState<string[]>([]);
    const [histIdx, setHistIdx] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);
    useEffect(() => { inputRef.current?.focus(); }, []);

    const run = async () => {
        if (!input.trim() || running) return;
        const cmd = input.trim();
        setInput("");
        setRunning(true);
        setCmdHistory(h => [cmd, ...h.slice(0, 49)]);
        setHistIdx(-1);
        try {
            const out = await dockerService.execInContainer(containerName, cmd);
            setHistory(h => [...h, { cmd, out, err: false }]);
        } catch (e: unknown) {
            setHistory(h => [...h, { cmd, out: String(e), err: true }]);
        } finally {
            setRunning(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") { run(); return; }
        if (e.key === "ArrowUp") {
            const i = Math.min(histIdx + 1, cmdHistory.length - 1);
            setHistIdx(i); setInput(cmdHistory[i] ?? ""); e.preventDefault();
        }
        if (e.key === "ArrowDown") {
            const i = Math.max(histIdx - 1, -1);
            setHistIdx(i); setInput(i === -1 ? "" : (cmdHistory[i] ?? "")); e.preventDefault();
        }
        if (e.key === "l" && e.ctrlKey) { setHistory([]); e.preventDefault(); }
    };

    const quickCmds = ["ls -la", "ps aux", "df -h", "cat /etc/os-release", "env", "whoami", "uname -a"];

    return (
        <div className="flex flex-col h-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500/60" />
                        <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                        <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
                    </div>
                    <Monitor className="w-3.5 h-3.5 text-zinc-500 ml-2" />
                    <span className="text-xs font-mono text-zinc-400">{containerName}</span>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">exec</Badge>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {quickCmds.map(c => (
                        <button
                            key={c}
                            onClick={() => { setInput(c); inputRef.current?.focus(); }}
                            className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors font-mono"
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed">
                <div className="text-zinc-600 mb-4 text-[11px]">
                    Connected to <span className="text-emerald-400">{containerName}</span> — Ctrl+L to clear · ↑↓ history
                </div>
                {history.map((h, i) => (
                    <div key={i} className="mb-3">
                        <div className="flex gap-2 items-start">
                            <span className="text-emerald-500 shrink-0 mt-px">❯</span>
                            <span className="text-zinc-200">{h.cmd}</span>
                        </div>
                        {h.out && (
                            <pre className={cn("pl-5 mt-1 whitespace-pre-wrap break-all text-[11px]", h.err ? "text-red-400" : "text-zinc-400")}>
                                {h.out}
                            </pre>
                        )}
                    </div>
                ))}
                <div ref={endRef} />
            </div>
            <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-900/50 flex items-center gap-2 shrink-0">
                <span className="text-emerald-500 font-mono text-sm shrink-0">❯</span>
                <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Type a command..."
                    className="flex-1 bg-transparent font-mono text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none"
                    disabled={running}
                />
                {running
                    ? <Loader2 className="w-3.5 h-3.5 text-zinc-600 animate-spin" />
                    : <button onClick={run} className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"><Play className="w-3 h-3" /></button>
                }
            </div>
        </div>
    );
}

function EnvPanel({ envVars }: { envVars: string[] }) {
    const [search, setSearch] = useState("");
    const [showValues, setShowValues] = useState(false);

    const sensitiveKeys = ["password", "secret", "key", "token", "pass", "pwd", "auth"];
    const isSensitive = (key: string) => sensitiveKeys.some(s => key.toLowerCase().includes(s));

    const parsed = envVars.map(e => {
        const idx = e.indexOf("=");
        return idx >= 0 ? { key: e.slice(0, idx), value: e.slice(idx + 1) } : { key: e, value: "" };
    });

    const filtered = search
        ? parsed.filter(e => e.key.toLowerCase().includes(search.toLowerCase()) || e.value.toLowerCase().includes(search.toLowerCase()))
        : parsed;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search variables..." className="h-8 text-xs max-w-xs" />
                <button
                    onClick={() => setShowValues(s => !s)}
                    className={cn("text-xs px-3 py-1.5 rounded-lg border transition-colors",
                        showValues ? "border-blue-500/40 bg-blue-500/10 text-blue-600" : "border-border text-muted-foreground hover:border-foreground/30")}
                >
                    {showValues ? "Hide values" : "Show values"}
                </button>
                <span className="text-[11px] text-muted-foreground ml-auto">{filtered.length} variables</span>
            </div>
            <div className="rounded-xl border overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">No environment variables</div>
                ) : (
                    filtered.map((e, i) => {
                        const sensitive = isSensitive(e.key);
                        return (
                            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 last:border-0 hover:bg-muted/20 group">
                                <code className="text-[11px] font-mono text-blue-500 shrink-0 w-64 truncate">{e.key}</code>
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                    {sensitive && !showValues ? (
                                        <span className="text-[11px] text-muted-foreground font-mono">{"•".repeat(Math.min(e.value.length, 12))}</span>
                                    ) : (
                                        <code className="text-[11px] font-mono text-muted-foreground truncate">{e.value || "—"}</code>
                                    )}
                                    {sensitive && <Shield className="w-3 h-3 text-amber-500 shrink-0" />}
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CopyButton text={`${e.key}=${e.value}`} />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function NetworkPanel({ networks, ports }: {
    networks: ContainerDetails["networks"];
    ports: ContainerDetails["ports"];
}) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Port Bindings</h3>
                {ports.length === 0 ? (
                    <div className="rounded-xl border py-8 text-center text-sm text-muted-foreground">No exposed ports</div>
                ) : (
                    <div className="rounded-xl border overflow-hidden">
                        <div className="grid grid-cols-4 px-4 py-2 bg-muted/30 border-b">
                            {["Host Port", "Container Port", "Protocol", ""].map(h => (
                                <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</span>
                            ))}
                        </div>
                        {ports.map((p, i) => (
                            <div key={i} className="grid grid-cols-4 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/10 items-center">
                                <span className="text-sm font-mono font-semibold text-blue-500">{p.host_port}</span>
                                <span className="text-sm font-mono text-muted-foreground">{p.container_port}</span>
                                <span><Badge variant="outline" className="text-[10px]">{p.protocol}</Badge></span>
                                <a href={`http://localhost:${p.host_port}`} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1 text-[11px] text-blue-500 hover:underline">
                                    <ExternalLink className="w-3 h-3" /> Open
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Connected Networks</h3>
                {networks.length === 0 ? (
                    <div className="rounded-xl border py-8 text-center text-sm text-muted-foreground">No network connections</div>
                ) : (
                    <div className="space-y-2">
                        {networks.map((n, i) => (
                            <div key={i} className="rounded-xl border p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Network className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-semibold">{n.name}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <div className="text-[10px] text-muted-foreground mb-0.5">IP Address</div>
                                        <div className="text-xs font-mono">{n.ip_address || "—"}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-muted-foreground mb-0.5">Gateway</div>
                                        <div className="text-xs font-mono">{n.gateway || "—"}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-muted-foreground mb-0.5">MAC Address</div>
                                        <div className="text-xs font-mono">{n.mac_address || "—"}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function VolumesPanel({ mounts }: { mounts: ContainerDetails["mounts"] }) {
    return (
        <div className="space-y-2">
            {mounts.length === 0 ? (
                <div className="rounded-xl border py-12 text-center text-sm text-muted-foreground">No mounts configured</div>
            ) : (
                mounts.map((m, i) => (
                    <div key={i} className="rounded-xl border p-4 hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                            <div className={cn("p-1.5 rounded-lg", m.mount_type === "volume" ? "bg-blue-500/10" : "bg-amber-500/10")}>
                                {m.mount_type === "volume"
                                    ? <Database className="w-3.5 h-3.5 text-blue-500" />
                                    : <HardDrive className="w-3.5 h-3.5 text-amber-500" />}
                            </div>
                            <span className="text-xs font-semibold capitalize">{m.mount_type}</span>
                            <Badge variant="outline" className={cn("text-[9px] ml-1", m.rw ? "border-emerald-500/30 text-emerald-600" : "border-zinc-500/30 text-zinc-500")}>
                                {m.rw ? "read/write" : "read-only"}
                            </Badge>
                            {m.mode && <Badge variant="outline" className="text-[9px]">{m.mode}</Badge>}
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground w-20 shrink-0">Source</span>
                                <code className="text-[11px] font-mono bg-muted/40 px-2 py-0.5 rounded flex-1 truncate">{m.source}</code>
                                <CopyButton text={m.source} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground w-20 shrink-0">Destination</span>
                                <code className="text-[11px] font-mono bg-muted/40 px-2 py-0.5 rounded flex-1 truncate">{m.destination}</code>
                                <CopyButton text={m.destination} />
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

function ProcessesPanel({ containerName, isRunning }: { containerName: string; isRunning: boolean }) {
    const [procs, setProcs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchProcs = useCallback(async () => {
        if (!isRunning) return;
        setLoading(true);
        try {
            const result = await invoke<any[]>("get_container_processes", { containerName });
            setProcs(result || []);
        } catch (e) {
            console.error("Error fetching processes:", e);
            setProcs([]);
        } finally {
            setLoading(false);
        }
    }, [containerName, isRunning]);

    useEffect(() => { fetchProcs(); }, [fetchProcs]);

    if (!isRunning) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Square className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Container is not running</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Start the container to view processes</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{procs.length} processes</span>
                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={fetchProcs} disabled={loading}>
                    <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />Refresh
                </Button>
            </div>
            <div className="rounded-xl border overflow-hidden">
                <div className="grid grid-cols-6 px-4 py-2 bg-muted/30 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>PID</span><span>USER</span><span>CPU%</span><span>MEM%</span><span>STAT</span><span>CMD</span>
                </div>
                {loading ? (
                    <div className="py-10 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />Loading...
                    </div>
                ) : procs.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm">No processes found</div>
                ) : (
                    procs.map((p, i) => (
                        <div key={i} className="grid grid-cols-6 px-4 py-2.5 border-b border-border/40 last:border-0 hover:bg-muted/10 text-[11px] font-mono">
                            <span className="text-blue-500">{p.pid}</span>
                            <span className="text-muted-foreground">{p.user}</span>
                            <span className={parseFloat(p.cpu) > 50 ? "text-amber-500" : ""}>{p.cpu}%</span>
                            <span>{p.mem}%</span>
                            <span className="text-emerald-500">{p.stat}</span>
                            <span className="text-muted-foreground truncate">{p.cmd}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function InspectPanel({ details }: { details: ContainerDetails }) {
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const toggle = (k: string) => setCollapsed(c => ({ ...c, [k]: !c[k] }));

    const sections = [
        {
            key: "identity", label: "Identity", icon: <Tag className="w-3.5 h-3.5" />, rows: [
                { label: "Full ID", value: details.id, mono: true, copy: true },
                { label: "Name", value: details.name, mono: true, copy: true },
                { label: "Hostname", value: details.hostname, mono: true, copy: true },
                { label: "Platform", value: details.platform },
                { label: "Image", value: details.image, mono: true, copy: true },
                { label: "Image ID", value: details.image_id, mono: true },
            ],
        },
        {
            key: "timing", label: "Lifecycle", icon: <Clock className="w-3.5 h-3.5" />, rows: [
                { label: "Created", value: formatDate(details.created) },
                { label: "Started At", value: formatDate(details.started_at) },
                { label: "Finished At", value: formatDate(details.finished_at) },
                { label: "Restart Count", value: String(details.restart_count) },
                { label: "Restart Policy", value: details.restart_policy },
                { label: "PID", value: String(details.pid) },
            ],
        },
        {
            key: "resources", label: "Resources", icon: <Cpu className="w-3.5 h-3.5" />, rows: [
                { label: "Memory Limit", value: details.memory_limit > 0 ? formatBytes(details.memory_limit / 1024 / 1024) : "Unlimited" },
                { label: "CPU Shares", value: details.cpu_shares > 0 ? String(details.cpu_shares) : "Default" },
                { label: "IP Address", value: details.ip_address || "—", mono: true, copy: true },
                { label: "Working Dir", value: details.working_dir || "—", mono: true },
                { label: "User", value: details.user || "root", mono: true },
                { label: "Privileged", value: details.privileged ? "Yes" : "No" },
            ],
        },
        {
            key: "runtime", label: "Runtime", icon: <Zap className="w-3.5 h-3.5" />, rows: [
                { label: "Entrypoint", value: details.entrypoint.join(" ") || "—", mono: true },
                { label: "Command", value: details.cmd.join(" ") || "—", mono: true },
            ],
        },
    ];

    return (
        <div className="space-y-3">
            {sections.map(s => (
                <div key={s.key} className="rounded-xl border overflow-hidden">
                    <button
                        onClick={() => toggle(s.key)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <span className="text-muted-foreground">{s.icon}</span>
                            {s.label}
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", collapsed[s.key] && "-rotate-90")} />
                    </button>
                    {!collapsed[s.key] && (
                        <div className="px-4">
                            {s.rows.map(r => <InfoRow key={r.label} {...r} />)}
                        </div>
                    )}
                </div>
            ))}

            {details.labels.length > 0 && (
                <div className="rounded-xl border overflow-hidden">
                    <button onClick={() => toggle("labels")} className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                            Labels <span className="text-muted-foreground text-xs font-normal">({details.labels.length})</span>
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", collapsed.labels && "-rotate-90")} />
                    </button>
                    {!collapsed.labels && (
                        <div className="px-4">
                            {details.labels.map((l, i) => (
                                <InfoRow key={i} label={l.key} value={l.value} mono copy />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function OverviewPanel({ details, stats, onRefreshStats }: {
    details: ContainerDetails; stats: ContainerStats | null; onRefreshStats: () => void;
}) {
    const isRunning = details.state === "running";
    const cpuPct = stats?.cpu_raw ?? 0;
    const memUsed = stats?.mem_used_mb ?? 0;
    const memLimit = stats?.mem_limit_mb ?? 0;
    const memPct = memLimit > 0 ? (memUsed / memLimit) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={<Activity className="w-4 h-4" />} label="CPU Usage"
                    value={stats ? `${cpuPct.toFixed(1)}%` : "—"}
                    sub={isRunning ? "live" : "container stopped"} color="border-blue-500/20 bg-blue-500/5" />
                <StatCard icon={<HardDrive className="w-4 h-4" />} label="Memory"
                    value={stats ? formatBytes(memUsed) : "—"}
                    sub={memLimit > 0 ? `of ${formatBytes(memLimit)}` : "no limit"} color="border-purple-500/20 bg-purple-500/5" />
                <StatCard icon={<Globe className="w-4 h-4" />} label="Network I/O"
                    value={stats?.net?.split(" / ")[0] ?? "—"}
                    sub={stats?.net ? `↓ ${stats.net.split(" / ")[1] ?? ""}` : undefined} color="border-emerald-500/20 bg-emerald-500/5" />
                <StatCard icon={<Package className="w-4 h-4" />} label="Block I/O"
                    value={stats?.block?.split(" / ")[0] ?? "—"}
                    sub={stats?.block ? `write: ${stats.block.split(" / ")[1] ?? ""}` : undefined} color="border-amber-500/20 bg-amber-500/5" />
            </div>

            {stats && isRunning && (
                <div className="rounded-xl border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Resource Usage</h3>
                        <button onClick={onRefreshStats} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-[11px] mb-1.5">
                                <span className="text-muted-foreground">CPU</span>
                                <span className="font-mono font-semibold">{stats.cpu}</span>
                            </div>
                            <MiniBar value={cpuPct} max={100} color={cpuPct > 80 ? "bg-red-500" : cpuPct > 50 ? "bg-amber-500" : "bg-blue-500"} />
                        </div>
                        <div>
                            <div className="flex justify-between text-[11px] mb-1.5">
                                <span className="text-muted-foreground">Memory</span>
                                <span className="font-mono font-semibold">{stats.memory}</span>
                            </div>
                            <MiniBar value={memPct} max={100} color={memPct > 80 ? "bg-red-500" : memPct > 60 ? "bg-amber-500" : "bg-purple-500"} />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border p-4 space-y-1">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Container Info</h3>
                    <InfoRow label="ID" value={details.id} mono copy />
                    <InfoRow label="Image" value={details.image} mono copy />
                    <InfoRow label="Status" value={details.status} />
                    <InfoRow label="Created" value={formatDate(details.created)} />
                    <InfoRow label="Restarts" value={String(details.restart_count)} />
                    <InfoRow label="Policy" value={details.restart_policy || "—"} />
                </div>
                <div className="rounded-xl border p-4 space-y-1">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Runtime</h3>
                    <InfoRow label="IP Address" value={details.ip_address || "—"} mono copy />
                    <InfoRow label="Hostname" value={details.hostname} mono />
                    <InfoRow label="Platform" value={details.platform} />
                    <InfoRow label="Working Dir" value={details.working_dir || "/"} mono />
                    <InfoRow label="User" value={details.user || "root"} mono />
                    <InfoRow label="Privileged" value={details.privileged ? "Yes" : "No"} />
                </div>
            </div>

            {details.ports.length > 0 && (
                <div className="rounded-xl border p-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Port Bindings</h3>
                    <div className="flex flex-wrap gap-2">
                        {details.ports.map((p, i) => (
                            <a key={i} href={`http://localhost:${p.host_port}`} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group">
                                <Server className="w-3 h-3 text-muted-foreground group-hover:text-blue-500" />
                                <span className="text-xs font-mono font-semibold text-blue-500">{p.host_port}</span>
                                <span className="text-[10px] text-muted-foreground">→ {p.container_port}/{p.protocol}</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function RenameModal({ currentName, onConfirm, onClose }: {
    currentName: string; onConfirm: (newName: string) => Promise<void>; onClose: () => void;
}) {
    const [name, setName] = useState(currentName);
    const [saving, setSaving] = useState(false);

    const confirm = async () => {
        if (!name.trim() || name === currentName) return;
        setSaving(true);
        try { await onConfirm(name.trim()); onClose(); } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
                <div>
                    <h2 className="text-sm font-semibold">Rename Container</h2>
                    <p className="text-xs text-muted-foreground mt-1">Container must be stopped to rename.</p>
                </div>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm font-mono"
                    onKeyDown={e => e.key === "Enter" && confirm()} autoFocus />
                <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={onClose} className="text-xs">Cancel</Button>
                    <Button size="sm" onClick={confirm} disabled={saving || !name.trim() || name === currentName} className="text-xs gap-1.5">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Rename
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function ContainerDetailPage() {
    const { containerName } = useParams<{ containerName: string }>();
    const navigate = useNavigate();

    const [container, setContainer] = useState<ContainerInfo | null>(null);
    const [details, setDetails] = useState<ContainerDetails | null>(null);
    const [stats, setStats] = useState<ContainerStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabKey>("overview");
    const [busy, setBusy] = useState<string | null>(null);
    const [showRename, setShowRename] = useState(false);
    const [showRemove, setShowRemove] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const name = containerName ?? "";

    // تابع دریافت اطلاعات کانتینر
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            
            // دریافت لیست کانتینرها
            const list = await dockerService.listContainers(true);
            const found = list.find(c => c.name === name);
            setContainer(found ?? null);

            // دریافت جزئیات کانتینر
            try {
                const d = await invoke<ContainerDetails>("inspect_container", { containerName: name });
                if (d) {
                    setDetails(d);
                }
            } catch (e) {
                console.error("Error fetching details:", e);
                // اگر خطا خورد، اطلاعات اولیه را از container بگیریم
                if (found) {
                    setDetails({
                        id: found.id,
                        name: found.name,
                        image: found.image,
                        image_id: found.id,
                        status: found.status,
                        state: found.state,
                        created: found.created,
                        started_at: "",
                        finished_at: "",
                        restart_count: 0,
                        restart_policy: "",
                        platform: "",
                        ports: found.ports || [],
                        env_vars: [],
                        labels: [],
                        mounts: [],
                        networks: [],
                        cpu_shares: 0,
                        memory_limit: 0,
                        hostname: "",
                        ip_address: "",
                        cmd: [],
                        entrypoint: [],
                        working_dir: "",
                        user: "",
                        privileged: false,
                        pid: 0,
                    });
                }
            }

        } catch (e) {
            console.error("Error loading data:", e);
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }, [name]);

    // تابع دریافت stats
    const fetchStats = useCallback(async () => {
        if (!container || container.state !== "running") return;
        try {
            const s = await dockerService.getContainerStats(name);
            setStats(s);
        } catch (e) {
            console.error("Error fetching stats:", e);
        }
    }, [name, container]);

    // بارگذاری اولیه
    useEffect(() => {
        loadData();
    }, [loadData]);

    // شروع/توقف دریافت stats
    useEffect(() => {
        if (container?.state === "running") {
            fetchStats();
            statsIntervalRef.current = setInterval(fetchStats, 5000);
        } else {
            setStats(null);
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
                statsIntervalRef.current = null;
            }
        }
        return () => {
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
                statsIntervalRef.current = null;
            }
        };
    }, [container, fetchStats]);

    // تابع اجرای عملیات
    const act = async (label: string, fn: () => Promise<unknown>) => {
        setBusy(label);
        setError(null);
        try {
            await fn();
            await loadData();
        } catch (e: unknown) {
            setError(String(e));
        } finally {
            setBusy(null);
        }
    };

    const handleRename = async (newName: string) => {
        await act("rename", async () => {
            await invoke("rename_container", { oldName: name, newName });
            navigate(`/docker/${newName}`, { replace: true });
        });
    };

    const handleRemove = async (removeVolume: boolean) => {
        await act("remove", async () => {
            await dockerService.removeContainer(name, removeVolume);
            navigate(-1);
        });
    };

    const isRunning = container?.state === "running";

    const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
        { key: "overview", label: "Overview", icon: <Activity className="w-3.5 h-3.5" /> },
        { key: "logs", label: "Logs", icon: <FileText className="w-3.5 h-3.5" /> },
        { key: "shell", label: "Shell", icon: <Terminal className="w-3.5 h-3.5" />, badge: isRunning ? "live" : undefined },
        { key: "env", label: "Environment", icon: <Settings className="w-3.5 h-3.5" />, badge: details ? String(details.env_vars.length) : undefined },
        { key: "network", label: "Network", icon: <Network className="w-3.5 h-3.5" /> },
        { key: "volumes", label: "Volumes", icon: <HardDrive className="w-3.5 h-3.5" />, badge: details ? String(details.mounts.length) : undefined },
        { key: "processes", label: "Processes", icon: <Cpu className="w-3.5 h-3.5" /> },
        { key: "inspect", label: "Inspect", icon: <Info className="w-3.5 h-3.5" /> },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!container && !details) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <AlertCircle className="w-10 h-10 text-muted-foreground/30 mb-4" />
                <h2 className="text-lg font-semibold mb-2">Container not found</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    No container named <code className="font-mono bg-muted px-1 rounded">{name}</code> was found.
                </p>
                <Button size="sm" variant="outline" onClick={() => navigate(-1)} className="gap-1.5 text-xs">
                    <ArrowLeft className="w-3.5 h-3.5" />Go back
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="shrink-0 px-6 py-4 border-b bg-background">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-muted/60 border flex items-center justify-center font-mono text-sm font-bold text-muted-foreground shrink-0">
                            {name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-lg font-bold tracking-tight truncate">{name}</h1>
                                {container && <StateIndicator state={container.state} />}
                                {details?.privileged && (
                                    <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-500">
                                        <Shield className="w-2.5 h-2.5 mr-1" />privileged
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-muted-foreground font-mono truncate">{container?.image ?? details?.image}</span>
                                {container?.id && <span className="text-[10px] text-muted-foreground/60 font-mono">{container.id.slice(0, 12)}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {isRunning ? (
                            <Button size="sm" variant="outline"
                                onClick={() => act("stop", () => dockerService.stopContainer(name))}
                                disabled={!!busy} className="h-8 gap-1.5 text-xs hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30">
                                {busy === "stop" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                                Stop
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline"
                                onClick={() => act("start", () => dockerService.startContainer(name))}
                                disabled={!!busy} className="h-8 gap-1.5 text-xs hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30">
                                {busy === "start" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                Start
                            </Button>
                        )}
                        <Button size="sm" variant="outline"
                            onClick={() => act("restart", () => dockerService.restartContainer(name))}
                            disabled={!!busy} className="h-8 gap-1.5 text-xs hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30">
                            {busy === "restart" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                            Restart
                        </Button>
                        <Button size="sm" variant="outline"
                            onClick={loadData}
                            disabled={!!busy} className="h-8 gap-1.5 text-xs">
                            <RefreshCw className={cn("w-3.5 h-3.5", busy === "refresh" && "animate-spin")} />
                            Refresh
                        </Button>
                        <div className="relative group">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                            <div className="absolute right-0 top-full mt-1 z-50 bg-background border rounded-xl shadow-xl w-48 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                <button onClick={() => setShowRename(true)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-muted/60 transition-colors">
                                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />Rename container
                                </button>
                                <div className="h-px bg-border my-1" />
                                <button onClick={() => setShowRemove(true)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />Remove container
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500 mb-3">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
                    </div>
                )}

                <div className="flex items-center gap-1 overflow-x-auto">
                    {tabs.map(t => (
                        <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}
                            icon={t.icon} label={t.label} badge={t.badge} />
                    ))}
                </div>
            </div>

            <div className={cn("flex-1 overflow-y-auto", ["logs", "shell"].includes(tab) && "overflow-hidden")}>
                <div className={cn("p-6", ["logs", "shell"].includes(tab) && "h-full flex flex-col")}>
                    {tab === "overview" && details && (
                        <OverviewPanel details={details} stats={stats} onRefreshStats={fetchStats} />
                    )}
                    {tab === "logs" && (
                        <div className="flex-1 min-h-0">
                            <LogsPanel containerName={name} />
                        </div>
                    )}
                    {tab === "shell" && (
                        <div className="flex-1 min-h-0">
                            <ShellPanel containerName={name} />
                        </div>
                    )}
                    {tab === "env" && details && <EnvPanel envVars={details.env_vars} />}
                    {tab === "network" && details && <NetworkPanel networks={details.networks} ports={details.ports} />}
                    {tab === "volumes" && details && <VolumesPanel mounts={details.mounts} />}
                    {tab === "processes" && <ProcessesPanel containerName={name} isRunning={!!isRunning} />}
                    {tab === "inspect" && details && <InspectPanel details={details} />}
                    {!details && !["logs", "shell", "processes"].includes(tab) && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Loading container details...</span>
                        </div>
                    )}
                </div>
            </div>

            {showRename && (
                <RenameModal currentName={name} onConfirm={handleRename} onClose={() => setShowRename(false)} />
            )}

            {showRemove && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-background border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-red-500/10 shrink-0">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold">Remove Container</h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Permanently remove <strong>{name}</strong>. Choose whether to also delete volume data.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <button onClick={() => { setShowRemove(false); handleRemove(false); }}
                                className="w-full py-2.5 px-4 rounded-xl text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                                Remove container, keep volume data
                            </button>
                            <button onClick={() => { setShowRemove(false); handleRemove(true); }}
                                className="w-full py-2.5 px-4 rounded-xl text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">
                                Remove container + delete all data
                            </button>
                            <button onClick={() => setShowRemove(false)} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}