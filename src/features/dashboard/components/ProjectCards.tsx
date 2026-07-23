import { cn } from "@/core/lib/utils";

import { useState } from "react";

import { ExternalLink, Eye, Pin, PinOff, Play, Square, Terminal } from "lucide-react";
import { FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getProjectIcon } from "@/core/lib/project-icons";
import { projectService } from "@/features/projects/services/projectService";
import { Badge } from "@/components/ui/badge";

import { Project } from "../types";

export function ProjectCards({ projects: initial, onToggle }: { projects: Project[]; onToggle?: () => void }) {
    const navigate = useNavigate();
    const [projects, setProjects] = useState(initial);
    const [toggling, setToggling] = useState<string | null>(null);
    const toggle = async (id: string, type: string, path: string, status: string) => {
        setToggling(id);
        try {
            if (status === "running") {
                await projectService.stop(type, path);
                setProjects((p) => p.map((x) => (x.id === id ? { ...x, status: "stopped" } : x)));
            } else {
                await projectService.start(type, path);
                setProjects((p) => p.map((x) => (x.id === id ? { ...x, status: "running" } : x)));
            }
            onToggle?.();
        } catch {
            // ignore errors, keep optimistic UI
        } finally {
            setToggling(null);
        }
    };
    const togglePin = (id: string) =>
        setProjects((p) => p.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)));
    const sorted = [...projects].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    const visible = sorted.slice(0, 6);

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visible.map((p) => (
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
                                <div className="mt-0.5">
                                    {(() => {
                                        const Icon = getProjectIcon(p.type);
                                        return Icon ? <Icon className="w-5 h-5 shrink-0" /> : <FolderOpen className="w-5 h-5 shrink-0 text-muted-foreground" />;
                                    })()}
                                </div>
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
                                        toggle(p.id, p.type, p.path || "", p.status);
                                    }}
                                    disabled={toggling === p.id}
                                    className={cn(
                                        "flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors",
                                        p.status === "running"
                                            ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                            : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
                                        toggling === p.id && "opacity-50 cursor-wait"
                                    )}
                                >
                                    {toggling === p.id ? (
                                        <>
                                            <span className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            {p.status === "running" ? "Stopping" : "Starting"}
                                        </>
                                    ) : p.status === "running" ? (
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
            {projects.length > 6 && (
                <div className="mt-4 flex justify-center">
                    <button
                        onClick={() => navigate("/projects")}
                        className="text-xs px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        View all projects ({projects.length})
                    </button>
                </div>
            )}
        </div>
    );
}
