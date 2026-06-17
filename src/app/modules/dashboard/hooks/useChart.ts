import { useState, useCallback } from "react";
import { Metric, ChartRange, ChartActive } from "../types";
import { CHART_DEFAULTS } from "../constants/chart";

interface UseChartProps {
  initialMetrics: Metric[];
  initialRange?: ChartRange;
  initialActive?: ChartActive;
}

export function useChart({ 
  initialMetrics, 
  initialRange = "1 min",
  initialActive = CHART_DEFAULTS 
}: UseChartProps) {
  const [metrics, setMetrics] = useState<Metric[]>(initialMetrics);
  const [range, setRange] = useState<ChartRange>(initialRange);
  const [active, setActive] = useState<ChartActive>(initialActive);

  const toggleSeries = useCallback((key: keyof ChartActive) => {
    setActive((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const updateMetrics = useCallback((newMetrics: Metric[] | ((prev: Metric[]) => Metric[])) => {
    if (typeof newMetrics === "function") {
      setMetrics((prev) => newMetrics(prev));
    } else {
      setMetrics(newMetrics);
    }
  }, []);

  const resetChart = useCallback(() => {
    setActive(CHART_DEFAULTS);
    setRange("1 min");
  }, []);

  return {
    metrics,
    range,
    active,
    setRange,
    setActive,
    toggleSeries,
    updateMetrics,
    resetChart,
  };
}