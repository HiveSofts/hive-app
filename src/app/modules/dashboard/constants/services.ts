import { ServiceStatus } from "../types";

export const SERVICE_COLORS: Record<ServiceStatus, string> = {
  running: "bg-emerald-500",
  stopped: "bg-zinc-400",
  error: "bg-red-500",
};

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  running: "Running",
  stopped: "Stopped",
  error: "Error",
};