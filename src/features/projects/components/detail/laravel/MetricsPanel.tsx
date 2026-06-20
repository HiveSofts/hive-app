import { memo, useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { Activity, Cpu, MemoryStick } from "lucide-react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

interface SystemMetrics {
    cpu: number;
    memory: number;
    memory_total: number;
    requests: number;
    timestamp: string;
}

interface MetricData {
    t: string;
    cpu: number;
    mem: number;
    req: number;
}

interface MetricsPanelProps {
    projectPath?: string;
}

export const MetricsPanel = memo(function MetricsPanel({ projectPath }: MetricsPanelProps) {
    const [metrics, setMetrics] = useState<MetricData[]>([]);
    const [loading, setLoading] = useState(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mountedRef = useRef(true);
    const isVisible = useRef(!document.hidden);

    const fetchMetrics = useCallback(async () => {
        if (!mountedRef.current || !isVisible.current) return;

        try {
            const data = await invoke<SystemMetrics>("get_system_metrics", {
                projectPath: projectPath || "",
            });

            if (!mountedRef.current) return;

            const now = new Date();
            const timeStr = now.toLocaleTimeString();

            const newPoint: MetricData = {
                t: timeStr,
                cpu: Math.round(data.cpu || 0),
                mem: Math.round(data.memory || 0),
                req: data.requests || 0,
            };

            setMetrics((prev) => {
                const updated = [...prev, newPoint];
                return updated.slice(-15);
            });
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch metrics:", error);
        }
    }, [projectPath]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisible.current = !document.hidden;

            if (isVisible.current && !intervalRef.current) {
                intervalRef.current = setInterval(fetchMetrics, 5000);
                fetchMetrics();
            } else if (!isVisible.current && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [fetchMetrics]);

    useEffect(() => {
        mountedRef.current = true;

        // Initial fetch
        fetchMetrics();

        // Start polling only if visible
        if (isVisible.current) {
            intervalRef.current = setInterval(fetchMetrics, 5000);
        }

        return () => {
            mountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [fetchMetrics]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (metrics.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                No metrics available
            </div>
        );
    }

    const latest = metrics[metrics.length - 1];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                {[
                    {
                        label: "CPU",
                        value: `${latest.cpu}%`,
                        icon: <Cpu className="w-4 h-4" />,
                        color: "text-orange-500",
                        bg: "bg-orange-500/10",
                    },
                    {
                        label: "Memory",
                        value: `${latest.mem} MB`,
                        icon: <MemoryStick className="w-4 h-4" />,
                        color: "text-blue-500",
                        bg: "bg-blue-500/10",
                    },
                    {
                        label: "Requests",
                        value: latest.req,
                        icon: <Activity className="w-4 h-4" />,
                        color: "text-emerald-500",
                        bg: "bg-emerald-500/10",
                    },
                ].map((m) => (
                    <div
                        key={m.label}
                        className="rounded-xl border bg-card p-4 flex items-center gap-3"
                    >
                        <div className={`p-2 rounded-lg ${m.bg} ${m.color}`}>{m.icon}</div>
                        <div>
                            <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
                            <div className="text-[11px] text-muted-foreground">{m.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-3">CPU Usage</p>
                    <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={metrics}>
                            <defs>
                                <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="t"
                                tick={{ fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: "#18181b",
                                    border: "1px solid #27272a",
                                    borderRadius: 8,
                                    fontSize: 11,
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="cpu"
                                stroke="#f97316"
                                fill="url(#cpu)"
                                strokeWidth={2}
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-3">
                        Memory Usage (MB)
                    </p>
                    <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={metrics}>
                            <defs>
                                <linearGradient id="mem" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="t"
                                tick={{ fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                domain={[0, "auto"]}
                                tick={{ fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: "#18181b",
                                    border: "1px solid #27272a",
                                    borderRadius: 8,
                                    fontSize: 11,
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="mem"
                                stroke="#3b82f6"
                                fill="url(#mem)"
                                strokeWidth={2}
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
});
