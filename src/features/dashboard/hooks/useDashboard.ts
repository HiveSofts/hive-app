import { useCallback, useEffect, useState } from "react";

import {
    dashboardService,
    generateMetrics,
    generateNewMetric,
} from "../services/dashboardService";
import {
    DnsProxyData,
    HiveHealth,
    LogEntry,
    Metric,
    NotificationItem,
    Project,
    WidgetsState,
} from "../types";

const DEFAULT_WIDGETS: WidgetsState = {
    php: true,
    node: true,
    db: true,
    ssl: true,
    tunnel: false,
};

export function useDashboard() {
    const [metrics, setMetrics] = useState<Metric[]>(() => generateMetrics());
    const [refreshing, setRefreshing] = useState(false);
    const [health, setHealth] = useState<HiveHealth>("warn");
    const [widgets, setWidgets] = useState<WidgetsState>(DEFAULT_WIDGETS);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [notifications] = useState<NotificationItem[]>([]);
    const [widgetData] = useState<{
        dbConnections: { name: string; driver: string; db: string; status: string }[];
        sslCerts: { domain: string; expiry: string; daysLeft: number }[];
        tunnels: { projectName: string; localUrl: string; publicUrl?: string; status: string; startedAt: string }[];
    }>({ dbConnections: [], sslCerts: [], tunnels: [] });
    const [dnsData, setDnsData] = useState<DnsProxyData | null>(null);

    const fetchData = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const [projectsData, healthData, liveMetrics] = await Promise.all([
                dashboardService.getProjects(),
                dashboardService.getHealth(),
                dashboardService.getMetrics(),
            ]);

            setProjects(projectsData);
            setHealth(healthData);

            if (liveMetrics.length > 0) {
                setMetrics((prev) => {
                    const next = { ...prev[prev.length - 1], ...liveMetrics[0] };
                    return [...prev.slice(1), next];
                });
            }

            const [logsData, dnsProxyData] = await Promise.all([
                dashboardService.getLogs(projectsData),
                dashboardService.getDnsProxyData(),
            ]);

            setLogs(logsData);
            setDnsData(dnsProxyData ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load dashboard");
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    }, []);

    const refresh = useCallback(async () => {
        await fetchData();
    }, [fetchData]);

    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics((prev) => [...prev.slice(1), generateNewMetric()]);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchData();
        const refreshInterval = setInterval(fetchData, 30_000);
        return () => clearInterval(refreshInterval);
    }, [fetchData]);

    return {
        metrics,
        refreshing,
        health,
        widgets,
        setWidgets,
        projects,
        loading,
        error,
        refresh,
        logs,
        notifications,
        widgetData,
        dnsData,
    };
}