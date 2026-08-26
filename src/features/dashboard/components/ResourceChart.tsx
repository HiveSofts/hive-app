import { cn } from "@/core/lib/utils";

import { useState } from "react";

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { Metric } from "../types";

const CHART_RANGES = ["1 min", "15 min", "1 hr"] as const;
const RANGE_POINTS: Record<(typeof CHART_RANGES)[number], number> = {
    "1 min": 15,
    "15 min": 30,
    "1 hr": 45,
};

export function ResourceChart({ metrics }: { metrics: Metric[] }) {
    const [range, setRange] = useState<(typeof CHART_RANGES)[number]>("1 min");
    const [active, setActive] = useState({ cpu: true, ram: true, net_in: false, net_out: false });
    const visibleMetrics = metrics.slice(-RANGE_POINTS[range]);
    const series = [
        { key: "cpu", name: "CPU %", color: "#f97316", unit: "%" },
        { key: "ram", name: "RAM MB", color: "#3b82f6", unit: " MB" },
        { key: "net_in", name: "Net In", color: "#10b981", unit: " KB/s" },
        { key: "net_out", name: "Net Out", color: "#8b5cf6", unit: " KB/s" },
    ];

    if (metrics.length === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground">
                No metrics available
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-1">
                    {CHART_RANGES.map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={cn(
                                "px-2.5 py-1 text-[11px] rounded-lg border font-medium transition-colors",
                                range === r
                                    ? "bg-foreground text-background border-foreground"
                                    : "border-border text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {r}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 ml-auto flex-wrap">
                    {series.map((s) => (
                        <button
                            key={s.key}
                            onClick={() =>
                                setActive((a) => ({ ...a, [s.key]: !a[s.key as keyof typeof a] }))
                            }
                            className={cn(
                                "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg border transition-colors",
                                active[s.key as keyof typeof active]
                                    ? "border-transparent bg-muted text-foreground"
                                    : "border-border text-muted-foreground/40"
                            )}
                        >
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ background: s.color }}
                            />
                            {s.name}
                        </button>
                    ))}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={visibleMetrics} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                        {series.map((s) => (
                            <linearGradient
                                key={s.key}
                                id={`g-${s.key}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                    <XAxis
                        dataKey="t"
                        tick={{ fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        interval={4}
                    />
                    <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 10,
                            fontSize: 11,
                        }}
                        labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    />
                    {series.map(
                        (s) =>
                            active[s.key as keyof typeof active] && (
                                <Area
                                    key={s.key}
                                    type="monotone"
                                    dataKey={s.key}
                                    stroke={s.color}
                                    fill={`url(#g-${s.key})`}
                                    strokeWidth={1.5}
                                    dot={false}
                                />
                            )
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
