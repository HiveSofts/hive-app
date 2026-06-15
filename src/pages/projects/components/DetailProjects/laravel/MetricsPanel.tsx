import { useEffect, useState } from "react";

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

const generateMetrics = () =>
    Array.from({ length: 20 }, (_, i) => ({
        t: `${i}s`,
        cpu: Math.round(10 + Math.random() * 40),
        mem: Math.round(180 + Math.random() * 80),
        req: Math.round(Math.random() * 30),
    }));

export function MetricsPanel() {
    const [metrics, setMetrics] = useState(generateMetrics);
    useEffect(() => {
        const t = setInterval(() => {
            setMetrics((m) => [
                ...m.slice(1),
                {
                    t: "now",
                    cpu: Math.round(10 + Math.random() * 40),
                    mem: Math.round(180 + Math.random() * 80),
                    req: Math.round(Math.random() * 30),
                },
            ]);
        }, 2000);
        return () => clearInterval(t);
    }, []);

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
                        label: "Requests/s",
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
                            <XAxis dataKey="t" tick={false} axisLine={false} />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 10 }}
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
                            <XAxis dataKey="t" tick={false} axisLine={false} />
                            <YAxis
                                domain={[100, 350]}
                                tick={{ fontSize: 10 }}
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
}
