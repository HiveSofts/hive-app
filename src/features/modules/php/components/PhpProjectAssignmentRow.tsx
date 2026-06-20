import { useState } from "react";

import { ChevronDown, RotateCcw, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { PhpVersion, Project } from "../types";

const versionBadgeColor = (v: string) =>
    ({
        "8.4": "border-violet-500/40 bg-violet-500/10 text-violet-400",
        "8.3": "border-amber-500/40 bg-amber-500/10 text-amber-400",
        "8.2": "border-blue-500/40 bg-blue-500/10 text-blue-400",
        "8.1": "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
    })[v] ?? "border-border bg-muted text-muted-foreground";

interface PhpProjectAssignmentRowProps {
    project: Project;
    versions: PhpVersion[];
    defaultVersion: string;
}

export function PhpProjectAssignmentRow({
    project,
    versions,
    defaultVersion,
}: PhpProjectAssignmentRowProps) {
    const [selected, setSelected] = useState<string | null>(project.phpVersion);
    const [open, setOpen] = useState(false);
    const installed = versions.filter((v) => v.state === "installed");
    const effectiveVersion = selected ?? defaultVersion;
    const isUsingDefault = selected === null;

    return (
        <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors border-b last:border-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{project.name}</div>
                <div className="text-[11px] text-muted-foreground font-mono">
                    ~/Projects/{project.name}
                </div>
            </div>

            <div className="relative shrink-0">
                <button
                    onClick={() => setOpen((o) => !o)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors
                        ${isUsingDefault ? "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400" : "border-border bg-muted/40 hover:bg-muted"}`}
                >
                    <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 font-mono font-bold ${versionBadgeColor(effectiveVersion)}`}
                    >
                        {effectiveVersion}
                    </Badge>
                    {isUsingDefault && <span className="text-muted-foreground">(default)</span>}
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                {open && (
                    <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border bg-popover shadow-lg z-20 overflow-hidden">
                        <div className="p-1 space-y-0.5">
                            <button
                                onClick={() => {
                                    setSelected(null);
                                    setOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left hover:bg-muted transition-colors ${isUsingDefault ? "bg-muted" : ""}`}
                            >
                                <Star className="w-3 h-3 text-amber-500" />
                                Use Default ({defaultVersion})
                            </button>
                            {installed.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => {
                                        setSelected(v.minor);
                                        setOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left hover:bg-muted transition-colors ${selected === v.minor ? "bg-muted" : ""}`}
                                >
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${versionBadgeColor(v.minor).includes("amber") ? "bg-amber-500" : versionBadgeColor(v.minor).includes("blue") ? "bg-blue-500" : "bg-violet-500"}`}
                                    />
                                    PHP {v.minor} ({v.patch})
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {!isUsingDefault && (
                <button
                    onClick={() => setSelected(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Reset to default"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}
