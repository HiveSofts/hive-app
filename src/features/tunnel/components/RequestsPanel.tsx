import { useState } from "react";

import { Eye, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getStatusColor } from "../services/tunnelService";
import { RequestLog } from "../types";

interface RequestsPanelProps {
    requests: RequestLog[];
    onClear: () => void;
}

export function RequestsPanel({ requests, onClear }: RequestsPanelProps) {
    const [filter, setFilter] = useState<number | "all">("all");
    const filtered =
        filter === "all"
            ? requests
            : requests.filter((r) => Math.floor(r.statusCode / 100) === filter);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex gap-1">
                    {[
                        { value: "all", label: "All", count: requests.length },
                        {
                            value: 2,
                            label: "2xx",
                            count: requests.filter((r) => r.statusCode >= 200 && r.statusCode < 300)
                                .length,
                        },
                        {
                            value: 4,
                            label: "4xx",
                            count: requests.filter((r) => r.statusCode >= 400 && r.statusCode < 500)
                                .length,
                        },
                        {
                            value: 5,
                            label: "5xx",
                            count: requests.filter((r) => r.statusCode >= 500).length,
                        },
                    ].map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value as any)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${filter === f.value ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                        >
                            {f.label} ({f.count})
                        </button>
                    ))}
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] gap-1"
                    onClick={onClear}
                >
                    <X className="w-3 h-3" />
                    Clear
                </Button>
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {filtered.map((req) => (
                    <div
                        key={req.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors text-xs"
                    >
                        <span
                            className={`font-mono font-bold w-12 ${getStatusColor(req.statusCode)}`}
                        >
                            {req.statusCode}
                        </span>
                        <span className="font-mono font-semibold text-emerald-500 w-14">
                            {req.method}
                        </span>
                        <span className="font-mono text-foreground/80 flex-1 truncate">
                            {req.path}
                        </span>
                        <span className="text-muted-foreground text-[10px]">{req.ip}</span>
                        <span className="text-muted-foreground text-[10px]">{req.duration}</span>
                        <span className="text-muted-foreground text-[10px]">{req.timestamp}</span>
                        {req.body && (
                            <button className="p-1 rounded hover:bg-muted">
                                <Eye className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
