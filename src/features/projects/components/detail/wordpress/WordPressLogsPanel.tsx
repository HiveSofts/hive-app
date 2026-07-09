import { memo, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { FileText, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WordPressLogResult {
    content: string;
    source: string;
}

interface WordPressLogsPanelProps {
    projectPath: string;
}

export const WordPressLogsPanel = memo(function WordPressLogsPanel({
    projectPath,
}: WordPressLogsPanelProps) {
    const [logs, setLogs] = useState("");
    const [source, setSource] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await invoke<WordPressLogResult>("get_wordpress_logs", {
                projectPath,
            });
            setLogs(data.content);
            setSource(data.source);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectPath]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-medium">Logs</h3>
                    {source && source !== "none" && (
                        <span className="text-[11px] text-muted-foreground font-mono">
                            {source}
                        </span>
                    )}
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            <div className="rounded-xl border bg-zinc-950 overflow-hidden">
                <div className="p-4 font-mono text-[11px] leading-relaxed text-zinc-300 min-h-[300px] max-h-[460px] overflow-y-auto whitespace-pre-wrap">
                    {loading ? (
                        <div className="flex items-center gap-2 text-zinc-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading logs...
                        </div>
                    ) : error ? (
                        <div className="text-red-400">{error}</div>
                    ) : logs.trim() ? (
                        logs
                    ) : (
                        <div className="text-zinc-500">
                            No log output yet. Start the site to generate logs.
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
});
