import { cn } from "@/core/lib/utils";

import { useState } from "react";

import { Play, RotateCcw, Square } from "lucide-react";

import { Service } from "../types";

const serviceColor: Record<Service["status"], string> = {
    running: "bg-emerald-500",
    stopped: "bg-zinc-400",
    error: "bg-red-500",
};

export function ServicesPanel({ services: initial }: { services: Service[] }) {
    const [services, setServices] = useState(initial);
    const toggle = (id: string) =>
        setServices((s) =>
            s.map((x) => {
                if (x.id !== id) return x;
                if (x.status === "running") return { ...x, status: "stopped" as const };
                if (x.status === "stopped") return { ...x, status: "running" as const };
                return { ...x, status: "stopped" as const };
            })
        );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {services.map((svc) => (
                <div
                    key={svc.id}
                    className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                    <span
                        className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            serviceColor[svc.status],
                            svc.status === "running" ? "animate-pulse" : ""
                        )}
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{svc.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                                v{svc.version}
                            </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                            :{svc.port} · {svc.mem}
                        </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <button
                            onClick={() => toggle(svc.id)}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                            {svc.status === "running" ? (
                                <Square className="w-3 h-3" />
                            ) : (
                                <Play className="w-3 h-3" />
                            )}
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
