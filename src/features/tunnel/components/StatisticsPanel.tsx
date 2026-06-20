import { useState } from "react";

import { TunnelSession } from "../types";

interface StatisticsPanelProps {
    session: TunnelSession | null;
}

export function StatisticsPanel({ session }: StatisticsPanelProps) {
    const [history] = useState([
        { time: "14:00", req: 12 },
        { time: "14:15", req: 8 },
        { time: "14:30", req: 23 },
        { time: "14:45", req: 15 },
        { time: "15:00", req: 31 },
        { time: "15:15", req: 19 },
        { time: "15:30", req: 27 },
        { time: "15:45", req: 14 },
    ]);

    if (!session)
        return (
            <div className="text-center py-12 text-muted-foreground">
                Start a tunnel to see statistics
            </div>
        );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4 text-center">
                    <div className="text-2xl font-bold">{session.requests.toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">Total Requests</div>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                    <div className="text-2xl font-bold">{session.bytesTransferred}</div>
                    <div className="text-[11px] text-muted-foreground">Data Transferred</div>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                    <div className="text-2xl font-bold">{session.uptime}</div>
                    <div className="text-[11px] text-muted-foreground">Uptime</div>
                </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium mb-3">Request Rate (last 2 hours)</p>
                <div className="flex items-end gap-1 h-32">
                    {history.map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className="w-full bg-amber-500/20 rounded-t"
                                style={{ height: `${Math.min(100, (h.req / 40) * 100)}%` }}
                            >
                                <div
                                    className="w-full bg-amber-500 rounded-t"
                                    style={{ height: `${(h.req / 40) * 100}%` }}
                                />
                            </div>
                            <span className="text-[9px] text-muted-foreground">{h.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
