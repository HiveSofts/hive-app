import { CheckCircle2, Download, Globe, Package, RefreshCw, Trash2 } from "lucide-react";

import { cn } from "@/core/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { SearchResult } from "../types/package.types";
import { managerLabel } from "../utils/manager.utils";

export type ResultAction = "install" | "update" | "uninstall";

interface ResultCardProps {
    result: SearchResult;
    onInstall: (r: SearchResult) => void;
    onUpdate: (r: SearchResult) => void;
    onUninstall: (r: SearchResult) => void;
    disabled?: boolean;
    onClick?: () => void;
}

export function ResultCard({
    result,
    onInstall,
    onUpdate,
    onUninstall,
    disabled,
    onClick,
}: ResultCardProps) {
    const version = result.installed_version ?? result.available_versions[0] ?? null;

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "group flex flex-col text-left gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3.5",
                "hover:border-white/20 hover:bg-white/[0.04] transition-colors",
                "focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            )}
        >
            <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-white/70" />
                </div>

                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-medium truncate" title={result.name}>
                            {result.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap min-w-0">
                        {result.is_installed && (
                            <Badge
                                variant="outline"
                                title={result.installed_version ?? "installed"}
                                className="text-[10px] px-1.5 py-0 h-4 border-green-500/30 text-green-400 min-w-0"
                            >
                                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                                <span className="truncate">{result.installed_version ?? "installed"}</span>
                            </Badge>
                        )}
                        <Badge
                            variant="outline"
                            title={`via ${managerLabel(result.source_manager)}`}
                            className="text-[10px] px-1.5 py-0 h-4 border-white/15 text-white/50 min-w-0"
                        >
                            <span className="truncate">via {managerLabel(result.source_manager)}</span>
                        </Badge>
                        {result.index_source === "remote" ? (
                            <Badge
                                variant="outline"
                                title="Resolved live from the remote source — reflects the newest available package."
                                className="text-[10px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-400"
                            >
                                live
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                title="From the local cached index — works offline but may be stale until you refresh."
                                className="text-[10px] px-1.5 py-0 h-4 border-white/15 text-white/40"
                            >
                                cached
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <p className="text-[12px] text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                {result.description || "No description available."}
            </p>

            <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    {version && (
                        <span className="text-[11px] text-white/40 truncate" title={`v${version}`}>
                            v{version}
                        </span>
                    )}
                    {result.homepage_url && (
                        <a
                            href={result.homepage_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors truncate min-w-0"
                            title={result.homepage_url}
                        >
                            <Globe className="w-2.5 h-2.5 shrink-0" />
                            site
                        </a>
                    )}
                </div>

                {result.is_installed ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={disabled}
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdate(result);
                            }}
                            className="h-7 text-[11px] gap-1 border-white/10 bg-white/5"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Update
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={disabled}
                            onClick={(e) => {
                                e.stopPropagation();
                                onUninstall(result);
                            }}
                            className="h-7 text-[11px] gap-1 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                ) : (
                    <Button
                        size="sm"
                        disabled={disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            onInstall(result);
                        }}
                        className="h-7 text-[11px] gap-1 shrink-0"
                    >
                        <Download className="w-3 h-3" />
                        Install
                    </Button>
                )}
            </div>
        </button>
    );
}
