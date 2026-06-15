import { useState } from "react";

import { cn } from "@/lib/utils";

type LogLevel = "error" | "warn" | "info";

const LOG_STREAM = [
    {
        id: 1,
        level: "error" as LogLevel,
        project: "my-blog",
        msg: "SQLSTATE[42S02]: Base table not found: posts",
        ts: "23:41:02",
    },
    {
        id: 2,
        level: "warn" as LogLevel,
        project: "api-gateway",
        msg: "High memory usage: 487 MB (threshold: 512 MB)",
        ts: "23:38:47",
    },
    {
        id: 3,
        level: "info" as LogLevel,
        project: "my-blog",
        msg: "Cache cleared via artisan",
        ts: "23:35:11",
    },
    {
        id: 4,
        level: "error" as LogLevel,
        project: "dashboard-app",
        msg: "Unhandled promise rejection: fetch failed",
        ts: "23:30:05",
    },
    {
        id: 5,
        level: "warn" as LogLevel,
        project: "my-blog",
        msg: "Rate limit exceeded for 10.0.0.5",
        ts: "23:22:58",
    },
];

const logColor: Record<LogLevel, { dot: string; text: string; bg: string }> = {
    error: { dot: "bg-red-500", text: "text-red-500", bg: "bg-red-500/8 border-red-500/20" },
    warn: {
        dot: "bg-yellow-500",
        text: "text-yellow-500",
        bg: "bg-yellow-500/8 border-yellow-500/20",
    },
    info: { dot: "bg-blue-400", text: "text-blue-400", bg: "bg-blue-500/8 border-blue-500/20" },
};

export function LogStream() {
    const [filter, setFilter] = useState<"all" | LogLevel>("all");
    const [projectFilter, setProjectFilter] = useState("all");
    const projects = ["all", ...Array.from(new Set(LOG_STREAM.map((l) => l.project)))];
    const filtered = LOG_STREAM.filter(
        (l) =>
            (filter === "all" || l.level === filter) &&
            (projectFilter === "all" || l.project === projectFilter)
    );

    return (
        <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
                <div className="flex gap-1">
                    {(["all", "error", "warn", "info"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-2.5 py-1 text-[11px] rounded-lg border font-medium transition-colors capitalize",
                                filter === f
                                    ? "bg-foreground text-background border-foreground"
                                    : "border-border text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="ml-auto text-[11px] bg-background border rounded-lg px-2 py-1 text-muted-foreground outline-none"
                >
                    {projects.map((p) => (
                        <option key={p} value={p}>
                            {p === "all" ? "All projects" : p}
                        </option>
                    ))}
                </select>
            </div>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                {filtered.map((log) => {
                    const c = logColor[log.level];
                    return (
                        <div
                            key={log.id}
                            className={cn(
                                "flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs",
                                c.bg
                            )}
                        >
                            <span className={cn("w-1.5 h-1.5 rounded-full mt-1 shrink-0", c.dot)} />
                            <span
                                className={cn(
                                    "font-semibold shrink-0 uppercase text-[10px] tracking-wide w-8",
                                    c.text
                                )}
                            >
                                {log.level}
                            </span>
                            <span className="font-mono text-muted-foreground shrink-0 hidden sm:block w-20 truncate">
                                {log.project}
                            </span>
                            <span className="text-foreground/80 flex-1 font-mono truncate">
                                {log.msg}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
                                {log.ts}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
