import { memo, useEffect, useRef, useState } from "react";

import { AlertCircle, CheckCircle, FileText, Info, Play, RotateCcw, Square } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogEntry {
    id: string;
    timestamp: string;
    level: "info" | "warn" | "error" | "debug";
    message: string;
    source: string;
}

interface ViteLogsPanelProps {
    projectPath: string;
}

export const ViteLogsPanel = memo(function ViteLogsPanel({ projectPath }: ViteLogsPanelProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Simulated log data for Vite projects
    useEffect(() => {
        // In a real implementation, this would connect to a log stream
        const sampleLogs: LogEntry[] = [
            {
                id: "1",
                timestamp: new Date(Date.now() - 300000).toISOString(),
                level: "info",
                message: "Vite v5.0.0 building for production...",
                source: "vite",
            },
            {
                id: "2",
                timestamp: new Date(Date.now() - 240000).toISOString(),
                level: "info",
                message: "transforming...",
                source: "vite",
            },
            {
                id: "3",
                timestamp: new Date(Date.now() - 180000).toISOString(),
                level: "info",
                message: "rendering chunks...",
                source: "vite",
            },
            {
                id: "4",
                timestamp: new Date(Date.now() - 120000).toISOString(),
                level: "info",
                message: "computing gzip size...",
                source: "vite",
            },
            {
                id: "5",
                timestamp: new Date(Date.now() - 60000).toISOString(),
                level: "info",
                message: "dist/index.html                    0.75 kB │ gzip:  0.43 kB",
                source: "vite",
            },
            {
                id: "6",
                timestamp: new Date(Date.now() - 30000).toISOString(),
                level: "info",
                message: "dist/assets/index-DTm3UZqR.js   157.51 kB │ gzip: 54.01 kB",
                source: "vite",
            },
            {
                id: "7",
                timestamp: new Date(Date.now() - 10000).toISOString(),
                level: "info",
                message: "✓ built in 2.34s",
                source: "vite",
            },
        ];

        setLogs(sampleLogs);
    }, [projectPath]);

    const startStream = () => {
        setIsStreaming(true);
        // In a real implementation, this would start streaming logs
    };

    const stopStream = () => {
        setIsStreaming(false);
        // In a real implementation, this would stop streaming logs
    };

    const clearLogs = () => {
        setLogs([]);
    };

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector(
                "[data-radix-scroll-area-viewport]"
            );
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [logs]);

    const getLevelColor = (level: LogEntry["level"]) => {
        switch (level) {
            case "error":
                return "text-red-500 bg-red-500/10 border-red-500/30";
            case "warn":
                return "text-amber-500 bg-amber-500/10 border-amber-500/30";
            case "debug":
                return "text-blue-500 bg-blue-500/10 border-blue-500/30";
            case "info":
            default:
                return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
        }
    };

    const getLevelIcon = (level: LogEntry["level"]) => {
        switch (level) {
            case "error":
                return <AlertCircle className="w-3 h-3" />;
            case "warn":
                return <AlertCircle className="w-3 h-3" />;
            case "debug":
                return <Info className="w-3 h-3" />;
            case "info":
            default:
                return <CheckCircle className="w-3 h-3" />;
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Build & Development Logs
                </CardTitle>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={clearLogs}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Clear
                    </Button>
                    {isStreaming ? (
                        <Button size="sm" variant="destructive" onClick={stopStream}>
                            <Square className="w-4 h-4 mr-2" />
                            Stop
                        </Button>
                    ) : (
                        <Button size="sm" onClick={startStream}>
                            <Play className="w-4 h-4 mr-2" />
                            Stream
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96 w-full rounded-md border" ref={scrollAreaRef}>
                    <div className="p-4 font-mono text-sm space-y-2">
                        {logs.length > 0 ? (
                            logs.map((log) => (
                                <div key={log.id} className="flex gap-3 py-1">
                                    <span className="text-xs text-muted-foreground min-w-[100px]">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className={`gap-1.5 h-6 px-1.5 font-mono ${getLevelColor(log.level)}`}
                                    >
                                        {getLevelIcon(log.level)}
                                        {log.level.toUpperCase()}
                                    </Badge>
                                    <span className="text-foreground">
                                        [{log.source}] {log.message}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No logs available
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
});
