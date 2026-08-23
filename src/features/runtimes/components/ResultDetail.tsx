import { useCallback, useEffect, useState } from "react";

import {
    AlertTriangle,
    CheckCircle2,
    Download,
    Globe,
    Loader2,
    RefreshCw,
    Terminal,
    Trash2,
} from "lucide-react";

import { cn } from "@/core/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    getSystemPackageDetails,
} from "../services/toolManager.service";
import type { PackageDetails, SearchResult } from "../types/package.types";
import { managerLabel } from "../utils/manager.utils";

interface ResultDetailProps {
    result: SearchResult | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInstall: (r: SearchResult, version?: string) => void;
    onUpdate: (r: SearchResult) => void;
    onUninstall: (r: SearchResult) => void;
    busy?: boolean;
    elevationRequired?: boolean;
}

export function ResultDetail({
    result,
    open,
    onOpenChange,
    onInstall,
    onUpdate,
    onUninstall,
    busy,
    elevationRequired,
}: ResultDetailProps) {
    const [details, setDetails] = useState<PackageDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [version, setVersion] = useState<string>("");

    const load = useCallback(async () => {
        if (!result) return;
        setLoading(true);
        setDetails(null);
        try {
            const d = await getSystemPackageDetails(result.source_manager, result.name);
            setDetails(d);
            const def = d?.installed_version ?? d?.all_versions[0] ?? "";
            setVersion(def);
        } catch {
            setDetails(null);
        } finally {
            setLoading(false);
        }
    }, [result]);

    useEffect(() => {
        if (open && result) void load();
    }, [open, result, load]);

    if (!result) return null;

    const versions = details?.all_versions?.length
        ? details.all_versions
        : result.available_versions;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg bg-[#0c0c0f] border-white/10">
                <DialogHeader>
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <DialogTitle
                            className="text-base break-words min-w-0"
                            title={result.name}
                        >
                            {result.name}
                        </DialogTitle>
                        {result.is_installed && (
                            <Badge
                                variant="outline"
                                title={result.installed_version ?? "installed"}
                                className="text-[10px] border-green-500/30 text-green-400 min-w-0 shrink-0"
                            >
                                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                                <span className="truncate">{result.installed_version ?? "installed"}</span>
                            </Badge>
                        )}
                        <Badge
                            variant="outline"
                            title={`via ${managerLabel(result.source_manager)}`}
                            className="text-[10px] border-white/15 text-white/50 min-w-0 shrink-0"
                        >
                            <span className="truncate">via {managerLabel(result.source_manager)}</span>
                        </Badge>
                    </div>
                    <DialogDescription className="text-[12px] text-muted-foreground">
                        {details?.description || result.description || "No description available."}
                    </DialogDescription>
                </DialogHeader>

                {elevationRequired && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                            This action requires administrator privileges. Hive will prompt you
                            via your system elevation helper (pkexec / sudo / UAC).
                        </span>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {versions.length > 0 && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] text-white/50">Version</label>
                                <Select value={version} onValueChange={setVersion}>
                                    <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
                                        <SelectValue placeholder="Latest" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {versions.map((v) => (
                                            <SelectItem key={v} value={v} className="text-xs">
                                                {v}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {(details?.homepage_url || result.homepage_url) && (
                            <a
                                href={details?.homepage_url ?? result.homepage_url ?? "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors"
                            >
                                <Globe className="w-2.5 h-2.5" />
                                {details?.homepage_url ?? result.homepage_url}
                            </a>
                        )}

                        {details?.exact_command && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] text-white/50 flex items-center gap-1.5">
                                    <Terminal className="w-3 h-3" />
                                    Exact command
                                </label>
                                <div className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 font-mono text-[11px] text-white/70 break-all">
                                    {details.exact_command}
                                </div>
                            </div>
                        )}

                        {details?.license && (
                            <div className="flex items-center gap-2 text-[11px] text-white/40">
                                <span>License:</span>
                                <span className="text-white/60">{details.license}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                    {result.is_installed ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => onUpdate(result)}
                                className="h-8 text-xs gap-1.5 border-white/10 bg-white/5"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Update
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => onUninstall(result)}
                                className="h-8 text-xs gap-1.5 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Uninstall
                            </Button>
                        </>
                    ) : (
                        <Button
                            size="sm"
                            disabled={busy || loading}
                            onClick={() => onInstall(result, version || undefined)}
                            className={cn("h-8 text-xs gap-1.5")}
                        >
                            <Download className="w-3.5 h-3.5" />
                            Install{version ? ` ${version}` : ""}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
