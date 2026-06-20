import { useCallback, useEffect, useState } from "react";

import { getDatabaseServices } from "../services/databaseService";
import { DatabaseService, Metrics } from "../types";

export function useDatabase() {
    const [services, setServices] = useState<DatabaseService[]>(() => getDatabaseServices());
    const [refreshing, setRefreshing] = useState(false);
    const [metrics, setMetrics] = useState<Metrics>({ cpu: 23, memory: 42, disk: 56 });

    const handleStart = useCallback((id: string) => {
        setServices((prev) =>
            prev.map((s) =>
                s.id === id
                    ? { ...s, status: "running" as const, memory: "64 MB", cpu: "1%", uptime: "0s" }
                    : s
            )
        );
    }, []);

    const handleStop = useCallback((id: string) => {
        setServices((prev) =>
            prev.map((s) =>
                s.id === id
                    ? {
                          ...s,
                          status: "stopped" as const,
                          memory: "0 MB",
                          cpu: "0%",
                          uptime: "-",
                          connections: 0,
                      }
                    : s
            )
        );
    }, []);

    const handleRestart = useCallback((id: string) => {
        setServices((prev) =>
            prev.map((s) => (s.id === id ? { ...s, status: "running" as const } : s))
        );
    }, []);

    const refresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics({
                cpu: Math.round(15 + Math.random() * 30),
                memory: Math.round(30 + Math.random() * 40),
                disk: Math.round(50 + Math.random() * 20),
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const runningCount = services.filter((s) => s.status === "running").length;
    const stoppedCount = services.filter((s) => s.status === "stopped").length;
    const errorCount = services.filter((s) => s.status === "error").length;

    return {
        services,
        metrics,
        refreshing,
        runningCount,
        stoppedCount,
        errorCount,
        handleStart,
        handleStop,
        handleRestart,
        refresh,
    };
}
