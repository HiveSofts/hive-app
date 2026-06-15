import { useState } from "react";

import { Play, RefreshCw, Square, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";

const mockQueues = [
    { id: 1, name: "default", jobs: 3, failed: 1, processed: 142, status: "running" },
    { id: 2, name: "emails", jobs: 0, failed: 0, processed: 89, status: "running" },
    { id: 3, name: "notifications", jobs: 7, failed: 2, processed: 301, status: "paused" },
];

export function QueuesPanel() {
    const [queues, setQueues] = useState(mockQueues);
    const statusColor = (s: string) => (s === "running" ? "text-emerald-500" : "text-yellow-500");
    const toggle = (id: number) =>
        setQueues((q) =>
            q.map((x) =>
                x.id === id ? { ...x, status: x.status === "running" ? "paused" : "running" } : x
            )
        );

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Active queue workers monitored by supervisor
                </p>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <RefreshCw className="w-3 h-3" /> Refresh
                </Button>
            </div>
            <div className="space-y-2">
                {queues.map((q) => (
                    <div
                        key={q.id}
                        className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                    >
                        <div className="flex items-center gap-2 shrink-0">
                            <span
                                className={`w-2 h-2 rounded-full ${q.status === "running" ? "bg-emerald-500 animate-pulse" : "bg-yellow-500"}`}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-medium">{q.name}</span>
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 ${statusColor(q.status)} border-current/20`}
                                >
                                    {q.status}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 text-xs text-muted-foreground">
                            <div className="text-center">
                                <div className="font-semibold text-foreground text-sm">
                                    {q.jobs}
                                </div>
                                <div>pending</div>
                            </div>
                            <div className="text-center">
                                <div
                                    className={`font-semibold text-sm ${q.failed > 0 ? "text-red-500" : "text-foreground"}`}
                                >
                                    {q.failed}
                                </div>
                                <div>failed</div>
                            </div>
                            <div className="text-center">
                                <div className="font-semibold text-foreground text-sm">
                                    {q.processed}
                                </div>
                                <div>processed</div>
                            </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => toggle(q.id)}
                            >
                                {q.status === "running" ? (
                                    <>
                                        <Square className="w-3 h-3 mr-1" />
                                        Pause
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-3 h-3 mr-1" />
                                        Resume
                                    </>
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-500 hover:text-red-600"
                            >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Clear failed
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
