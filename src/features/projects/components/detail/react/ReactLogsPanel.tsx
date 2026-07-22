import { useEffect, useRef, useState } from "react";

import { listen } from "@tauri-apps/api/event";
import { FileText, Filter, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ReactLogsPanelProps {
    projectPath: string;
}

export function ReactLogsPanel({ projectPath }: ReactLogsPanelProps) {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [logLevel, setLogLevel] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [followLogs, setFollowLogs] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const unlistenRef = useRef<() => void | null>(null);

    // Load initial logs
    useEffect(() => {
        loadInitialLogs();
        setupLogListener();

        return () => {
            if (unlistenRef.current) {
                unlistenRef.current();
            }
        };
    }, [projectPath]);

    // Auto-scroll to bottom when following logs
    useEffect(() => {
        if (followLogs) {
            scrollToBottom();
        }
    }, [logs, followLogs]);

    const loadInitialLogs = async () => {
        setLoading(true);
        try {
            // In a real implementation, this would fetch actual logs
            // For now, we'll simulate with some sample log data
            const sampleLogs = [
                "[INFO] Starting React development server...",
                "[DEBUG] Loaded environment variables",
                "[INFO] Compiled successfully!",
                "[INFO] Local: http://localhost:3000",
                "[WARN] React version 18.2.0 has been deprecated",
                "[INFO] Connected to HMR server",
                "[ERROR] Failed to load module './nonexistent-file.js'",
                "[INFO] Application ready",
                "[DEBUG] Memory usage: 120MB",
                "[INFO] Watching for file changes...",
            ];

            setLogs(sampleLogs);
        } catch (error) {
            console.error("Failed to load logs:", error);
            setLogs(["[ERROR] Failed to load logs"]);
        } finally {
            setLoading(false);
        }
    };

    const setupLogListener = async () => {
        try {
            // Listen for real-time log events
            unlistenRef.current = await listen("react-log-event", (event) => {
                const logMessage = event.payload as string;
                setLogs((prev) => [...prev, logMessage]);
            });
        } catch (error) {
            console.error("Failed to setup log listener:", error);
        }
    };

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const clearLogs = () => {
        setLogs([]);
    };

    const refreshLogs = () => {
        loadInitialLogs();
    };

    // Filter logs based on log level and search term
    const filteredLogs = logs.filter((log) => {
        const matchesLevel =
            logLevel === "all" ||
            (logLevel === "error" && log.includes("[ERROR]")) ||
            (logLevel === "warn" && log.includes("[WARN]")) ||
            (logLevel === "info" && log.includes("[INFO]")) ||
            (logLevel === "debug" && log.includes("[DEBUG]"));

        const matchesSearch =
            searchTerm === "" || log.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesLevel && matchesSearch;
    });

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Application Logs
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={refreshLogs} disabled={loading}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearLogs}
                        disabled={logs.length === 0}
                    >
                        Clear
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4">
                {/* Controls */}
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <Select value={logLevel} onValueChange={setLogLevel}>
                        <SelectTrigger className="w-[120px]">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Log Level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="error">Errors</SelectItem>
                            <SelectItem value="warn">Warnings</SelectItem>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="debug">Debug</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant={followLogs ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFollowLogs(!followLogs)}
                    >
                        {followLogs ? "Following" : "Follow"}
                    </Button>
                </div>

                {/* Logs Area */}
                <div className="flex-1 border rounded-lg overflow-hidden">
                    <ScrollArea className="h-[500px] w-full p-4 font-mono text-sm">
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map((log, index) => (
                                <div
                                    key={index}
                                    className={`py-1 ${
                                        log.includes("[ERROR]")
                                            ? "text-red-500"
                                            : log.includes("[WARN]")
                                              ? "text-yellow-500"
                                              : log.includes("[DEBUG]")
                                                ? "text-gray-500"
                                                : "text-green-500"
                                    }`}
                                >
                                    {log}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                {loading ? "Loading logs..." : "No logs found"}
                            </div>
                        )}
                        <div ref={logsEndRef} />
                    </ScrollArea>
                </div>

                <div className="text-xs text-muted-foreground">
                    Showing {filteredLogs.length} of {logs.length} log entries
                </div>
            </CardContent>
        </Card>
    );
}
