import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/core/lib/utils";
import { Metric } from "../types";
import { CHART_RANGES, CHART_SERIES } from "../constants/chart";
import { useChart } from "../hooks/useChart";

interface ResourceChartProps {
  metrics: Metric[];
  onRangeChange?: (range: string) => void;
  onSeriesToggle?: (key: string) => void;
}

export function ResourceChart({ 
  metrics, 
  onRangeChange,
  onSeriesToggle 
}: ResourceChartProps) {
  const { range, active, setRange, toggleSeries } = useChart({
    initialMetrics: metrics,
  });

  const handleRangeChange = (r: typeof CHART_RANGES[number]) => {
    setRange(r);
    if (onRangeChange) onRangeChange(r);
  };

  const handleSeriesToggle = (key: keyof typeof active) => {
    toggleSeries(key);
    if (onSeriesToggle) onSeriesToggle(key);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {CHART_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
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
          {CHART_SERIES.map((s) => (
            <button
              key={s.key}
              onClick={() => handleSeriesToggle(s.key)}
              className={cn(
                "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg border transition-colors",
                active[s.key]
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
        <AreaChart data={metrics} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            {CHART_SERIES.map((s) => (
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
          {CHART_SERIES.map(
            (s) =>
              active[s.key] && (
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