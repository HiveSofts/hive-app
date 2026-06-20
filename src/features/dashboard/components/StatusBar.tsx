import { cn } from "@/core/lib/utils";

import { Cpu, MemoryStick, Network, RefreshCw, RotateCcw, Terminal, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

import { HiveHealth } from "../types";

export function StatusBar({
    health,
    metrics,
    onRefresh,
    refreshing,
}: {
    health: HiveHealth;
    metrics: { cpu: number; ram: number; net_in: number; net_out: number }[];
    onRefresh: () => void;
    refreshing: boolean;
}) {
    const latest = metrics[metrics.length - 1];
    const healthConfig = {
        ok: {
            label: "All systems operational",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10 border-emerald-500/20",
            dot: "bg-emerald-500 animate-pulse",
        },
        warn: {
            label: "Needs attention",
            color: "text-yellow-500",
            bg: "bg-yellow-500/10 border-yellow-500/20",
            dot: "bg-yellow-500 animate-pulse",
        },
        error: {
            label: "Service error detected",
            color: "text-red-500",
            bg: "bg-red-500/10 border-red-500/20",
            dot: "bg-red-500 animate-pulse",
        },
    }[health];

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <div
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium",
                    healthConfig.bg,
                    healthConfig.color
                )}
            >
                <span className={cn("w-1.5 h-1.5 rounded-full", healthConfig.dot)} />
                {healthConfig.label}
            </div>

            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border bg-muted/30 text-xs gap-3">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Cpu className="w-3 h-3" />
                    <span className="font-mono font-semibold text-foreground">{latest.cpu}%</span>
                </span>
                <span className="w-px h-3 bg-border" />
                <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MemoryStick className="w-3 h-3" />
                    <span className="font-mono font-semibold text-foreground">{latest.ram} MB</span>
                </span>
                <span className="w-px h-3 bg-border" />
                <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Network className="w-3 h-3" />
                    <span className="font-mono font-semibold text-foreground">
                        ↑{latest.net_out} ↓{latest.net_in} KB/s
                    </span>
                </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    onClick={onRefresh}
                    disabled={refreshing}
                >
                    <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
                    Refresh
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                    <Terminal className="w-3 h-3" />
                    Global Terminal
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                    <RotateCcw className="w-3 h-3" />
                    Restart All
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                    <Zap className="w-3 h-3" />
                    Clear Caches
                </Button>
            </div>
        </div>
    );
}
