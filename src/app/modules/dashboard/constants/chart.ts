import { ChartSeries, ChartRange } from "../types";

export const CHART_RANGES: ChartRange[] = ["1 min", "15 min", "1 hr"];

export const CHART_SERIES: ChartSeries[] = [
  { key: "cpu", name: "CPU %", color: "#f97316", unit: "%" },
  { key: "ram", name: "RAM MB", color: "#3b82f6", unit: " MB" },
  { key: "net_in", name: "Net In", color: "#10b981", unit: " KB/s" },
  { key: "net_out", name: "Net Out", color: "#8b5cf6", unit: " KB/s" },
];

export const CHART_DEFAULTS = {
  cpu: true,
  ram: true,
  net_in: false,
  net_out: false,
};