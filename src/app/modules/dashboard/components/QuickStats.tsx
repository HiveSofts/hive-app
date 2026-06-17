import { cn } from "@/core/lib/utils";
import { Project, Service, QuickStat } from "../types";
import { useQuickStats } from "../hooks/useQuickStats";

interface QuickStatsProps {
  projects: Project[];
  services: Service[];
  phpVersion?: string;
  activeDomains?: number;
  domainsLabel?: string;
}

export function QuickStats({ 
  projects, 
  services,
  phpVersion = "8.3",
  activeDomains = 4,
  domainsLabel = "*.test · *.local",
}: QuickStatsProps) {
  const stats: QuickStat[] = useQuickStats({
    projects,
    services,
    phpVersion,
    activeDomains,
    domainsLabel,
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s: QuickStat) => (
        <div
          key={s.label}
          className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:bg-muted/20 transition-colors"
        >
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
              s.bg,
              s.color
            )}
          >
            {s.icon}
          </div>
          <div className="min-w-0">
            <div className={cn("text-2xl font-bold tabular-nums", s.color)}>
              {s.value}
            </div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              {s.label}
            </div>
            <div className="text-[10px] text-muted-foreground/60 leading-tight">
              {s.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}