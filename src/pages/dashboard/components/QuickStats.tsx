import { Globe, Layers, Server } from "lucide-react";

import { cn } from "@/lib/utils";

export function QuickStats({ projects, services }: { projects: any[]; services: any[] }) {
    const running = projects.filter((p) => p.status === "running").length;
    const svcUp = services.filter((s) => s.status === "running").length;
    const svcErr = services.filter((s) => s.status === "error").length;

    const stats = [
        {
            label: "Projects",
            value: projects.length,
            sub: `${running} running`,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            icon: <Layers className="w-4 h-4" />,
        },
        {
            label: "Services",
            value: services.length,
            sub: `${svcUp} up · ${svcErr} error`,
            color: svcErr > 0 ? "text-red-500" : "text-emerald-500",
            bg: svcErr > 0 ? "bg-red-500/10" : "bg-emerald-500/10",
            icon: <Server className="w-4 h-4" />,
        },
        {
            label: "PHP Version",
            value: "8.3",
            sub: "default active",
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            icon: <span className="text-sm">🐘</span>,
        },
        {
            label: "Active Domains",
            value: 4,
            sub: "*.test · *.local",
            color: "text-cyan-500",
            bg: "bg-cyan-500/10",
            icon: <Globe className="w-4 h-4" />,
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((s) => (
                <div
                    key={s.label}
                    className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                >
                    <div
                        className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                            s.bg,
                            s.color
                        )}
                    >
                        {s.icon}
                    </div>
                    <div className="min-w-0">
                        <div className={cn("text-2xl font-bold tabular-nums", s.color)}>
                            {s.value}
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-tight">
                            {s.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 leading-tight">
                            {s.sub}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
