import { Play, RotateCcw, Square } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { DatabaseService } from "../types";

interface ServiceCardProps {
    service: DatabaseService;
    onStart: (id: string) => void;
    onStop: (id: string) => void;
    onRestart: (id: string) => void;
}

export function ServiceCard({ service, onStart, onStop, onRestart }: ServiceCardProps) {
    const IconComponent = service.icon;

    const statusColor = {
        running: {
            bg: "bg-emerald-500",
            text: "text-emerald-500",
            border: "border-emerald-500/30",
            badge: "bg-emerald-500/10 text-emerald-500",
        },
        stopped: {
            bg: "bg-zinc-400",
            text: "text-zinc-400",
            border: "border-zinc-500/30",
            badge: "bg-zinc-500/10 text-zinc-400",
        },
        error: {
            bg: "bg-red-500",
            text: "text-red-500",
            border: "border-red-500/30",
            badge: "bg-red-500/10 text-red-500",
        },
    }[service.status];

    return (
        <div
            className={`rounded-xl border bg-card p-5 transition-all hover:shadow-md ${statusColor.border}`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                        <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-base">{service.name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                                {service.version}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-muted-foreground font-mono">
                                :{service.port}
                            </span>
                            <Badge className={`text-[9px] px-1.5 py-0 ${statusColor.badge}`}>
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${statusColor.bg} mr-1 inline-block ${service.status === "running" ? "animate-pulse" : ""}`}
                                />
                                {service.status}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onStart(service.id)}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors"
                        disabled={service.status === "running"}
                    >
                        <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onStop(service.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                        disabled={service.status === "stopped"}
                    >
                        <Square className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onRestart(service.id)}
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Memory</div>
                    <div className="text-xs font-mono font-semibold">{service.memory}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">CPU</div>
                    <div className="text-xs font-mono font-semibold">{service.cpu}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Uptime</div>
                    <div className="text-xs font-mono font-semibold">{service.uptime}</div>
                </div>
            </div>

            {service.status === "running" && (
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>📊 {service.dataSize} data</span>
                    <span>🔗 {service.connections} connections</span>
                </div>
            )}
        </div>
    );
}
