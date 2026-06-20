import { cn } from "@/core/lib/utils";

import { useState } from "react";

import { ExternalLink, Eye, Pin, PinOff, Play, Square, Terminal } from "lucide-react";
import { FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DockerIcon } from "@/components/icons/DockerIcon";
import { LaravelIcon } from "@/components/icons/LaravelIcon";
import { NextjsIcon } from "@/components/icons/NextjsIcon";
import { ReactIcon } from "@/components/icons/ReactIcon";
import { VueIcon } from "@/components/icons/VueIcon";
import { Badge } from "@/components/ui/badge";

const projectIcon = (type: string) => {
    const cls = "w-5 h-5 shrink-0";
    switch (type) {
        case "laravel":
            return <LaravelIcon className={cls} />;
        case "react":
            return <ReactIcon className={cls} />;
        case "vue":
            return <VueIcon className={cls} />;
        case "nextjs":
            return <NextjsIcon className={cls} />;
        case "docker":
            return <DockerIcon className={cls} />;
        default:
            return <FolderOpen className={cn(cls, "text-muted-foreground")} />;
    }
};

export function ProjectCards({ projects: initial }: { projects: any[] }) {
    const navigate = useNavigate();
    const [projects, setProjects] = useState(initial);
    const toggle = (id: number) =>
        setProjects((p) =>
            p.map((x) =>
                x.id === id ? { ...x, status: x.status === "running" ? "stopped" : "running" } : x
            )
        );
    const togglePin = (id: number) =>
        setProjects((p) => p.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)));
    const sorted = [...projects].sort((a, b) => Number(b.pinned) - Number(a.pinned));

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map((p) => (
                <div
                    key={p.id}
                    className="group relative rounded-xl border bg-card hover:bg-muted/20 transition-all cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/projects/${p.id}`)}
                >
                    {p.pinned && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-amber-400/80 to-amber-500/60" />
                    )}
                    <div className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">{projectIcon(p.type)}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-sm truncate">{p.name}</span>
                                    {p.pinned && (
                                        <Pin className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                            p.status === "running"
                                                ? "bg-emerald-500 animate-pulse"
                                                : "bg-zinc-400"
                                        )}
                                    />
                                    <span className="text-[11px] text-muted-foreground font-mono truncate">
                                        {p.status === "running" ? p.url : "stopped"}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePin(p.id);
                                    }}
                                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {p.pinned ? (
                                        <PinOff className="w-3 h-3" />
                                    ) : (
                                        <Pin className="w-3 h-3" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                            <Badge
                                variant="outline"
                                className="text-[10px] font-mono px-1.5 py-0 text-muted-foreground"
                            >
                                {p.php}
                            </Badge>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <ExternalLink className="w-3 h-3" />
                                </button>
                                <button className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <Terminal className="w-3 h-3" />
                                </button>
                                <button className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <Eye className="w-3 h-3" />
                                </button>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggle(p.id);
                                }}
                                className={cn(
                                    "flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors",
                                    p.status === "running"
                                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                        : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                )}
                            >
                                {p.status === "running" ? (
                                    <>
                                        <Square className="w-2.5 h-2.5" />
                                        Stop
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-2.5 h-2.5" />
                                        Start
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
