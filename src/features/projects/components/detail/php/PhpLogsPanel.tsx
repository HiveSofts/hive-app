// Re-uses the real Laravel LogsPanel — it only depends on projectPath,
// which PHP projects also have. This avoids duplicating paginated log logic.
export { LogsPanel as PhpLogsPanel } from "../laravel/LogsPanel";
