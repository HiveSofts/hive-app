import { DBConnection, SSLCert, LogEntry, LogColor, LogLevel, Notification } from "../types";

export const DB_CONNS: DBConnection[] = [
  { name: "my-blog", driver: "mysql", db: "my_blog_db", status: "connected" },
  { name: "api-gateway", driver: "pgsql", db: "api_db", status: "connected" },
  { name: "vue-portfolio", driver: "sqlite", db: "portfolio.db", status: "idle" },
];

export const SSL_CERTS: SSLCert[] = [
  { domain: "*.test", expiry: "2025-12-31", daysLeft: 199 },
  { domain: "*.local", expiry: "2025-09-14", daysLeft: 91 },
  { domain: "localhost", expiry: "2026-03-01", daysLeft: 259 },
];

export const WIDGET_DEFS = [
  { id: "php" as const, label: "PHP Info" },
  { id: "node" as const, label: "Node.js Info" },
  { id: "db" as const, label: "DB Connections" },
  { id: "ssl" as const, label: "SSL Certificates" },
  { id: "tunnel" as const, label: "Tunnel Status" },
] as const;

export const LOG_STREAM: LogEntry[] = [
  {
    id: 1,
    level: "error",
    project: "my-blog",
    msg: "SQLSTATE[42S02]: Base table not found: posts",
    ts: "23:41:02",
  },
  {
    id: 2,
    level: "warn",
    project: "api-gateway",
    msg: "High memory usage: 487 MB (threshold: 512 MB)",
    ts: "23:38:47",
  },
  {
    id: 3,
    level: "info",
    project: "my-blog",
    msg: "Cache cleared via artisan",
    ts: "23:35:11",
  },
  {
    id: 4,
    level: "error",
    project: "dashboard-app",
    msg: "Unhandled promise rejection: fetch failed",
    ts: "23:30:05",
  },
  {
    id: 5,
    level: "warn",
    project: "my-blog",
    msg: "Rate limit exceeded for 10.0.0.5",
    ts: "23:22:58",
  },
];

export const LOG_COLORS: Record<LogLevel, LogColor> = {
  error: { dot: "bg-red-500", text: "text-red-500", bg: "bg-red-500/8 border-red-500/20" },
  warn: { dot: "bg-yellow-500", text: "text-yellow-500", bg: "bg-yellow-500/8 border-yellow-500/20" },
  info: { dot: "bg-blue-400", text: "text-blue-400", bg: "bg-blue-500/8 border-blue-500/20" },
};

export const NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    level: "info",
    title: "PHP 8.4.1 installed",
    body: "Updated successfully via Hive PHP Manager.",
    time: "2 min ago",
    action: null,
  },
  {
    id: 2,
    level: "warn",
    title: "php.ini changed",
    body: "Restart PHP-FPM to apply new memory_limit.",
    time: "8 min ago",
    action: "Restart Now",
  },
  {
    id: 3,
    level: "info",
    title: "my-blog created",
    body: "Laravel project scaffolded at ~/Projects/my-blog.",
    time: "1 hr ago",
    action: "Open Project",
  },
  {
    id: 4,
    level: "error",
    title: "MinIO service crashed",
    body: "Process exited with code 1. Check logs for details.",
    time: "2 hr ago",
    action: "View Logs",
  },
];