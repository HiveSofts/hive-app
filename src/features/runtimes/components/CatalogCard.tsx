import { CheckCircle2, Download, RefreshCw, SearchX, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { CatalogTool, PackageManagerKind } from "../types/package.types";
import { managerLabel } from "../utils/manager.utils";

interface CatalogCardProps {
    tool: CatalogTool;
    status?: { installed: boolean; version: string | null };
    detected?: PackageManagerKind;
    busy?: boolean;
    onInstall: (t: CatalogTool, version?: string) => void;
    onUpdate: (t: CatalogTool) => void;
    onUninstall: (t: CatalogTool) => void;
    onSearch: (name: string) => void;
}

export function CatalogCard({
    tool,
    status,
    detected,
    busy,
    onInstall,
    onUpdate,
    onUninstall,
    onSearch,
}: CatalogCardProps) {
    const installed = status?.installed ?? false;
    const version = status?.version ?? null;
    // Best manager label for this tool on this host (if a catalog row matches).
    const managerRow = detected ? tool.packages.find((p) => p.manager === detected) : undefined;
    const managerTag = managerRow ? managerLabel(detected!) : "static";

    return (
        <div className="group flex flex-col gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 hover:border-white/20 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
                    {tool.icon}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-medium truncate" title={tool.name}>
                            {tool.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap min-w-0">
                        {installed && (
                            <Badge
                                variant="outline"
                                title={version ?? "installed"}
                                className="text-[10px] px-1.5 py-0 h-4 border-green-500/30 text-green-400 min-w-0"
                            >
                                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                                <span className="truncate">{version ?? "installed"}</span>
                            </Badge>
                        )}
                        <Badge
                            variant="outline"
                            title={managerTag}
                            className="text-[10px] px-1.5 py-0 h-4 border-white/15 text-white/50 min-w-0"
                        >
                            <span className="truncate">{managerTag}</span>
                        </Badge>
                    </div>
                </div>
            </div>

            <p className="text-[12px] text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                {tool.description}
            </p>

            <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                <button
                    onClick={() => onSearch(tool.name)}
                    className="text-[11px] text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors"
                >
                    <SearchX className="w-2.5 h-2.5" />
                    Search live
                </button>

                {installed ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => onUpdate(tool)}
                            className="h-7 text-[11px] gap-1 border-white/10 bg-white/5"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Update
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => onUninstall(tool)}
                            className="h-7 text-[11px] gap-1 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        >
                                <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                ) : (
                    <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => onInstall(tool)}
                        className="h-7 text-[11px] gap-1 shrink-0"
                    >
                        <Download className="w-3 h-3" />
                        Install
                    </Button>
                )}
            </div>
        </div>
    );
}
