import { useMemo } from "react";
import { Globe, Layers, Server } from "lucide-react";
import { Project, Service, QuickStat } from "../types";

interface UseQuickStatsProps {
  projects: Project[];
  services: Service[];
  phpVersion?: string;
  activeDomains?: number;
  domainsLabel?: string;
}

export function useQuickStats({
  projects,
  services,
  phpVersion = "8.3",
  activeDomains = 4,
  domainsLabel = "*.test · *.local",
}: UseQuickStatsProps) {
  return useMemo(() => {
    const running = projects.filter((p) => p.status === "running").length;
    const svcUp = services.filter((s) => s.status === "running").length;
    const svcErr = services.filter((s) => s.status === "error").length;

    const stats: QuickStat[] = [
      {
        label: "Projects",
        value: projects.length,
        sub: `${running} running`,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        icon: <Layers className="w-4 h-4" />,
      },
      {
        label: "Services",
        value: services.length,
        sub: `${svcUp} up · ${svcErr} error`,
        color: svcErr > 0 ? "text-red-500" : "text-emerald-500",
        bg: svcErr > 0 ? "bg-red-500/10" : "bg-emerald-500/10",
        icon: <Server className="w-4 h-4" />,
      },
      {
        label: "PHP Version",
        value: phpVersion,
        sub: "default active",
        color: "text-indigo-500",
        bg: "bg-indigo-500/10",
        icon: <span className="text-sm">🐘</span>,
      },
      {
        label: "Active Domains",
        value: activeDomains,
        sub: domainsLabel,
        color: "text-cyan-500",
        bg: "bg-cyan-500/10",
        icon: <Globe className="w-4 h-4" />,
      },
    ];

    return stats;
  }, [projects, services, phpVersion, activeDomains, domainsLabel]);
}