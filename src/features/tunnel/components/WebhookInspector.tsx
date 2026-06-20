import { useState } from "react";

import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getStatusColor } from "../services/tunnelService";
import { RequestLog } from "../types";

interface WebhookInspectorProps {
    requests: RequestLog[];
}

export function WebhookInspector({ requests }: WebhookInspectorProps) {
    const webhooks = requests.filter(
        (r) => r.path.includes("/webhook") || r.path.includes("/hook")
    );
    const [selected, setSelected] = useState<RequestLog | null>(null);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {webhooks.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        No webhook requests received yet
                    </div>
                )}
                {webhooks.map((w) => (
                    <button
                        key={w.id}
                        onClick={() => setSelected(w)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === w.id ? "border-amber-500 bg-amber-500/5" : "border-border hover:bg-muted/50"}`}
                    >
                        <div className="flex items-center gap-2">
                            <Badge
                                variant="outline"
                                className={`text-[9px] ${getStatusColor(w.statusCode)}`}
                            >
                                {w.statusCode}
                            </Badge>
                            <span className="text-xs font-mono">{w.method}</span>
                            <span className="text-[11px] font-mono text-muted-foreground flex-1 truncate">
                                {w.path}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{w.timestamp}</span>
                        </div>
                    </button>
                ))}
            </div>
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-medium">Request Details</span>
                    {selected && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Replay
                        </Button>
                    )}
                </div>
                <div className="p-4">
                    {selected ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground">Method:</span>
                                <span className="font-mono font-semibold">{selected.method}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground">Path:</span>
                                <span className="font-mono break-all">{selected.path}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground">Status:</span>
                                <span className={getStatusColor(selected.statusCode)}>
                                    {selected.statusCode}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground">IP:</span>
                                <span className="font-mono">{selected.ip}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground">Duration:</span>
                                <span className="font-mono">{selected.duration}</span>
                            </div>
                            {selected.body && (
                                <div className="space-y-1">
                                    <div className="text-xs font-mono text-muted-foreground">
                                        Body:
                                    </div>
                                    <pre className="text-[11px] font-mono bg-muted p-2 rounded-lg overflow-auto max-h-[150px]">
                                        {selected.body}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                            Select a request to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
