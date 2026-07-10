import { memo } from "react";

import { Database, ExternalLink, FolderOpen, Globe, Mail, Server, Tag, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { MetricsPanel } from "../laravel/MetricsPanel";

interface WordPressOverviewPanelProps {
    projectPath: string;
    projectName?: string;
    projectType?: string;
    version?: string;
    host?: string;
    port?: number;
    description?: string;
    sourceType?: string;
    githubRepo?: string;
    created_at?: string;
    dbDriver?: string;
    dbName?: string;
    dbUser?: string;
    dbHost?: string;
    dbPort?: number;
    siteTitle?: string;
    siteUrl?: string;
    adminUser?: string;
    adminEmail?: string;
}

const SOURCE_LABELS: Record<string, string> = {
    wordpress_org: "WordPress.org",
    github_clone: "GitHub Clone",
    github_zip: "GitHub ZIP",
};

export const WordPressOverviewPanel = memo(function WordPressOverviewPanel({
    projectPath,
    version,
    host,
    port,
    description,
    sourceType,
    githubRepo,
    created_at,
    dbDriver,
    dbName,
    dbUser,
    dbHost,
    dbPort,
    siteTitle,
    siteUrl,
    adminUser,
    adminEmail,
}: WordPressOverviewPanelProps) {
    const serverUrl = siteUrl || (host && port ? `http://${host}:${port}` : null);

    const formattedDate = created_at
        ? new Date(created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : null;

    const sourceLabel = sourceType ? SOURCE_LABELS[sourceType] || sourceType : "—";

    return (
        <div className="space-y-4">
            <MetricsPanel projectPath={projectPath} />

            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                        Site Properties
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
                            <span className="text-[11px] text-muted-foreground">WordPress</span>
                            <span className="font-mono font-medium">
                                {version ? `v${version}` : "—"}
                            </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">Site Title</span>
                            <span className="font-medium truncate">{siteTitle || "—"}</span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">Source</span>
                            <span className="font-medium">{sourceLabel}</span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">Database</span>
                            <span className="font-mono font-medium truncate">
                                {dbDriver ? <span className="capitalize">{dbDriver}</span> : "—"}
                                {dbName ? ` · ${dbName}` : ""}
                            </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">DB Host</span>
                            <span className="font-mono font-medium truncate">
                                {dbHost ? `${dbHost}:${dbPort ?? ""}` : "—"}
                            </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">DB User</span>
                            <span className="font-mono font-medium truncate">{dbUser || "—"}</span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">Admin User</span>
                            <span className="font-mono font-medium truncate">
                                {adminUser || "—"}
                            </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">Admin Email</span>
                            <span className="font-medium truncate">{adminEmail || "—"}</span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">Project Path</span>
                            <span className="font-mono font-medium truncate">{projectPath}</span>
                        </div>

                        {serverUrl && (
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] text-muted-foreground">Site URL</span>
                                <a
                                    href={serverUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-mono font-medium text-indigo-500 hover:underline flex items-center gap-1 truncate"
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
                        {version && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 font-mono text-amber-500 border-amber-500/30 bg-amber-500/10"
                            >
                                <Tag className="w-3 h-3" />
                                WordPress {version}
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
                        {dbDriver && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 font-mono text-sky-500 border-sky-500/30 bg-sky-500/10"
                            >
                                <Database className="w-3 h-3" />
                                <span className="capitalize">{dbDriver}</span>
                            </Badge>
                        )}
                        {adminUser && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 font-mono text-muted-foreground"
                            >
                                <User className="w-3 h-3" />
                                {adminUser}
                            </Badge>
                        )}
                        {adminEmail && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 font-mono text-muted-foreground"
                            >
                                <Mail className="w-3 h-3" />
                                {adminEmail}
                            </Badge>
                        )}
                        {sourceType && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 font-mono text-muted-foreground"
                            >
                                <Server className="w-3 h-3" />
                                {sourceLabel}
                            </Badge>
                        )}
                        {githubRepo && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 font-mono text-muted-foreground max-w-xs"
                            >
                                <FolderOpen className="w-3 h-3 shrink-0" />
                                <span className="truncate">{githubRepo}</span>
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
