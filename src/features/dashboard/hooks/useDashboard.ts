import { useCallback, useEffect, useState } from "react";

import {
    generateMetrics,
    generateNewMetric,
    getProjects,
    getServices,
} from "../services/dashboardService";
import { HiveHealth, Metric, WidgetsState } from "../types";

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
    const [health] = useState<HiveHealth>("warn");
    const [widgets, setWidgets] = useState<WidgetsState>(DEFAULT_WIDGETS);

    const projects = getProjects();
    const services = getServices();

    const refresh = useCallback(() => {
        setRefreshing(true);
        setMetrics(generateMetrics());
        setTimeout(() => setRefreshing(false), 800);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics((prev) => [...prev.slice(1), generateNewMetric()]);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return {
        metrics,
        refreshing,
        health,
        widgets,
        setWidgets,
        projects,
        services,
        refresh,
    };
}
