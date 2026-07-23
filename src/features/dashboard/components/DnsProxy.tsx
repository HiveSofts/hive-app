import { useEffect, useState } from "react";

import { cn } from "@/core/lib/utils";

import { Globe, Wifi } from "lucide-react";

import { DnsProxyData } from "../types";

export function DnsProxy({ data }: { data: DnsProxyData | null }) {
    const [state, setState] = useState(data);

    useEffect(() => {
        setState(data);
    }, [data]);

    const proxyActive = state?.proxyListen !== "inactive";
    const dnsActive = state?.dnsResolver !== "inactive";

    return (
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
            <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm font-medium">Reverse Proxy</span>
                    <span className={cn("ml-auto w-1.5 h-1.5 rounded-full", proxyActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
                </div>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                    <div className="flex justify-between">
                        <span>Listen</span>
                        <span className="text-foreground">{state?.proxyListen || "127.0.0.1:80"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>SSL</span>
                        <span className="text-foreground">{state?.proxySsl || "127.0.0.1:443"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Proxied reqs</span>
                        <span className={cn("tabular-nums", proxyActive ? "text-emerald-500" : "text-muted-foreground")}>
                            {state?.proxyReqs.toLocaleString() || 0}
                        </span>
                    </div>
                </div>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">DNS Resolver</span>
                    <span className={cn("ml-auto w-1.5 h-1.5 rounded-full", dnsActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
                </div>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                    <div className="flex justify-between">
                        <span>TLD zones</span>
                        <span className="text-foreground">{state?.dnsZones || "*.test · *.local"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Resolver</span>
                        <span className="text-foreground">{state?.dnsResolver || "127.0.0.1:53"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Records</span>
                        <span className="text-foreground">{state?.dnsRecords || 0} active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}