import { useEffect, useState } from "react";

import { Globe, Wifi } from "lucide-react";

export function DnsProxy() {
    const [reqs, setReqs] = useState(1247);
    useEffect(() => {
        const t = setInterval(() => setReqs((r) => r + Math.floor(Math.random() * 5)), 2000);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm font-medium">Reverse Proxy</span>
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                    <div className="flex justify-between">
                        <span>Listen</span>
                        <span className="text-foreground">127.0.0.1:80</span>
                    </div>
                    <div className="flex justify-between">
                        <span>SSL</span>
                        <span className="text-foreground">127.0.0.1:443</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Proxied reqs</span>
                        <span className="text-emerald-500 tabular-nums">
                            {reqs.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">DNS Resolver</span>
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                    <div className="flex justify-between">
                        <span>TLD zones</span>
                        <span className="text-foreground">*.test · *.local</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Resolver</span>
                        <span className="text-foreground">127.0.0.1:53</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Records</span>
                        <span className="text-foreground">4 active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
