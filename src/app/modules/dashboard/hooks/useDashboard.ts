import { useEffect, useCallback } from "react";
import { useDashboardStore } from "../stores/dashboard.store";
import { dashboardService } from "../services/dashboard.service";
import { WidgetsState } from "../types";

export function useDashboard() {
  const {
    metrics,
    health,
    refreshing,
    widgets,
    setMetrics,
    setHealth,
    toggleWidget,
    setWidgets,
    refresh,
  } = useDashboardStore();

  const loadData = useCallback(async () => {
    try {
      const [healthData, metricsData] = await Promise.all([
        dashboardService.getHealth(),
        dashboardService.getMetrics(),
      ]);

      setHealth(healthData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }, [setHealth, setMetrics]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      dashboardService.getMetrics().then((newMetrics) => {
        setMetrics((prev) => {
          const updated = [...prev.slice(1), newMetrics[newMetrics.length - 1]];
          return updated;
        });
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [setMetrics]);

  const handleRefresh = useCallback(() => {
    refresh();
    loadData();
  }, [refresh, loadData]);

  const handleSetWidgets = useCallback((newWidgets: WidgetsState) => {
    setWidgets(newWidgets);
  }, [setWidgets]);

  return {
    metrics,
    health,
    refreshing,
    widgets,
    toggleWidget,
    setWidgets: handleSetWidgets,
    refresh: handleRefresh,
  };
}