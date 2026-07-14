import { memo } from "react";

import {
    Calendar,
    ExternalLink,
    FileCode2,
    FolderOpen,
    Globe,
    Package,
    Tag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { MetricsPanel } from "../laravel/MetricsPanel";
import { ReadmePanel } from "../laravel/ReadmePanel";

interface ReactOverviewPanelProps {
    projectPath: string;
    projectName?: string;
    projectType?: string;
    version?: string;
    packageManager?: string;
    nodeVersion?: string;
    host?: string;
    port?: number;
    description?: string;
    github_repo?: string;
    created_at?: string;
}

export const ReactOverviewPanel = memo(function ReactOverviewPanel({
    projectPath,
    packageManager,
    nodeVersion,
    host,
    port,
    description,
    github_repo,
    created_at,
}: ReactOverviewPanelProps) {
    const serverUrl = host && port ? `http://${host}:${port}` : null;

    const formattedDate = created_at
        ? new Date(created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : null;

    return (
        <div className="space-y-4">
            <MetricsPanel projectPath={projectPath} />

            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                        Project Properties
                    </span>
                </div>

                <div className="p-4 space-y-4">
                    {description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {description}
                        </p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">
                                Package Manager
                            </span>
                            <span className="font-mono font-medium">
                                {packageManager ? (
                                    <span className="capitalize">{packageManager}</span>
                                ) : (
                                    "—"
                                )}
                            </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">
                                Node Version
                            </span>
                            <span className="font-mono font-medium">
                                {nodeVersion ? `Node ${nodeVersion}` : "—"}
                            </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">
                                Project Path
                            </span>
                            <span className="font-mono font-medium truncate">
                                {projectPath}
                            </span>
                        </div>

                        {serverUrl && (
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] text-muted-foreground">
                                    Dev Server
                                </span>
                                <a
                                    href={serverUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-mono font-medium text-indigo-500 hover:underline flex items-center gap-1"
                                >
                                    {serverUrl}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}

                        {formattedDate && (
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] text-muted-foreground">
                                    Created
                                </span>
                                <span className="font-medium">{formattedDate}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1 border-t">
                        {packageManager && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 font-mono text-indigo-500 border-indigo-500/30 bg-indigo-500/10"
                            >
                                <Package className="w-3 h-3" />
                                <span className="capitalize">{packageManager}</span>
                            </Badge>
                        )}
                        {nodeVersion && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 font-mono text-amber-500 border-amber-500/30 bg-amber-500/10"
                            >
                                <FileCode2 className="w-3 h-3" />
                                Node {nodeVersion}
                            </Badge>
                        )}
                        {port && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 font-mono text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                            >
                                <Globe className="w-3 h-3" />:{port}
                            </Badge>
                        )}
                        {created_at && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 font-mono text-muted-foreground"
                            >
                                <Calendar className="w-3 h-3" />
                                {formattedDate}
                            </Badge>
                        )}
                        {github_repo && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 font-mono text-muted-foreground max-w-xs"
                            >
                                <FolderOpen className="w-3 h-3 shrink-0" />
                                <span className="truncate">{github_repo}</span>
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <ReadmePanel projectPath={projectPath} />
        </div>
    );
});