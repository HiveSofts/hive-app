import { useState } from "react";

import { Copy, ExternalLink, Eye, EyeOff, Lock, Square } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { TunnelSession } from "../types";

interface ActiveTunnelProps {
    session: TunnelSession | null;
    onStop: () => void;
    onCopyUrl: () => void;
}

export function ActiveTunnel({ session, onStop, onCopyUrl }: ActiveTunnelProps) {
    const [showAuth, setShowAuth] = useState(false);

    if (!session) return null;

    return (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-semibold">Tunnel Active</span>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                        {session.projectName}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={onStop}
                    >
                        <Square className="w-3 h-3" /> Stop Tunnel
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Public URL
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono bg-muted px-3 py-2 rounded-lg flex-1 break-all">
                        {session.url}
                    </code>
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onCopyUrl}>
                        <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1"
                        onClick={() => window.open(session.url, "_blank")}
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Requests</div>
                    <div className="text-sm font-mono font-semibold">
                        {session.requests.toLocaleString()}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Data Transfer</div>
                    <div className="text-sm font-mono font-semibold">
                        {session.bytesTransferred}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Uptime</div>
                    <div className="text-sm font-mono font-semibold">{session.uptime}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Status</div>
                    <div className="text-sm font-mono font-semibold text-emerald-500">
                        Connected
                    </div>
                </div>
            </div>

            {session.authEnabled && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 text-xs">
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span className="font-medium">Authentication Enabled</span>
                        <button
                            onClick={() => setShowAuth(!showAuth)}
                            className="ml-auto text-muted-foreground hover:text-foreground"
                        >
                            {showAuth ? (
                                <EyeOff className="w-3 h-3" />
                            ) : (
                                <Eye className="w-3 h-3" />
                            )}
                        </button>
                    </div>
                    {showAuth && (
                        <div className="mt-2 text-[11px] font-mono space-y-1">
                            <div>Username: {session.authUsername}</div>
                            <div>Password: {session.authPassword}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
