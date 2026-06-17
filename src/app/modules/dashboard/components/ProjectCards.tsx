import { ExternalLink, Eye, Pin, PinOff, Play, Square, Terminal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/core/lib/utils";
import { Project } from "../types";
import { getProjectIcon } from "../constants/projectIcons";
import { useProjects } from "../hooks/useProjects";
import { Badge } from "@/app/components/ui/badge";

interface ProjectCardsProps {
  projects: Project[];
  onToggleStatus?: (project: Project) => void;
  onTogglePin?: (project: Project) => void;
  onOpenProject?: (project: Project) => void;
  onOpenTerminal?: (project: Project) => void;
  onOpenPreview?: (project: Project) => void;
}

export function ProjectCards({ 
  projects: initialProjects,
  onToggleStatus,
  onTogglePin,
  onOpenProject,
  onOpenTerminal,
  onOpenPreview,
}: ProjectCardsProps) {
  const navigate = useNavigate();
  const { sortedProjects, toggleStatus, togglePin } = useProjects({
    initialProjects,
    onToggleStatus,
    onTogglePin,
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {sortedProjects.map((p) => (
        <div
          key={p.id}
          className="group relative rounded-xl border bg-card hover:bg-muted/20 transition-all cursor-pointer overflow-hidden"
          onClick={() => navigate(`/projects/${p.id}`)}
        >
          {p.pinned && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-amber-400/80 to-amber-500/60" />
          )}
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getProjectIcon(p.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm truncate">{p.name}</span>
                  {p.pinned && (
                    <Pin className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      p.status === "running"
                        ? "bg-emerald-500 animate-pulse"
                        : p.status === "error"
                        ? "bg-red-500"
                        : "bg-zinc-400"
                    )}
                  />
                  <span className="text-[11px] text-muted-foreground font-mono truncate">
                    {p.status === "running" ? p.url : p.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(p.id);
                  }}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  {p.pinned ? (
                    <PinOff className="w-3 h-3" />
                  ) : (
                    <Pin className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <Badge
                variant="outline"
                className="text-[10px] font-mono px-1.5 py-0 text-muted-foreground"
              >
                {p.php}
              </Badge>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenProject) onOpenProject(p);
                  }}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenTerminal) onOpenTerminal(p);
                  }}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Terminal className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenPreview) onOpenPreview(p);
                  }}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStatus(p.id);
                }}
                className={cn(
                  "flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors",
                  p.status === "running"
                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    : p.status === "error"
                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                )}
              >
                {p.status === "running" ? (
                  <>
                    <Square className="w-2.5 h-2.5" />
                    Stop
                  </>
                ) : p.status === "error" ? (
                  <>
                    <Play className="w-2.5 h-2.5" />
                    Retry
                  </>
                ) : (
                  <>
                    <Play className="w-2.5 h-2.5" />
                    Start
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}