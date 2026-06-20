import { Cpu, Database, HardDrive } from "lucide-react";

import { Metrics } from "../types";

interface MetricsPanelProps {
    metrics: Metrics;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-medium">CPU Usage</span>
                </div>
                <div className="text-2xl font-bold">{metrics.cpu}%</div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div
                        className="bg-orange-500 h-1.5 rounded-full"
                        style={{ width: `${metrics.cpu}%` }}
                    />
                </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium">Memory</span>
                </div>
                <div className="text-2xl font-bold">{metrics.memory}%</div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${metrics.memory}%` }}
                    />
                </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-medium">Disk Usage</span>
                </div>
                <div className="text-2xl font-bold">{metrics.disk}%</div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div
                        className="bg-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${metrics.disk}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
