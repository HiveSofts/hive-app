import { useState } from "react";

import { Archive, Database, Download, RotateCcw } from "lucide-react";

import { Badge } from "@/app/components/ui/badge.tsx";
import { Button } from "@/app/components/ui/button.tsx";

interface DatabasePanelProps {
    db: {
        driver: string;
        name: string;
        host: string;
        port: number;
        status: string;
    };
}

export function DatabasePanel({ db }: DatabasePanelProps) {
    const [restarting, setRestarting] = useState(false);
    const [backingUp, setBackingUp] = useState(false);

    const restart = () => {
        setRestarting(true);
        setTimeout(() => setRestarting(false), 2000);
    };

    const backup = () => {
        setBackingUp(true);
        setTimeout(() => setBackingUp(false), 2500);
    };

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
                        className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-[10px]"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse inline-block" />
                        {db.status}
                    </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                        { label: "Driver", value: db.driver },
                        { label: "Database", value: db.name },
                        { label: "Host", value: db.host },
                        { label: "Port", value: db.port },
                    ].map((r) => (
                        <div key={r.label} className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">{r.label}</span>
                            <span className="font-mono text-sm font-medium">{r.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4 text-center">
                    <div className="text-2xl font-bold text-foreground">12</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Tables</div>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                    <div className="text-2xl font-bold text-foreground">4.2 MB</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Size</div>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                    <div className="text-2xl font-bold text-foreground">1,843</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Total rows</div>
                </div>
            </div>

            <div className="flex gap-2 flex-wrap">
                <Button
                    variant="outline"
                    className="gap-2 text-sm"
                    onClick={restart}
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
                    onClick={backup}
                    disabled={backingUp}
                >
                    {backingUp ? (
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Archive className="w-3.5 h-3.5" />
                    )}
                    Backup DB
                </Button>
                <Button variant="outline" className="gap-2 text-sm">
                    <Download className="w-3.5 h-3.5" />
                    Export SQL
                </Button>
            </div>
        </div>
    );
}
