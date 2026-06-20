import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Info,
    Search,
    Trash2,
    XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LogEntry {
    id: number;
    level: string;
    message: string;
    context: string;
    time: string;
    date: string;
}

interface LogPage {
    entries: LogEntry[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

interface LogsPanelProps {
    projectPath: string;
}

export function LogsPanel({ projectPath }: LogsPanelProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState<"all" | "error" | "warning" | "info">("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalLogs, setTotalLogs] = useState(0);
    const perPage = 50;

    useEffect(() => {
        loadLogs();
    }, [projectPath, currentPage]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const result = await invoke<LogPage>("get_project_logs", {
                projectPath,
                page: currentPage,
                per_page: perPage,
            });
            setLogs(result.entries || []);
            setTotalPages(result.total_pages || 0);
            setTotalLogs(result.total || 0);
        } catch (error) {
            console.error("Failed to load logs:", error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const clearLogs = async () => {
        setClearing(true);
        try {
            await invoke("clear_project_logs", { projectPath });
            setLogs([]);
            setTotalLogs(0);
            setTotalPages(0);
        } catch (error) {
            console.error("Failed to clear logs:", error);
        } finally {
            setClearing(false);
        }
    };

    const filtered = logs.filter(
        (l) =>
            (filter === "all" || l.level === filter) &&
            (l.message.toLowerCase().includes(search.toLowerCase()) ||
                l.context.toLowerCase().includes(search.toLowerCase()))
    );

    const levelStyle = (level: string) => {
        const styles = {
            error: {
                bg: "bg-red-500/10 border-red-500/30",
                icon: <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />,
                badge: "bg-red-500/15 text-red-500",
            },
            warning: {
                bg: "bg-yellow-500/10 border-yellow-500/30",
                icon: <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />,
                badge: "bg-yellow-500/15 text-yellow-500",
            },
            info: {
                bg: "bg-blue-500/10 border-blue-500/30",
                icon: <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
                badge: "bg-blue-500/15 text-blue-400",
            },
        };
        return styles[level as keyof typeof styles] || styles.info;
    };

    const counts = {
        error: logs.filter((l) => l.level === "error").length,
        warning: logs.filter((l) => l.level === "warning").length,
        info: logs.filter((l) => l.level === "info").length,
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search logs..."
                        className="pl-8 h-8 text-xs"
                    />
                </div>
                <div className="flex gap-1.5">
                    {(["all", "error", "warning", "info"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                                filter === f
                                    ? "bg-foreground text-background border-foreground"
                                    : "border-border hover:bg-muted text-muted-foreground"
                            }`}
                        >
                            {f === "all"
                                ? `All (${totalLogs})`
                                : f === "error"
                                  ? `Error (${counts.error})`
                                  : f === "warning"
                                    ? `Warn (${counts.warning})`
                                    : `Info (${counts.info})`}
                        </button>
                    ))}
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1 shrink-0"
                    onClick={clearLogs}
                    disabled={clearing || totalLogs === 0}
                >
                    {clearing ? (
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Trash2 className="w-3 h-3" />
                    )}
                    Clear logs
                </Button>
            </div>

            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-10">
                        {search || filter !== "all" ? "No logs matching filters" : "No logs found"}
                    </div>
                ) : (
                    filtered.map((log) => {
                        const s = levelStyle(log.level);
                        return (
                            <div
                                key={log.id}
                                className={`rounded-xl border p-3 ${s.bg} transition-all`}
                            >
                                <div className="flex items-start gap-2.5">
                                    {s.icon}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span
                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${s.badge}`}
                                            >
                                                {log.level}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground font-mono truncate">
                                                {log.context}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {log.time}
                                            </span>
                                        </div>
                                        <p className="text-xs text-foreground/90 leading-snug font-mono whitespace-pre-wrap">
                                            {log.message}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                                            {log.date}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                        Page {currentPage} of {totalPages} ({totalLogs} total entries)
                    </div>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => goToPage(pageNum)}
                                        className={`h-7 w-7 text-xs rounded-md transition-colors ${
                                            pageNum === currentPage
                                                ? "bg-foreground text-background"
                                                : "hover:bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
