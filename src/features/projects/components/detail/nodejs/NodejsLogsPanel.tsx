import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { FileWarning, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface NodejsLogsPanelProps {
    projectPath: string;
}

const LOG_FILES = [
    "npm-debug.log",
    "yarn-error.log",
    "pnpm-debug.log",
    "debug.log",
    "combined.log",
    "error.log",
    "logs/error.log",
    "logs/combined.log",
];

export function NodejsLogsPanel({ projectPath }: NodejsLogsPanelProps) {
    const [available, setAvailable] = useState<string[]>([]);
    const [active, setActive] = useState<string | null>(null);
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const scan = async () => {
        setLoading(true);
        const found: string[] = [];
        for (const file of LOG_FILES) {
            try {
                await invoke<string>("read_project_file", {
                    projectPath,
                    fileName: file,
                });
                found.push(file);
            } catch {
                // not present
            }
        }
        setAvailable(found);
        setActive((prev) => prev ?? found[0] ?? null);
        setLoading(false);
        if (found.length > 0) {
            await loadContent(found[0]);
        } else {
            setContent(null);
        }
    };

    const loadContent = async (file: string) => {
        setLoading(true);
        try {
            const raw = await invoke<string>("read_project_file", {
                projectPath,
                fileName: file,
            });
            setContent(raw);
            setActive(file);
        } catch {
            setContent(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        scan();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectPath]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (available.length === 0) {
        return (
            <div className="rounded-xl border bg-card p-8 text-center">
                <FileWarning className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No log files found in this project</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                    Node.js writes debug logs (npm-debug.log, yarn-error.log, pnpm-debug.log) when a
                    command fails.
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={scan}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Rescan
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
                {available.map((file) => (
                    <button
                        key={file}
                        onClick={() => loadContent(file)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                            active === file
                                ? "bg-foreground text-background border-foreground"
                                : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        {file}
                    </button>
                ))}
                <Button variant="outline" size="sm" className="ml-auto" onClick={scan}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Rescan
                </Button>
            </div>

            <div className="rounded-xl border border-zinc-700/60 bg-zinc-950 shadow-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
                    <span className="text-[11px] text-zinc-500 font-mono">{active}</span>
                </div>
                <div className="p-4 font-mono text-xs max-h-[460px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap leading-relaxed text-zinc-300">
                        {content}
                    </pre>
                </div>
            </div>
        </div>
    );
}
