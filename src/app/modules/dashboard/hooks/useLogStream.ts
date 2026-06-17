import { useState, useMemo, useCallback } from "react";
import { LogLevel, LogEntry } from "../types";
import { LOG_STREAM } from "../constants";

export function useLogStream(initialLogs: LogEntry[] = LOG_STREAM) {
  const [logs] = useState(initialLogs);
  const [filter, setFilter] = useState<"all" | LogLevel>("all");
  const [projectFilter, setProjectFilter] = useState("all");

  const projects = useMemo(() => {
    return ["all", ...Array.from(new Set(logs.map((l) => l.project)))];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(
      (l) =>
        (filter === "all" || l.level === filter) &&
        (projectFilter === "all" || l.project === projectFilter)
    );
  }, [logs, filter, projectFilter]);

  const addLog = useCallback(
    (log: LogEntry) => {
     //TODO اینجا باید منطق لاگ های جدید و تنظیمات لاگ هارو پیاده کنیم
    },
    []
  );

  return {
    logs,
    filteredLogs,
    projects,
    filter,
    projectFilter,
    setFilter,
    setProjectFilter,
    addLog,
  };
}