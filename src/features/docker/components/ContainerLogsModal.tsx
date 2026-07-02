import { RefreshCw, Terminal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getContainerLogs } from "../services/docker.service";

interface Props {
    containerName: string;
    onClose: () => void;
}

export function ContainerLogsModal({ containerName, onClose }: Props) {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const lines = await getContainerLogs(containerName, 200);
            setLogs(lines);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [containerName]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const getLineColor = (line: string) => {
        const lower = line.toLowerCase();
        if (lower.includes("error") || lower.includes("fatal") || lower.includes("err")) return "text-red-400";
        if (lower.includes("warn")) return "text-amber-400";
        if (lower.includes("ready") || lower.includes("started") || lower.includes("success")) return "text-emerald-400";
        return "text-muted-foreground";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-sm font-medium">{containerName}</span>
                        <span className="text-xs text-muted-foreground">logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={fetchLogs} disabled={loading}>
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-black/50 p-4 font-mono text-[11px] space-y-px">
                    {loading ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                            Loading logs...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                            No logs available
                        </div>
                    ) : (
                        logs.map((line, i) => (
                            <div key={i} className={`leading-relaxed ${getLineColor(line)}`}>
                                <span className="text-zinc-600 mr-2 select-none">{String(i + 1).padStart(3, "0")}</span>
                                {line}
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}