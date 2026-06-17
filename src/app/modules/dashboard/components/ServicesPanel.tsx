import { Play, RotateCcw, Square } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Service } from "../types";
import { SERVICE_COLORS } from "../constants/services";
import { useServices } from "../hooks/useServices";

interface ServicesPanelProps {
  services: Service[];
  onToggleStatus?: (service: Service) => void;
  onRestart?: (service: Service) => void;
}

export function ServicesPanel({ 
  services: initialServices,
  onToggleStatus,
  onRestart 
}: ServicesPanelProps) {
  const { services, toggleStatus, restart } = useServices({
    initialServices,
    onToggleStatus,
    onRestart,
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {services.map((svc) => (
        <div
          key={svc.id}
          className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-muted/20 transition-colors"
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              SERVICE_COLORS[svc.status],
              svc.status === "running" ? "animate-pulse" : ""
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium">{svc.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                v{svc.version}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              :{svc.port} · {svc.mem}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => toggleStatus(svc.id)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              {svc.status === "running" ? (
                <Square className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => restart(svc.id)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}