import { cn } from "@/core/lib/utils";

import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import {
    Activity,
    AlertCircle,
    ArrowRight,
    CheckCircle,
    ChevronRight,
    Clock,
    Cpu,
    Database,
    Eye,
    Filter,
    Hash,
    Maximize2,
    Minimize2,
    MoreVertical,
    Pause,
    Play,
    Plus,
    Power,
    PowerOff,
    RefreshCw,
    RotateCcw,
    Server,
    Settings,
    Square,
    Terminal,
    Trash2,
    X,
    Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QueueWorker {
    name: string;
    pid?: number;
    jobs: number;
    failed: number;
    processed: number;
    status: string;
    memory?: number;
    timeout?: number;
    tries?: number;
    queue?: string;
    connection?: string;
    started_at?: string;
}

interface FailedJob {
    id: string;
    connection: string;
    queue: string;
    payload: string;
    exception: string;
    failed_at: string;
}

interface QueueStats {
    total_workers: number;
    running_workers: number;
    failed_jobs: number;
    pending_jobs: number;
    connection: string;
    queues: { name: string; size: number; status: string }[];
}

interface Toast {
    id: string;
    type: "success" | "error" | "info";
    message: string;
}

const QUEUE_COMMANDS = [
    { name: "queue:work", desc: "Start processing jobs on the queue" },
    { name: "queue:restart", desc: "Restart queue worker daemons" },
    { name: "queue:retry all", desc: "Retry all failed jobs" },
    { name: "queue:clear", desc: "Delete all jobs from queue" },
    { name: "queue:failed", desc: "List all failed queue jobs" },
    { name: "queue:flush", desc: "Flush all failed queue jobs" },
    { name: "queue:monitor", desc: "Monitor the status of the queue" },
    { name: "queue:prune-batches", desc: "Prune stale batches from database" },
    { name: "queue:prune-failed --hours=48", desc: "Prune stale failed jobs" },
    { name: "queue:listen", desc: "Listen to a given queue" },
];

interface QueuesPanelProps {
    projectPath: string;
}

export function QueuesPanel({ projectPath }: QueuesPanelProps) {
    const [workers, setWorkers] = useState<QueueWorker[]>([]);
    const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
    const [stats, setStats] = useState<QueueStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState("workers");
    const [toasts, setToasts] = useState<Toast[]>([]);

    const [workerAction, setWorkerAction] = useState<Record<string, boolean>>({});
    const [commandResult, setCommandResult] = useState<{ output: string; success: boolean } | null>(
        null
    );

    const [logsWorker, setLogsWorker] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [logsMinimized, setLogsMinimized] = useState(false);

    const [showStartDialog, setShowStartDialog] = useState(false);
    const [showCommandDialog, setShowCommandDialog] = useState(false);
    const [showCommandResult, setShowCommandResult] = useState(false);

    const [startConfig, setStartConfig] = useState({
        name: "default",
        queue: "default",
        memory: 128,
        timeout: 60,
        tries: 3,
        connection: "",
    });
    const [selectedCommand, setSelectedCommand] = useState("queue:work");
    const [commandArgs, setCommandArgs] = useState("");

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const logsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(true);

    const addToast = useCallback((type: Toast["type"], message: string) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    }, []);

    const loadAll = useCallback(async () => {
        try {
            const [workersData, statsData] = await Promise.all([
                invoke<QueueWorker[]>("get_queue_workers", { projectPath }),
                invoke<QueueStats>("get_queue_stats", { projectPath }),
            ]);
            if (isMounted.current) {
                setWorkers(workersData);
                setStats(statsData);
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [projectPath]);

    const loadFailedJobs = useCallback(async () => {
        try {
            const jobs = await invoke<FailedJob[]>("get_failed_jobs", { projectPath });
            setFailedJobs(jobs);
        } catch (e) {
            console.error(e);
        }
    }, [projectPath]);

    const loadLogs = useCallback(
        async (workerName: string) => {
            try {
                const lines = await invoke<string[]>("get_queue_worker_logs", {
                    projectPath,
                    workerName,
                    lines: 400,
                });
                setLogs(lines);
            } catch (e) {
                console.error(e);
            }
        },
        [projectPath]
    );

    useEffect(() => {
        isMounted.current = true;
        loadAll();
        intervalRef.current = setInterval(loadAll, 5000);
        return () => {
            isMounted.current = false;
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (logsIntervalRef.current) clearInterval(logsIntervalRef.current);
        };
    }, [projectPath, loadAll]);

    useEffect(() => {
        if (activeTab === "failed") loadFailedJobs();
    }, [activeTab, loadFailedJobs]);

    useEffect(() => {
        if (logsWorker && !logsMinimized) {
            loadLogs(logsWorker);
            logsIntervalRef.current = setInterval(() => loadLogs(logsWorker), 2000);
        } else {
            if (logsIntervalRef.current) clearInterval(logsIntervalRef.current);
        }
        return () => {
            if (logsIntervalRef.current) clearInterval(logsIntervalRef.current);
        };
    }, [logsWorker, logsMinimized, loadLogs]);

    useEffect(() => {
        if (!logsMinimized && logs.length > 0) {
            logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, logsMinimized]);

    const startWorker = async () => {
        const key = startConfig.name;
        setWorkerAction((p) => ({ ...p, [key]: true }));
        try {
            const msg = await invoke<string>("start_queue_worker", {
                projectPath,
                workerName: startConfig.name,
                queue: startConfig.queue || null,
                memory: startConfig.memory,
                timeout: startConfig.timeout,
                tries: startConfig.tries,
                connection: startConfig.connection || null,
            });
            addToast("success", msg);
            setShowStartDialog(false);
            setLogsWorker(startConfig.name);
            setLogsMinimized(false);
            await loadAll();
        } catch (e: any) {
            addToast("error", e.toString());
        } finally {
            setWorkerAction((p) => ({ ...p, [key]: false }));
        }
    };

    const stopWorker = async (name: string) => {
        setWorkerAction((p) => ({ ...p, [`stop_${name}`]: true }));
        try {
            const msg = await invoke<string>("stop_queue_worker", {
                projectPath,
                workerName: name,
            });
            addToast("success", msg);
            await loadAll();
        } catch (e: any) {
            addToast("error", e.toString());
        } finally {
            setWorkerAction((p) => ({ ...p, [`stop_${name}`]: false }));
        }
    };

    const restartAll = async () => {
        try {
            const msg = await invoke<string>("restart_queue_worker", { projectPath });
            addToast("success", msg);
        } catch (e: any) {
            addToast("error", e.toString());
        }
    };

    const retryJob = async (id: string) => {
        try {
            const msg = await invoke<string>("retry_failed_job", { projectPath, jobId: id });
            addToast("success", msg);
            await loadFailedJobs();
        } catch (e: any) {
            addToast("error", e.toString());
        }
    };

    const retryAll = async () => {
        try {
            const msg = await invoke<string>("retry_all_failed_jobs", { projectPath });
            addToast("success", msg);
            await loadFailedJobs();
        } catch (e: any) {
            addToast("error", e.toString());
        }
    };

    const forgetJob = async (id: string) => {
        try {
            await invoke<string>("forget_failed_job", { projectPath, jobId: id });
            addToast("success", `Job ${id} deleted`);
            await loadFailedJobs();
        } catch (e: any) {
            addToast("error", e.toString());
        }
    };

    const flushAll = async () => {
        try {
            const msg = await invoke<string>("flush_failed_jobs", { projectPath });
            addToast("success", msg || "All failed jobs flushed");
            await loadFailedJobs();
            await loadAll();
        } catch (e: any) {
            addToast("error", e.toString());
        }
    };

    const runCommand = async () => {
        const parts = (selectedCommand + " " + commandArgs).trim().split(/\s+/);
        const cmd = parts[0];
        const args = parts.slice(1);
        try {
            const result = await invoke<{ success: boolean; output: string }>("run_queue_command", {
                projectPath,
                command: cmd,
                args,
            });
            setCommandResult(result);
            setShowCommandDialog(false);
            setShowCommandResult(true);
            if (result.success) await loadAll();
        } catch (e: any) {
            setCommandResult({ success: false, output: e.toString() });
            setShowCommandResult(true);
        }
    };

    const openLogsFor = (name: string) => {
        setLogsWorker(name);
        setLogsMinimized(false);
    };

    const getLogLineClass = (line: string) => {
        if (line.includes("ERROR") || line.includes("Error") || line.includes("FAILED"))
            return "text-red-400";
        if (line.includes("WARNING") || line.includes("warning")) return "text-yellow-400";
        if (line.includes("Processing") || line.includes("Processed") || line.includes("INFO"))
            return "text-emerald-400";
        if (line.includes("[") && line.includes("]")) return "text-blue-300";
        return "text-zinc-400";
    };

    const runningCount = workers.filter((w) => w.status === "running").length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading queue workers...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Toast notifications */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-lg text-sm shadow-xl border animate-in slide-in-from-right-5 duration-300",
                            t.type === "success" &&
                                "bg-emerald-950 border-emerald-800 text-emerald-300",
                            t.type === "error" && "bg-red-950 border-red-800 text-red-300",
                            t.type === "info" && "bg-blue-950 border-blue-800 text-blue-300"
                        )}
                    >
                        {t.type === "success" && <CheckCircle className="w-4 h-4 shrink-0" />}
                        {t.type === "error" && <AlertCircle className="w-4 h-4 shrink-0" />}
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>

            {/* Header stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-card/40 border-border/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-bold">{workers.length}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Total Workers
                            </p>
                        </div>
                        <Server className="w-5 h-5 text-muted-foreground/40" />
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "border-border/50",
                        runningCount > 0 ? "bg-emerald-950/30 border-emerald-900/40" : "bg-card/40"
                    )}
                >
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p
                                className={cn(
                                    "text-2xl font-bold",
                                    runningCount > 0 ? "text-emerald-400" : "text-muted-foreground"
                                )}
                            >
                                {runningCount}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Running</p>
                        </div>
                        <Zap
                            className={cn(
                                "w-5 h-5",
                                runningCount > 0
                                    ? "text-emerald-500/40"
                                    : "text-muted-foreground/20"
                            )}
                        />
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "border-border/50",
                        (stats?.failed_jobs ?? 0) > 0
                            ? "bg-red-950/30 border-red-900/40"
                            : "bg-card/40"
                    )}
                >
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p
                                className={cn(
                                    "text-2xl font-bold",
                                    (stats?.failed_jobs ?? 0) > 0
                                        ? "text-red-400"
                                        : "text-muted-foreground"
                                )}
                            >
                                {stats?.failed_jobs ?? 0}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Failed Jobs</p>
                        </div>
                        <AlertCircle
                            className={cn(
                                "w-5 h-5",
                                (stats?.failed_jobs ?? 0) > 0
                                    ? "text-red-500/40"
                                    : "text-muted-foreground/20"
                            )}
                        />
                    </CardContent>
                </Card>

                <Card className="bg-card/40 border-border/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold font-mono">
                                {stats?.connection ?? "—"}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Connection</p>
                        </div>
                        <Database className="w-5 h-5 text-muted-foreground/40" />
                    </CardContent>
                </Card>
            </div>

            {/* Main content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <div className="flex items-center justify-between mb-3">
                    <TabsList className="h-8">
                        <TabsTrigger value="workers" className="text-xs h-6 px-3">
                            Workers
                        </TabsTrigger>
                        <TabsTrigger value="failed" className="text-xs h-6 px-3 gap-1.5">
                            Failed
                            {(stats?.failed_jobs ?? 0) > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="h-4 px-1 text-[9px] rounded-full"
                                >
                                    {stats?.failed_jobs}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="commands" className="text-xs h-6 px-3">
                            Commands
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1.5"
                            onClick={() => {
                                setRefreshing(true);
                                loadAll();
                            }}
                            disabled={refreshing}
                        >
                            <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
                            Refresh
                        </Button>
                        <Button
                            size="sm"
                            className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                            onClick={() => setShowStartDialog(true)}
                        >
                            <Plus className="w-3 h-3" />
                            New Worker
                        </Button>
                    </div>
                </div>

                {/* Workers Tab */}
                <TabsContent value="workers" className="mt-0">
                    <div className="space-y-2">
                        {workers.length === 0 ? (
                            <div className="rounded-xl border border-dashed bg-card/20 p-12 text-center">
                                <Server className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">
                                    No workers configured
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                    Start a new worker to begin processing jobs
                                </p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-4 text-xs h-7 gap-1.5"
                                    onClick={() => setShowStartDialog(true)}
                                >
                                    <Plus className="w-3 h-3" /> Start Worker
                                </Button>
                            </div>
                        ) : (
                            workers.map((w) => (
                                <WorkerRow
                                    key={w.name}
                                    worker={w}
                                    onStart={() => {
                                        setStartConfig((p) => ({
                                            ...p,
                                            name: w.name,
                                            queue: w.queue || w.name,
                                        }));
                                        setShowStartDialog(true);
                                    }}
                                    onStop={() => stopWorker(w.name)}
                                    onLogs={() => openLogsFor(w.name)}
                                    onRestart={restartAll}
                                    stopping={workerAction[`stop_${w.name}`] ?? false}
                                    starting={workerAction[w.name] ?? false}
                                />
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* Failed Jobs Tab */}
                <TabsContent value="failed" className="mt-0">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                {failedJobs.length} failed jobs
                            </p>
                            {failedJobs.length > 0 && (
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs gap-1.5"
                                        onClick={retryAll}
                                    >
                                        <RotateCcw className="w-3 h-3" /> Retry All
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-7 text-xs gap-1.5"
                                        onClick={flushAll}
                                    >
                                        <Trash2 className="w-3 h-3" /> Flush All
                                    </Button>
                                </div>
                            )}
                        </div>

                        {failedJobs.length === 0 ? (
                            <div className="rounded-xl border border-dashed bg-card/20 p-12 text-center">
                                <CheckCircle className="w-8 h-8 mx-auto text-emerald-500/30 mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">
                                    No failed jobs
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                    All jobs processed successfully
                                </p>
                            </div>
                        ) : (
                            failedJobs.map((job, i) => (
                                <div key={i} className="rounded-xl border bg-card/50 p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-mono px-1.5"
                                                >
                                                    {job.id}
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] text-blue-400 border-blue-800"
                                                >
                                                    {job.queue}
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] text-muted-foreground"
                                                >
                                                    {job.connection}
                                                </Badge>
                                            </div>
                                            <p className="text-xs font-mono text-muted-foreground mt-2 truncate">
                                                {job.payload}
                                            </p>
                                            {job.exception && (
                                                <p className="text-[11px] text-red-400 mt-1 font-mono line-clamp-2">
                                                    {job.exception}
                                                </p>
                                            )}
                                            {job.failed_at && (
                                                <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {job.failed_at}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-1.5 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs gap-1"
                                                onClick={() => retryJob(job.id)}
                                            >
                                                <RotateCcw className="w-3 h-3" /> Retry
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                                                onClick={() => forgetJob(job.id)}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* Commands Tab */}
                <TabsContent value="commands" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {QUEUE_COMMANDS.map((cmd) => (
                            <button
                                key={cmd.name}
                                onClick={() => {
                                    const parts = cmd.name.split(" ");
                                    setSelectedCommand(parts[0]);
                                    setCommandArgs(parts.slice(1).join(" "));
                                    setShowCommandDialog(true);
                                }}
                                className="flex items-center gap-3 p-3 rounded-xl border bg-card/40 hover:bg-muted/40 transition-colors text-left group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                                    <Terminal className="w-4 h-4 text-amber-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-mono font-medium">{cmd.name}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {cmd.desc}
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                            </button>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Logs Panel */}
            {logsWorker && (
                <div className="rounded-xl border border-zinc-700/50 bg-zinc-950/80 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/60">
                        <div className="flex items-center gap-2">
                            <div
                                className={cn(
                                    "w-2 h-2 rounded-full",
                                    workers.find((w) => w.name === logsWorker)?.status === "running"
                                        ? "bg-emerald-500 animate-pulse"
                                        : "bg-zinc-600"
                                )}
                            />
                            <span className="text-xs font-mono text-zinc-300">{logsWorker}</span>
                            <span className="text-[10px] text-zinc-600">worker logs</span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setLogsMinimized((p) => !p)}
                                className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                            >
                                {logsMinimized ? (
                                    <Maximize2 className="w-3 h-3" />
                                ) : (
                                    <Minimize2 className="w-3 h-3" />
                                )}
                            </button>
                            <button
                                onClick={() => setLogsWorker(null)}
                                className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                    {!logsMinimized && (
                        <div className="h-56 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-px">
                            {logs.length === 0 ? (
                                <span className="text-zinc-700">Waiting for log output...</span>
                            ) : (
                                logs.map((line, i) => (
                                    <div key={i} className={getLogLineClass(line)}>
                                        {line}
                                    </div>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    )}
                </div>
            )}

            {/* Start Worker Dialog */}
            <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Server className="w-4 h-4" /> Start Queue Worker
                        </DialogTitle>
                        <DialogDescription>
                            Configure and launch a new queue:work process
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Worker Name</Label>
                                <Input
                                    value={startConfig.name}
                                    onChange={(e) =>
                                        setStartConfig((p) => ({ ...p, name: e.target.value }))
                                    }
                                    className="h-8 text-xs font-mono"
                                    placeholder="default"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Queue</Label>
                                <Input
                                    value={startConfig.queue}
                                    onChange={(e) =>
                                        setStartConfig((p) => ({ ...p, queue: e.target.value }))
                                    }
                                    className="h-8 text-xs font-mono"
                                    placeholder="default"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Memory (MB)</Label>
                                <Input
                                    type="number"
                                    value={startConfig.memory}
                                    onChange={(e) =>
                                        setStartConfig((p) => ({ ...p, memory: +e.target.value }))
                                    }
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Timeout (s)</Label>
                                <Input
                                    type="number"
                                    value={startConfig.timeout}
                                    onChange={(e) =>
                                        setStartConfig((p) => ({ ...p, timeout: +e.target.value }))
                                    }
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Tries</Label>
                                <Input
                                    type="number"
                                    value={startConfig.tries}
                                    onChange={(e) =>
                                        setStartConfig((p) => ({ ...p, tries: +e.target.value }))
                                    }
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Connection (optional)</Label>
                            <Input
                                value={startConfig.connection}
                                onChange={(e) =>
                                    setStartConfig((p) => ({ ...p, connection: e.target.value }))
                                }
                                className="h-8 text-xs font-mono"
                                placeholder="redis / database / sync"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => setShowStartDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                            onClick={startWorker}
                            disabled={workerAction[startConfig.name] || !startConfig.name.trim()}
                        >
                            {workerAction[startConfig.name] ? (
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Play className="w-3 h-3" />
                            )}
                            Start Worker
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Run Command Dialog */}
            <Dialog open={showCommandDialog} onOpenChange={setShowCommandDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-amber-500" /> Run Artisan Command
                        </DialogTitle>
                        <DialogDescription>
                            Execute a queue command with custom arguments
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Command</Label>
                            <Select value={selectedCommand} onValueChange={setSelectedCommand}>
                                <SelectTrigger className="h-8 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {QUEUE_COMMANDS.map((c) => (
                                        <SelectItem
                                            key={c.name}
                                            value={c.name.split(" ")[0]}
                                            className="text-xs"
                                        >
                                            <span className="font-mono">
                                                {c.name.split(" ")[0]}
                                            </span>
                                            <span className="text-muted-foreground ml-2 text-[10px]">
                                                {c.desc}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Arguments</Label>
                            <Input
                                value={commandArgs}
                                onChange={(e) => setCommandArgs(e.target.value)}
                                className="h-8 text-xs font-mono"
                                placeholder="--queue=default --memory=128"
                            />
                        </div>
                        <div className="rounded-lg bg-muted/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                            php artisan {selectedCommand} {commandArgs}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => setShowCommandDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="text-xs bg-amber-600 hover:bg-amber-500 text-white gap-1.5"
                            onClick={runCommand}
                        >
                            <Play className="w-3 h-3" /> Run
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Command Result Dialog */}
            <Dialog open={showCommandResult} onOpenChange={setShowCommandResult}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {commandResult?.success ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            Command {commandResult?.success ? "Succeeded" : "Failed"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 max-h-64 overflow-y-auto">
                        <pre className="font-mono text-[11px] text-zinc-300 whitespace-pre-wrap">
                            {commandResult?.output || "No output"}
                        </pre>
                    </div>
                    <DialogFooter>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => setShowCommandResult(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function WorkerRow({
    worker,
    onStart,
    onStop,
    onLogs,
    onRestart,
    stopping,
    starting,
}: {
    worker: QueueWorker;
    onStart: () => void;
    onStop: () => void;
    onLogs: () => void;
    onRestart: () => void;
    stopping: boolean;
    starting: boolean;
}) {
    const isRunning = worker.status === "running";

    return (
        <div
            className={cn(
                "rounded-xl border p-4 transition-all",
                isRunning ? "bg-card/60 border-border/60" : "bg-card/30 border-border/30"
            )}
        >
            <div className="flex items-center gap-4">
                <div className="shrink-0">
                    <div
                        className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center",
                            isRunning ? "bg-emerald-500/15" : "bg-muted/40"
                        )}
                    >
                        <Cpu
                            className={cn(
                                "w-4 h-4",
                                isRunning ? "text-emerald-500" : "text-muted-foreground/40"
                            )}
                        />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{worker.name}</span>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] h-4 px-1.5 font-normal",
                                isRunning
                                    ? "text-emerald-500 border-emerald-800"
                                    : "text-muted-foreground"
                            )}
                        >
                            {isRunning ? (
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    running
                                </span>
                            ) : (
                                worker.status
                            )}
                        </Badge>
                        {worker.pid && isRunning && (
                            <span className="text-[10px] text-muted-foreground/50 font-mono">
                                PID {worker.pid}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        {worker.queue && <Spec icon={Hash} label={worker.queue} />}
                        {worker.connection && <Spec icon={Database} label={worker.connection} />}
                        {worker.memory && <Spec icon={Cpu} label={`${worker.memory}MB`} />}
                        {worker.timeout && <Spec icon={Clock} label={`${worker.timeout}s`} />}
                        {worker.tries && <Spec label={`${worker.tries} tries`} />}
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <Metric label="pending" value={worker.jobs} />
                    <Metric label="failed" value={worker.failed} danger={worker.failed > 0} />
                    <Metric label="done" value={worker.processed} />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={onLogs}
                        title="View logs"
                    >
                        <Terminal className="w-3.5 h-3.5" />
                    </Button>

                    {isRunning ? (
                        <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs gap-1.5 px-2.5"
                            onClick={onStop}
                            disabled={stopping}
                        >
                            {stopping ? (
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <PowerOff className="w-3 h-3" />
                            )}
                            Stop
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            className="h-7 text-xs gap-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                            onClick={onStart}
                            disabled={starting}
                        >
                            {starting ? (
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Power className="w-3 h-3" />
                            )}
                            Start
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground"
                            >
                                <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={onLogs} className="gap-2 text-xs">
                                <Eye className="w-3 h-3" /> View Logs
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onRestart} className="gap-2 text-xs">
                                <RotateCcw className="w-3 h-3" /> Signal Restart
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

function Metric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
    return (
        <div className="text-center min-w-[40px]">
            <p
                className={cn(
                    "text-sm font-semibold tabular-nums",
                    danger && value > 0 ? "text-red-400" : "text-foreground"
                )}
            >
                {value}
            </p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
    );
}

function Spec({ icon: Icon, label }: { icon?: any; label: string }) {
    return (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            {Icon && <Icon className="w-3 h-3" />}
            <span className="font-mono">{label}</span>
        </span>
    );
}
