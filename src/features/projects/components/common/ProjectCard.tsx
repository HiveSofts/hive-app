// src/features/projects/components/common/ProjectCard.tsx
import { ChevronRight, Server, Terminal, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { PROJECT_TYPE_CONFIG } from "../../config";
import { Project } from "../../types";

interface ProjectCardProps {
    project: Project;
    onDelete: (project: Project) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
    const navigate = useNavigate();
    const projectType = project.type || "html5";
    const config = PROJECT_TYPE_CONFIG[projectType] || PROJECT_TYPE_CONFIG["html5"];

    const handleClick = () => {
        navigate(`/projects/${project.id}`);
    };

    const IconComponent = config.icon;

    return (
        <div
            onClick={handleClick}
            className={`group relative rounded-xl border transition-all duration-200 cursor-pointer ${config.color}`}
        >
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="shrink-0">
                            <IconComponent className="w-8 h-8" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm truncate">
                                    {project.name}
                                </span>
                                {project.status === "running" && (
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    </span>
                                )}
                            </div>
                            <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 font-mono mt-0.5 ${config.badge}`}
                            >
                                {projectType}
                            </Badge>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(project);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-muted-foreground"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                <p className="text-[11px] font-mono text-muted-foreground truncate mb-2">
                    {project.path}
                </p>

                {project.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
                        {project.description}
                    </p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    {project.package_manager && (
                        <span className="font-mono">{project.package_manager}</span>
                    )}
                    {project.version && <span className="font-mono">v{project.version}</span>}
                    {project.created_at && (
                        <span>
                            {new Date(project.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            })}
                        </span>
                    )}
                </div>

                <div className="flex gap-2 mt-3">
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs gap-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Server className="w-3 h-3" />
                        {project.status === "running" ? "Stop" : "Start"}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs gap-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Terminal className="w-3 h-3" />
                        Terminal
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ChevronRight className="w-3 h-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
