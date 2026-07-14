import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, FileText, AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    source?: string;
}

interface VueLogsPanelProps {
    projectPath: string;
    projectName: string;
    projectType: string;
}

export const VueLogsPanel = ({ 
    projectPath, 
    projectName 
}: VueLogsPanelProps) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
    const [filterLevel, setFilterLevel] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const logLevelIcons = {
        info: <Info className="h-4 w-4 text-blue-500" />,
        warn: <AlertCircle className="h-4 w-4 text-yellow-500" />,
        error: <XCircle className="h-4 w-4 text-red-500" />,
        debug: <FileText className="h-4 w-4 text-gray-500" />,
    };

    const logLevelColors = {
        info: 'bg-blue-100 text-blue-800',
        warn: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
        debug: 'bg-gray-100 text-gray-800',
    };

    useEffect(() => {
        loadLogs();
        
        let refreshInterval: NodeJS.Timeout;
        if (autoRefresh) {
            refreshInterval = setInterval(loadLogs, 5000);
        }
        
        return () => {
            if (refreshInterval) clearInterval(refreshInterval);
        };
    }, [projectPath, autoRefresh]);

    useEffect(() => {
        applyFilters();
    }, [logs, filterLevel]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            // In a real implementation, this would fetch actual logs from the backend
            // For now, we'll simulate logs
            const simulatedLogs: LogEntry[] = [
                {
                    timestamp: new Date(Date.now() - 300000).toISOString(),
                    level: 'info',
                    message: 'Vue dev server started successfully',
                    source: 'dev-server'
                },
                {
                    timestamp: new Date(Date.now() - 240000).toISOString(),
                    level: 'info',
                    message: 'Compiled successfully in 2.34s',
                    source: 'compiler'
                },
                {
                    timestamp: new Date(Date.now() - 180000).toISOString(),
                    level: 'warn',
                    message: 'Module "./assets/style.css" not found',
                    source: 'compiler'
                },
                {
                    timestamp: new Date(Date.now() - 120000).toISOString(),
                    level: 'info',
                    message: 'Hot Module Replacement enabled',
                    source: 'hmr'
                },
                {
                    timestamp: new Date(Date.now() - 60000).toISOString(),
                    level: 'error',
                    message: 'Failed to compile: Cannot resolve module \'vue-router\'',
                    source: 'compiler'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'File change detected. Starting compilation...',
                    source: 'watcher'
                }
            ];
            
            setLogs(simulatedLogs);
        } catch (error) {
            console.error("Error loading logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...logs];
        
        if (filterLevel !== 'all') {
            result = result.filter(log => log.level === filterLevel);
        }
        
        setFilteredLogs(result);
    };

    const clearLogs = () => {
        setLogs([]);
        setFilteredLogs([]);
    };

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [filteredLogs]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-purple-600" />
                        <span>Project Logs</span>
                    </CardTitle>
                    <CardDescription>
                        View and monitor logs from your Vue project
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Select value={filterLevel} onValueChange={setFilterLevel}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value="info">Info</SelectItem>
                                <SelectItem value="warn">Warning</SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                                <SelectItem value="debug">Debug</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={loadLogs}
                            disabled={loading}
                        >
                            <RotateCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Loading...' : 'Refresh'}
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={clearLogs}
                        >
                            Clear Logs
                        </Button>
                        
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-sm">Auto-refresh</span>
                            <div 
                                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer ${
                                    autoRefresh ? 'bg-blue-500' : 'bg-gray-300'
                                }`}
                                onClick={() => setAutoRefresh(!autoRefresh)}
                            >
                                <div 
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                        autoRefresh ? 'translate-x-4' : ''
                                    }`}
                                />
                            </div>
                        </div>
                    </div>

                    <ScrollArea className="h-[500px] w-full rounded-md border p-4" ref={scrollAreaRef}>
                        {filteredLogs.length > 0 ? (
                            <div className="space-y-3">
                                {filteredLogs.map((log, index) => (
                                    <div 
                                        key={index} 
                                        className="flex items-start gap-3 p-3 bg-muted rounded-lg text-sm"
                                    >
                                        <div className="mt-0.5">
                                            {logLevelIcons[log.level]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Badge className={logLevelColors[log.level]} variant="secondary">
                                                    {log.level.toUpperCase()}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </span>
                                                {log.source && (
                                                    <span className="text-xs text-muted-foreground">
                                                        [{log.source}]
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 break-words">{log.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                {loading 
                                    ? "Loading logs..." 
                                    : "No logs available. Start your Vue project to see logs here."}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};