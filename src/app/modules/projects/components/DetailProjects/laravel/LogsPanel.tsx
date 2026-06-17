import { useState } from "react";

import { AlertCircle, Clock, Info, Search, Trash2, XCircle } from "lucide-react";

import { Button } from "@/app/components/ui/button.tsx";
import { Input } from "@/app/components/ui/input.tsx";

const mockLogs = [
    {
        id: 1,
        level: "error",
        message: "SQLSTATE[HY000]: General error: 1215 Cannot add foreign key constraint",
        context: "App\\Http\\Controllers\\PostController@store",
        time: "2 min ago",
        date: "2025-06-14 23:41:02",
    },
    {
        id: 2,
        level: "warning",
        message: 'Undefined array key "user_id" in request payload',
        context: "App\\Http\\Middleware\\AuthMiddleware",
        time: "5 min ago",
        date: "2025-06-14 23:38:17",
    },
    {
        id: 3,
        level: "info",
        message: "User [id=42] logged in successfully from 192.168.1.1",
        context: "App\\Http\\Controllers\\AuthController",
        time: "12 min ago",
        date: "2025-06-14 23:31:44",
    },
];

export function LogsPanel() {
    const [filter, setFilter] = useState<"all" | "error" | "warning" | "info">("all");
    const [search, setSearch] = useState("");

    const filtered = mockLogs.filter(
        (l) =>
            (filter === "all" || l.level === filter) &&
            (l.message.toLowerCase().includes(search.toLowerCase()) ||
                l.context.toLowerCase().includes(search.toLowerCase()))
    );

    const levelStyle = (l: string) =>
        ({
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
        })[l] ?? { bg: "", icon: null, badge: "" };

    const counts = {
        error: mockLogs.filter((l) => l.level === "error").length,
        warning: mockLogs.filter((l) => l.level === "warning").length,
        info: mockLogs.filter((l) => l.level === "info").length,
    };

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
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${filter === f ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted text-muted-foreground"}`}
                        >
                            {f === "all"
                                ? `All (${mockLogs.length})`
                                : f === "error"
                                  ? `Error (${counts.error})`
                                  : f === "warning"
                                    ? `Warn (${counts.warning})`
                                    : `Info (${counts.info})`}
                        </button>
                    ))}
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1 shrink-0">
                    <Trash2 className="w-3 h-3" />
                    Clear logs
                </Button>
            </div>

            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {filtered.map((log) => {
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
                                    <p className="text-xs text-foreground/90 leading-snug font-mono">
                                        {log.message}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                                        {log.date}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-10">
                        No logs matching filters
                    </div>
                )}
            </div>
        </div>
    );
}
