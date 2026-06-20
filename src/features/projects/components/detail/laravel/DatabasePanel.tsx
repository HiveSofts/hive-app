import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { Archive, Database, Download, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DatabaseInfo {
    driver: string;
    name: string;
    host: string;
    port: number;
    status: string;
    tables: number;
    size: string;
    total_rows: number;
}

interface DatabasePanelProps {
    projectPath: string;
}

export function DatabasePanel({ projectPath }: DatabasePanelProps) {
    const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [restarting, setRestarting] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadDatabaseInfo();
    }, [projectPath]);

    const loadDatabaseInfo = async () => {
        setLoading(true);
        try {
            const result = await invoke<DatabaseInfo>("get_database_info", {
                projectPath,
            });
            setDbInfo(result);
        } catch (error) {
            console.error("Failed to load database info:", error);
            setDbInfo(null);
        } finally {
            setLoading(false);
        }
    };

    const restartDatabase = async () => {
        setRestarting(true);
        try {
            await invoke("restart_database", { projectPath });
            await loadDatabaseInfo();
        } catch (error) {
            console.error("Failed to restart database:", error);
        } finally {
            setRestarting(false);
        }
    };

    const backupDatabase = async () => {
        setBackingUp(true);
        try {
            await invoke("backup_database", { projectPath });
        } catch (error) {
            console.error("Failed to backup database:", error);
        } finally {
            setBackingUp(false);
        }
    };

    const exportDatabase = async () => {
        setExporting(true);
        try {
            await invoke("export_database_sql", { projectPath });
        } catch (error) {
            console.error("Failed to export database:", error);
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!dbInfo) {
        return (
            <div className="rounded-xl border bg-card p-8 text-center">
                <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No database configuration found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                    This project may be using SQLite or no database
                </p>
            </div>
        );
    }

    // Check if it's SQLite
    const isSqlite = dbInfo.driver?.toLowerCase() === "sqlite";

    return (
        <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Connection</span>
                    </div>
                    <Badge
                        variant="outline"
                        className={`text-[10px] ${
                            dbInfo.status === "connected"
                                ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                                : "text-red-500 border-red-500/30 bg-red-500/10"
                        }`}
                    >
                        <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${
                                dbInfo.status === "connected"
                                    ? "bg-emerald-500 animate-pulse"
                                    : "bg-red-500"
                            }`}
                        />
                        {dbInfo.status}
                    </Badge>
                </div>

                {isSqlite ? (
                    <div className="rounded-lg bg-muted/30 p-4 text-center">
                        <p className="text-sm font-medium text-muted-foreground">SQLite Database</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                            SQLite is a file-based database. No connection details available.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                            { label: "Driver", value: dbInfo.driver },
                            { label: "Database", value: dbInfo.name },
                            { label: "Host", value: dbInfo.host },
                            { label: "Port", value: dbInfo.port },
                        ].map((r) => (
                            <div key={r.label} className="flex flex-col gap-0.5">
                                <span className="text-[11px] text-muted-foreground">{r.label}</span>
                                <span className="font-mono text-sm font-medium">{r.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {!isSqlite && (
                <>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border bg-card p-4 text-center">
                            <div className="text-2xl font-bold text-foreground">
                                {dbInfo.tables}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">Tables</div>
                        </div>
                        <div className="rounded-xl border bg-card p-4 text-center">
                            <div className="text-2xl font-bold text-foreground">{dbInfo.size}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Size</div>
                        </div>
                        <div className="rounded-xl border bg-card p-4 text-center">
                            <div className="text-2xl font-bold text-foreground">
                                {dbInfo.total_rows.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">Total rows</div>
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            className="gap-2 text-sm"
                            onClick={restartDatabase}
                            disabled={restarting}
                        >
                            {restarting ? (
                                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            Restart DB
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2 text-sm"
                            onClick={backupDatabase}
                            disabled={backingUp}
                        >
                            {backingUp ? (
                                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Archive className="w-3.5 h-3.5" />
                            )}
                            Backup DB
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2 text-sm"
                            onClick={exportDatabase}
                            disabled={exporting}
                        >
                            {exporting ? (
                                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Download className="w-3.5 h-3.5" />
                            )}
                            Export SQL
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
