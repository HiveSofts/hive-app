import { ArrowLeft, Play, RotateCcw, Square } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProjectHeaderProps {
    project: {
        name: string;
        type: string;
        version?: string;
        phpVersion?: string;
        nodeVersion?: string;
        port?: number;
    };
    status: "running" | "stopped";
    restarting: boolean;
    Icon: any;
    onRestart: () => void;
    onToggleStatus: () => void;
    onBack: () => void;
    serverUrl?: string | null;
    port?: number | null;
}

export function ProjectHeader({
    project,
    status,
    restarting,
    Icon,
    onRestart,
    onToggleStatus,
    onBack,
    serverUrl,
}: ProjectHeaderProps) {
    const versionBadge = project.phpVersion
        ? `PHP ${project.phpVersion}`
        : project.nodeVersion
          ? `Node ${project.nodeVersion}`
          : project.version
            ? `v${project.version}`
            : null;

    return (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-3">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="gap-1.5 text-muted-foreground hover:text-foreground h-7 px-2"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                </Button>

                <div className="h-4 w-px bg-border" />

                {Icon && <Icon className="w-5 h-5 shrink-0" />}

                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-sm">{project.name}</span>

                    {versionBadge && (
                        <Badge
                            variant="outline"
                            className="font-mono text-[10px] text-muted-foreground hidden sm:flex"
                        >
                            {versionBadge}
                        </Badge>
                    )}

                    <div className="flex items-center gap-1.5">
                        <span
                            className={`w-1.5 h-1.5 rounded-full ${
                                status === "running"
                                    ? "bg-emerald-500 animate-pulse"
                                    : "bg-zinc-500"
                            }`}
                        />
                        <span className="text-[11px] text-muted-foreground">
                            {status === "running" && serverUrl ? serverUrl : "stopped"}
                        </span>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-1.5">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={onRestart}
                        disabled={restarting}
                    >
                        {restarting ? (
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <RotateCcw className="w-3 h-3" />
                        )}
                        <span className="hidden sm:inline">Restart</span>
                    </Button>

                    <Button
                        size="sm"
                        onClick={onToggleStatus}
                        className={`h-7 text-xs gap-1 ${
                            status === "running"
                                ? "bg-red-500 hover:bg-red-600"
                                : "bg-emerald-600 hover:bg-emerald-700"
                        } text-white`}
                    >
                        {status === "running" ? (
                            <>
                                <Square className="w-3 h-3" />
                                Stop
                            </>
                        ) : (
                            <>
                                <Play className="w-3 h-3" />
                                Start
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
