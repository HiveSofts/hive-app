import { CheckCircle2, Loader2, Square, Terminal, XCircle } from "lucide-react";

import { cn } from "@/core/lib/utils";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { InstallProgress } from "../types/package.types";

interface InstallProgressPanelProps {
    active: InstallProgress[];
    onCancel: () => void;
}

export function InstallProgressPanel({ active, onCancel }: InstallProgressPanelProps) {
    if (active.length === 0) return null;

    // The latest terminal event drives the overall state.
    const current = active[active.length - 1];
    const isRunning = !current.done;
    const finishedOk = current.done && current.success;
    const finishedErr = current.done && !current.success;

    const progress = current.progress ?? null;

    return (
        <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    {isRunning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    ) : finishedOk ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    ) : finishedErr ? (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                        <Terminal className="w-3.5 h-3.5 text-white/50" />
                    )}
                    <span className="text-xs font-medium truncate">
                        {current.message || current.step || current.action}
                    </span>
                    <span className="text-[10px] text-white/30 uppercase">{current.action}</span>
                </div>

                {isRunning && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onCancel}
                        className="h-6 text-[10px] gap-1 border-white/10 bg-white/5 text-white/70"
                    >
                        <Square className="w-2.5 h-2.5" />
                        Cancel
                    </Button>
                )}
            </div>

            {progress !== null && (
                <div className="h-0.5 w-full bg-white/5">
                    <div
                        className={cn(
                            "h-full transition-all duration-300",
                            finishedErr ? "bg-red-500/60" : "bg-blue-500/70"
                        )}
                        style={{ width: `${Math.max(2, Math.min(100, progress * 100))}%` }}
                    />
                </div>
            )}

            <ScrollArea className="h-40 px-3 py-2">
                <div className="font-mono text-[11px] leading-relaxed space-y-0.5">
                    {active.map((p, i) => (
                        <div
                            key={i}
                            className={cn(
                                p.is_stderr ? "text-red-300/80" : "text-white/50"
                            )}
                        >
                            {p.log ?? p.message}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
