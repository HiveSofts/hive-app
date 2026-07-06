import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface NextjsLogsPanelProps {
    projectName: string;
    projectPath: string;
}

function lineColor(line: string): string {
    if (/\[ERR\]|error|ERROR|Fatal|Exception/i.test(line)) return "text-red-400";
    if (/warning|WARNING|deprecated/i.test(line)) return "text-yellow-400";
    if (/INFO|ready|started|listening|compiled/i.test(line)) return "text-emerald-400";
    if (/http:\/\//i.test(line)) return "text-cyan-400";
    if (/===/.test(line)) return "text-zinc-500";
    return "text-zinc-400";
}

export function NextjsLogsPanel({ projectName }: NextjsLogsPanelProps) {
    const [logs, setLogs] = useState<string[]>([]);
    const [minimized, setMinimized] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMounted = useRef(true);

    const fetchLogs = useCallback(async () => {
        if (!projectName || !isMounted.current) return;
        try {
            const lines = await invoke<string[]>("get_server_logs", {
                projectName,
                lines: 400,
            });
            if (isMounted.current) {
                setLogs(lines);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        }
    }, [projectName]);

    useEffect(() => {
        isMounted.current = true;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        fetchLogs();
        intervalRef.current = setInterval(fetchLogs, 2000);

        return () => {
            isMounted.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [fetchLogs]);

    useEffect(() => {
        if (!minimized && logs.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, minimized]);

    const handleClear = async () => {
        try {
            await invoke("clear_server_logs", { projectName });
            setLogs([]);
        } catch (error) {
            console.error("Failed to clear logs:", error);
        }
    };

    return (
        <div
            className={`rounded-xl border border-zinc-700/60 bg-zinc-950 overflow-hidden transition-all duration-200 ${
                minimized ? "h-[45px]" : ""
            }`}
        >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono truncate">
                        {projectName} · server.log
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                        onClick={handleClear}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 transition-colors"
                        title="Clear logs"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => setMinimized((v) => !v)}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        {minimized ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {!minimized && (
                <div className="p-4 font-mono text-[11px] leading-relaxed max-h-[420px] overflow-y-auto space-y-px">
                    {logs.length === 0 ? (
                        <span className="text-zinc-600">
                            No server logs yet. Start the dev server to see output here.
                        </span>
                    ) : (
                        logs.map((line, i) => (
                            <div key={i} className={lineColor(line)}>
                                {line}
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>
            )}
        </div>
    );
}
