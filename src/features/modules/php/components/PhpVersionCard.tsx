import { Download, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { PhpVersion } from "../types";

const versionBadgeColor = (v: string) =>
    ({
        "8.4": "border-violet-500/40 bg-violet-500/10 text-violet-400",
        "8.3": "border-amber-500/40 bg-amber-500/10 text-amber-400",
        "8.2": "border-blue-500/40 bg-blue-500/10 text-blue-400",
        "8.1": "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
    })[v] ?? "border-border bg-muted text-muted-foreground";

interface PhpVersionCardProps {
    ver: PhpVersion;
    onInstall: (id: string) => void;
    onSetDefault: (id: string) => void;
    onRemove: (id: string) => void;
}

export function PhpVersionCard({ ver, onInstall, onSetDefault, onRemove }: PhpVersionCardProps) {
    const installed = ver.state === "installed";
    const installing = ver.state === "installing";

    return (
        <div
            className={`relative rounded-2xl border p-5 transition-all duration-200 flex flex-col gap-4
            ${
                installed
                    ? ver.isDefault
                        ? "border-amber-500/50 bg-amber-500/5 shadow-sm shadow-amber-500/10"
                        : "border-border bg-card hover:border-border/80"
                    : "border-dashed border-border/60 bg-muted/20"
            }`}
        >
            {ver.isDefault && (
                <span className="absolute -top-2.5 left-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white tracking-wide uppercase">
                    Default
                </span>
            )}

            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={`font-mono text-sm px-2.5 py-0.5 font-bold ${versionBadgeColor(ver.minor)}`}
                        >
                            PHP {ver.minor}
                        </Badge>
                        {installed && (
                            <span className="text-xs text-muted-foreground font-mono">
                                {ver.patch}
                            </span>
                        )}
                    </div>
                    <div className="mt-2 space-y-0.5">
                        {installed ? (
                            <>
                                <p className="text-[11px] font-mono text-muted-foreground">
                                    {ver.installPath}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    Installed {ver.installedAt}
                                </p>
                            </>
                        ) : (
                            <p className="text-[11px] text-muted-foreground">
                                {ver.downloadSize} download
                            </p>
                        )}
                    </div>
                </div>
                <div
                    className={`w-2.5 h-2.5 rounded-full mt-1 ${installed ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-zinc-600"}`}
                />
            </div>

            {installing && typeof ver.progress === "number" && (
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Downloading & extracting...</span>
                        <span>{ver.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-300"
                            style={{ width: `${ver.progress}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="flex gap-2 mt-auto">
                {!installed && !installing && (
                    <Button
                        onClick={() => onInstall(ver.id)}
                        size="sm"
                        className="flex-1 h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Install PHP {ver.minor}
                    </Button>
                )}
                {installing && (
                    <Button disabled size="sm" className="flex-1 h-8 text-xs gap-1.5">
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Installing...
                    </Button>
                )}
                {installed && !ver.isDefault && (
                    <Button
                        onClick={() => onSetDefault(ver.id)}
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs gap-1.5 text-amber-600 border-amber-500/40 hover:bg-amber-500/10 hover:border-amber-500"
                    >
                        <Star className="w-3.5 h-3.5" />
                        Set Default
                    </Button>
                )}
                {installed && ver.isDefault && (
                    <div className="flex-1 flex items-center justify-center gap-1.5 text-xs text-amber-500 font-medium">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        Active Default
                    </div>
                )}
                {installed && !ver.isDefault && (
                    <Button
                        onClick={() => onRemove(ver.id)}
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-red-500 border-red-500/30 hover:bg-red-500/10 hover:border-red-500"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                )}
            </div>
        </div>
    );
}
