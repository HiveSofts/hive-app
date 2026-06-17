import { useState, useCallback, useMemo } from "react";
import { Service, ServiceStatus } from "../types";

interface UseServicesProps {
  initialServices: Service[];
  onToggleStatus?: (service: Service) => void;
  onRestart?: (service: Service) => void;
}

export function useServices({ 
  initialServices, 
  onToggleStatus,
  onRestart 
}: UseServicesProps) {
  const [services, setServices] = useState<Service[]>(initialServices);

  const toggleStatus = useCallback((id: string) => {
    setServices((prev: Service[]) =>
      prev.map((s: Service) => {
        if (s.id === id) {
          const newStatus: ServiceStatus = s.status === "running" ? "stopped" : "running";
          const updated: Service = { ...s, status: newStatus };
          if (onToggleStatus) onToggleStatus(updated);
          return updated;
        }
        return s;
      })
    );
  }, [onToggleStatus]);

  const restart = useCallback((id: string) => {
    const service = services.find((s) => s.id === id);
    if (service && onRestart) {
      onRestart(service);
    }
    setServices((prev: Service[]) =>
      prev.map((s: Service) => {
        if (s.id === id) {
          return { ...s, status: "running" as ServiceStatus };
        }
        return s;
      })
    );
  }, [services, onRestart]);

  const getServiceById = useCallback((id: string) => {
    return services.find((s) => s.id === id);
  }, [services]);

  const runningCount = useMemo(() => {
    return services.filter((s) => s.status === "running").length;
  }, [services]);

  const errorCount = useMemo(() => {
    return services.filter((s) => s.status === "error").length;
  }, [services]);

  return {
    services,
    setServices,
    toggleStatus,
    restart,
    getServiceById,
    runningCount,
    errorCount,
  };
}