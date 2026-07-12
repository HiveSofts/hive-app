import { memo } from "react";

import { ExternalLink, FileCode2, FolderOpen, Globe, Hash, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { MetricsPanel } from "../laravel/MetricsPanel";
import { ReadmePanel } from "../laravel/ReadmePanel";

interface StaticOverviewPanelProps {
    projectPath: string;
    projectName?: string;
    projectType?: string;
    version?: string;
    index_path?: string;
    host?: string;
    port?: number;
    description?: string;
    github_repo?: string;
    created_at?: string;
}

export const StaticOverviewPanel = memo(function StaticOverviewPanel({
    projectPath,
    index_path,
    host,
    port,
    description,
    github_repo,
    created_at,
}: StaticOverviewPanelProps) {
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
                            <span className="text-[11px] text-muted-foreground">Project Type</span>
                            <span className="font-mono font-medium">Static HTML/CSS/JS</span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">Index File</span>
                            <span className="font-mono font-medium">{index_path ?? "—"}</span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">Project Path</span>
                            <span className="font-mono font-medium truncate">{projectPath}</span>
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
                                <span className="text-[11px] text-muted-foreground">Created</span>
                                <span className="font-medium">{formattedDate}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1 border-t">
                        <Badge
                            variant="outline"
                            className="gap-1.5 font-mono text-blue-500 border-blue-500/30 bg-blue-500/10"
                        >
                            <Hash className="w-3 h-3" />
                            Static HTML
                        </Badge>
                        {index_path && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 font-mono text-muted-foreground"
                            >
                                <FileCode2 className="w-3 h-3" />
                                {index_path}
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