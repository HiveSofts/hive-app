import { useState } from "react";

import {
    Activity,
    Copy,
    ExternalLink,
    Loader2,
    Play,
    RotateCcw,
    Square,
    Terminal,
    Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { DB_PRESETS } from "../services/config/dbPresets";
import { ContainerInfo } from "../services/types";

interface Props {
    container: ContainerInfo;
    onStart: (name: string) => Promise<void>;
    onStop: (name: string) => Promise<void>;
    onRestart: (name: string) => Promise<void>;
    onRemove: (name: string, removeVolume: boolean) => Promise<void>;
    onViewLogs: (name: string) => void;
}

function getPresetForImage(image: string) {
    const lower = image.toLowerCase();
    return (
        DB_PRESETS.find((p) => lower.includes(p.id)) ||
        DB_PRESETS.find((p) => lower.includes("postgres") && p.id === "postgresql") ||
        null
    );
}

function getStateColor(state: string) {
    switch (state) {
        case "running":
            return {
                dot: "bg-emerald-500",
                badge: "text-emerald-500 border-emerald-500/30",
                border: "border-emerald-500/20",
            };
        case "exited":
            return {
                dot: "bg-zinc-400",
                badge: "text-zinc-400 border-zinc-500/30",
                border: "border-zinc-500/20",
            };
        default:
            return {
                dot: "bg-amber-500",
                badge: "text-amber-500 border-amber-500/30",
                border: "border-amber-500/20",
            };
    }
}

export function ContainerCard({
    container,
    onStart,
    onStop,
    onRestart,
    onRemove,
    onViewLogs,
}: Props) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [copied, setCopied] = useState(false);

    const preset = getPresetForImage(container.image);
    const colors = getStateColor(container.state);
    const isRunning = container.state === "running";
    const port = container.ports[0]?.host_port;

    const action = async (label: string, fn: () => Promise<void>) => {
        setActionLoading(label);
        try {
            await fn();
        } catch (error) {
            toast.error(`Failed to ${label.toLowerCase()}: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setActionLoading(null);
        }
    };

    const copyPort = () => {
        if (!port) return;
        navigator.clipboard.writeText(String(port));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div
            className={`rounded-xl border bg-card p-4 transition-all hover:shadow-md ${colors.border}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={
                            preset
                                ? {
                                      backgroundColor: preset.color + "20",
                                      border: `1px solid ${preset.color}30`,
                                  }
                                : {}
                        }
                    >
                        {preset ? preset.icon : "🗄️"}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm leading-tight">
                                {container.name}
                            </span>
                            <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 py-0 ${colors.badge}`}
                            >
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${colors.dot} mr-1 inline-block ${isRunning ? "animate-pulse" : ""}`}
                                />
                                {container.state}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-muted-foreground font-mono">
                                {container.image}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-0.5">
                    <button
                        onClick={() => action("start", () => onStart(container.name))}
                        disabled={isRunning || !!actionLoading}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 disabled:opacity-30 transition-colors"
                    >
                        {actionLoading === "start" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Play className="w-3.5 h-3.5" />
                        )}
                    </button>
                    <button
                        onClick={() => action("stop", () => onStop(container.name))}
                        disabled={!isRunning || !!actionLoading}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 disabled:opacity-30 transition-colors"
                    >
                        {actionLoading === "stop" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Square className="w-3.5 h-3.5" />
                        )}
                    </button>
                    <button
                        onClick={() => action("restart", () => onRestart(container.name))}
                        disabled={!!actionLoading}
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 disabled:opacity-30 transition-colors"
                    >
                        {actionLoading === "restart" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                        )}
                    </button>
                    <button
                        onClick={() => onViewLogs(container.name)}
                        className="p-1.5 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors"
                    >
                        <Terminal className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setShowRemoveConfirm(true)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {port && (
                <div className="flex items-center gap-1.5 mt-2 p-2 rounded-lg bg-muted/30 border">
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">localhost:</span>
                    <span className="text-[11px] font-mono font-semibold">{port}</span>
                    <button
                        onClick={copyPort}
                        className="ml-auto p-0.5 rounded hover:bg-muted transition-colors"
                    >
                        {copied ? (
                            <Activity className="w-3 h-3 text-emerald-500" />
                        ) : (
                            <Copy className="w-3 h-3 text-muted-foreground" />
                        )}
                    </button>
                </div>
            )}

            <div className="text-[10px] text-muted-foreground mt-2">
                ID: <span className="font-mono">{container.id}</span>
            </div>

            {showRemoveConfirm && (
                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
                    <p className="text-xs font-medium text-red-500">Remove container?</p>
                    <p className="text-[11px] text-muted-foreground">
                        This will delete the container. Volume data can be preserved.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setShowRemoveConfirm(false);
                                action("remove", () => onRemove(container.name, false));
                            }}
                            className="flex-1 text-[11px] py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 font-medium transition-colors"
                        >
                            Remove (keep data)
                        </button>
                        <button
                            onClick={() => {
                                setShowRemoveConfirm(false);
                                action("remove", () => onRemove(container.name, true));
                            }}
                            className="flex-1 text-[11px] py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
                        >
                            Remove + Delete data
                        </button>
                    </div>
                    <button
                        onClick={() => setShowRemoveConfirm(false)}
                        className="w-full text-[11px] py-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}
