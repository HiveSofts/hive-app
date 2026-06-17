import { useState, useCallback, useMemo } from "react";
import { Project, ProjectStatus } from "../types";

interface UseProjectsProps {
  initialProjects: Project[];
  onToggleStatus?: (project: Project) => void;
  onTogglePin?: (project: Project) => void;
}

export function useProjects({ 
  initialProjects, 
  onToggleStatus, 
  onTogglePin 
}: UseProjectsProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const toggleStatus = useCallback((id: number) => {
    setProjects((prev: Project[]) =>
      prev.map((p: Project) => {
        if (p.id === id) {
          const newStatus: ProjectStatus = p.status === "running" ? "stopped" : "running";
          const updated: Project = { ...p, status: newStatus };
          if (onToggleStatus) onToggleStatus(updated);
          return updated;
        }
        return p;
      })
    );
  }, [onToggleStatus]);

  const togglePin = useCallback((id: number) => {
    setProjects((prev: Project[]) =>
      prev.map((p: Project) => {
        if (p.id === id) {
          const updated: Project = { ...p, pinned: !p.pinned };
          if (onTogglePin) onTogglePin(updated);
          return updated;
        }
        return p;
      })
    );
  }, [onTogglePin]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [projects]);

  return {
    projects,
    sortedProjects,
    toggleStatus,
    togglePin,
    setProjects,
  };
}