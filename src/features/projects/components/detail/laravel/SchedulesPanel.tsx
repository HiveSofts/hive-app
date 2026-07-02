import { cn } from "@/core/lib/utils";

import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import {
    Activity,
    AlertCircle,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Clock,
    Play,
    RefreshCw,
    Terminal,
    Timer,
    Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ScheduleTaskInfo {
    command: string;
    expression: string;
    next_run: string;
    description: string;
    timezone: string;
    without_overlapping: boolean;
    in_background: boolean;
    run_in_maintenance: boolean;
}

interface ScheduleRunResult {
    command: string;
    success: boolean;
    output: string;
    duration_ms: number;
}

interface RunLog {
    id: string;
    command: string;
    success: boolean;
    output: string;
    duration_ms: number;
    ran_at: string;
}

interface Toast {
    id: string;
    type: "success" | "error";
    message: string;
}

interface SchedulesPanelProps {
    projectPath: string;
}

function parseCron(expr: string): string {
    const map: Record<string, string> = {
        "* * * * *": "Every minute",
        "*/5 * * * *": "Every 5 minutes",
        "*/10 * * * *": "Every 10 minutes",
        "*/15 * * * *": "Every 15 minutes",
        "*/30 * * * *": "Every 30 minutes",
        "0 * * * *": "Every hour",
        "0 0 * * *": "Daily at midnight",
        "0 8 * * *": "Daily at 8:00",
        "0 0 * * 0": "Weekly on Sunday",
        "0 0 * * 1": "Weekly on Monday",
        "0 0 1 * *": "Monthly",
    };
    return map[expr] || expr;
}

function CronBadge({ expr }: { expr: string }) {
    const isFrequent = expr === "* * * * *" || expr.startsWith("*/");
    const isHourly = expr === "0 * * * *";
    const isDaily = /^0 \d+ \* \* \*$/.test(expr);

    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono border",
                isFrequent && "bg-purple-950/40 border-purple-800/50 text-purple-300",
                isHourly && "bg-blue-950/40 border-blue-800/50 text-blue-300",
                isDaily && "bg-amber-950/40 border-amber-800/50 text-amber-300",
                !isFrequent &&
                    !isHourly &&
                    !isDaily &&
                    "bg-muted/40 border-border/50 text-muted-foreground"
            )}
        >
            <Clock className="w-2.5 h-2.5" />
            {expr}
        </div>
    );
}

export function SchedulesPanel({ projectPath }: SchedulesPanelProps) {
    const [tasks, setTasks] = useState<ScheduleTaskInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [running, setRunning] = useState<Record<string, boolean>>({});
    const [runningAll, setRunningAll] = useState(false);
    const [logs, setLogs] = useState<RunLog[]>([]);
    const [selectedLog, setSelectedLog] = useState<RunLog | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [expandedTask, setExpandedTask] = useState<string | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const addToast = useCallback((type: Toast["type"], message: string) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    }, []);

    const loadTasks = useCallback(
        async (quiet = false) => {
            if (!quiet) setLoading(true);
            else setRefreshing(true);
            try {
                const result = await invoke<ScheduleTaskInfo[]>("get_scheduled_tasks", {
                    projectPath,
                });
                setTasks(result);
            } catch (e: any) {
                if (!quiet) addToast("error", e.toString());
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [projectPath, addToast]
    );

    useEffect(() => {
        loadTasks();
    }, [projectPath, loadTasks]);

    useEffect(() => {
        if (logs.length > 0) {
            logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    const addLog = (result: ScheduleRunResult) => {
        const entry: RunLog = {
            id: Date.now().toString(),
            command: result.command,
            success: result.success,
            output: result.output,
            duration_ms: result.duration_ms,
            ran_at: new Date().toLocaleTimeString(),
        };
        setLogs((prev) => [...prev.slice(-49), entry]);
        setSelectedLog(entry);
        return entry;
    };

    const runTask = async (command: string) => {
        setRunning((prev) => ({ ...prev, [command]: true }));
        try {
            const result = await invoke<ScheduleRunResult>("run_scheduled_task", {
                projectPath,
                command,
            });
            addLog(result);
            if (result.success) {
                addToast("success", `${command} ran in ${result.duration_ms}ms`);
            } else {
                addToast("error", `${command} failed`);
            }
        } catch (e: any) {
            addToast("error", e.toString());
        } finally {
            setRunning((prev) => ({ ...prev, [command]: false }));
        }
    };

    const runAll = async () => {
        setRunningAll(true);
        try {
            const result = await invoke<ScheduleRunResult>("run_all_scheduled_tasks", {
                projectPath,
            });
            addLog(result);
            if (result.success) {
                addToast("success", `schedule:run completed in ${result.duration_ms}ms`);
            } else {
                addToast("error", "schedule:run failed");
            }
        } catch (e: any) {
            addToast("error", e.toString());
        } finally {
            setRunningAll(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading scheduled tasks...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Toasts */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-lg text-sm shadow-xl border animate-in slide-in-from-right-5 duration-300 pointer-events-auto",
                            t.type === "success" &&
                                "bg-emerald-950 border-emerald-800 text-emerald-300",
                            t.type === "error" && "bg-red-950 border-red-800 text-red-300"
                        )}
                    >
                        {t.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Scheduled Tasks</p>
                        <p className="text-[11px] text-muted-foreground">
                            {tasks.length} task{tasks.length !== 1 ? "s" : ""} registered
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => loadTasks(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
                        onClick={runAll}
                        disabled={runningAll || tasks.length === 0}
                    >
                        {runningAll ? (
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Zap className="w-3 h-3" />
                        )}
                        Run all now
                    </Button>
                </div>
            </div>

            {/* Tasks list */}
            {tasks.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-card/20 p-12 text-center">
                    <Calendar className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                        No scheduled tasks found
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                        Define tasks in Laravel Kernel
                    </p>
                </div>
            ) : (
                <div className="space-y-1.5">
                    {tasks.map((task) => {
                        const isRunning = running[task.command];
                        const isExpanded = expandedTask === task.command;
                        const taskLog = [...logs].reverse().find((l) => l.command === task.command);

                        return (
                            <div
                                key={task.command}
                                className={cn(
                                    "rounded-xl border transition-all overflow-hidden",
                                    isExpanded
                                        ? "border-violet-700/40 bg-violet-950/10"
                                        : "border-border/50 bg-card/40 hover:bg-card/70"
                                )}
                            >
                                <div
                                    className="flex items-center gap-3 p-3.5 cursor-pointer select-none"
                                    onClick={() =>
                                        setExpandedTask(isExpanded ? null : task.command)
                                    }
                                >
                                    {/* Status dot */}
                                    <div className="shrink-0">
                                        {taskLog ? (
                                            taskLog.success ? (
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                            )
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-zinc-700" />
                                        )}
                                    </div>

                                    {/* Command */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-sm font-medium text-foreground/90 truncate">
                                                {task.command}
                                            </span>
                                            {task.description && (
                                                <span className="text-[10px] text-muted-foreground/60 truncate hidden sm:inline">
                                                    {task.description}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <CronBadge expr={task.expression} />
                                            <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                                                <ChevronRight className="w-2.5 h-2.5" />
                                                {parseCron(task.expression)}
                                            </span>
                                            {task.next_run && (
                                                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                                    <Timer className="w-2.5 h-2.5" />
                                                    {task.next_run}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Last run duration */}
                                    {taskLog && (
                                        <div className="shrink-0 text-right hidden sm:block">
                                            <p
                                                className={cn(
                                                    "text-[10px] font-mono",
                                                    taskLog.success
                                                        ? "text-emerald-500"
                                                        : "text-red-400"
                                                )}
                                            >
                                                {taskLog.duration_ms}ms
                                            </p>
                                            <p className="text-[9px] text-muted-foreground/50">
                                                {taskLog.ran_at}
                                            </p>
                                        </div>
                                    )}

                                    {/* Run button */}
                                    <div
                                        className="shrink-0 flex items-center gap-1.5"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Button
                                            size="sm"
                                            variant={isExpanded ? "default" : "outline"}
                                            className={cn(
                                                "h-7 text-xs gap-1.5 px-2.5 transition-all",
                                                isExpanded &&
                                                    "bg-violet-600 hover:bg-violet-500 text-white border-transparent"
                                            )}
                                            onClick={() => runTask(task.command)}
                                            disabled={isRunning}
                                        >
                                            {isRunning ? (
                                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Play className="w-3 h-3" />
                                            )}
                                            Run
                                        </Button>
                                    </div>

                                    <ChevronRight
                                        className={cn(
                                            "w-3.5 h-3.5 text-muted-foreground/40 transition-transform shrink-0",
                                            isExpanded && "rotate-90"
                                        )}
                                    />
                                </div>

                                {/* Expanded output */}
                                {isExpanded && (
                                    <div className="border-t border-violet-800/20 bg-zinc-950/60">
                                        {taskLog ? (
                                            <div>
                                                <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/40">
                                                    <Terminal className="w-3 h-3 text-muted-foreground/50" />
                                                    <span className="text-[10px] text-muted-foreground/60 font-mono">
                                                        last run output
                                                    </span>
                                                    <div className="ml-auto flex items-center gap-2">
                                                        {taskLog.success ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[9px] h-4 px-1.5 text-emerald-500 border-emerald-800"
                                                            >
                                                                success
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[9px] h-4 px-1.5 text-red-400 border-red-900"
                                                            >
                                                                failed
                                                            </Badge>
                                                        )}
                                                        <span className="text-[9px] text-muted-foreground/40 font-mono">
                                                            {taskLog.duration_ms}ms ·{" "}
                                                            {taskLog.ran_at}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-4 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                                                    {taskLog.output.trim() ? (
                                                        taskLog.output
                                                            .split("\n")
                                                            .map((line, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={cn(
                                                                        line
                                                                            .toLowerCase()
                                                                            .includes("error") ||
                                                                            line
                                                                                .toLowerCase()
                                                                                .includes("failed")
                                                                            ? "text-red-400"
                                                                            : line
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "success"
                                                                                    ) ||
                                                                                line
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        "done"
                                                                                    )
                                                                              ? "text-emerald-400"
                                                                              : "text-zinc-400"
                                                                    )}
                                                                >
                                                                    {line || "\u00A0"}
                                                                </div>
                                                            ))
                                                    ) : (
                                                        <span className="text-zinc-700">
                                                            No output
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="px-4 py-6 text-center">
                                                <Activity className="w-5 h-5 mx-auto text-zinc-700 mb-2" />
                                                <p className="text-[11px] text-zinc-600">
                                                    Not run yet this session
                                                </p>
                                                <p className="text-[10px] text-zinc-700 mt-0.5">
                                                    Click Run to execute manually
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Run history */}
            {logs.length > 0 && (
                <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/60 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/40">
                        <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-muted-foreground/50" />
                            <span className="text-[11px] text-muted-foreground/70">
                                Run history
                            </span>
                            <Badge
                                variant="outline"
                                className="text-[9px] h-4 px-1.5 text-muted-foreground"
                            >
                                {logs.length}
                            </Badge>
                        </div>
                        <button
                            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                            onClick={() => setLogs([])}
                        >
                            Clear
                        </button>
                    </div>
                    <div className="max-h-44 overflow-y-auto divide-y divide-zinc-800/30">
                        {[...logs].reverse().map((log) => (
                            <button
                                key={log.id}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-800/30 transition-colors",
                                    selectedLog?.id === log.id && "bg-zinc-800/40"
                                )}
                                onClick={() => {
                                    setSelectedLog(log);
                                    setExpandedTask(log.command);
                                }}
                            >
                                <div
                                    className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                        log.success ? "bg-emerald-500" : "bg-red-500"
                                    )}
                                />
                                <span className="font-mono text-[11px] text-zinc-300 flex-1 truncate">
                                    {log.command}
                                </span>
                                <span className="text-[10px] text-zinc-600 font-mono shrink-0">
                                    {log.duration_ms}ms
                                </span>
                                <span className="text-[9px] text-zinc-700 shrink-0">
                                    {log.ran_at}
                                </span>
                            </button>
                        ))}
                    </div>
                    <div ref={logsEndRef} />
                </div>
            )}
        </div>
    );
}
