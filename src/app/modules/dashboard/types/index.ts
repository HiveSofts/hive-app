export type HiveHealth = "ok" | "warn" | "error";
export type LogLevel = "error" | "warn" | "info";
export type ProjectStatus = "running" | "stopped" | "error";
export type ServiceStatus = "running" | "stopped" | "error";
export type ChartRange = "1 min" | "15 min" | "1 hr";

export interface Project {
  id: number;
  name: string;
  type: string;
  url: string;
  php: string;
  status: ProjectStatus;
  pinned: boolean;
  port: number;
}

export interface Service {
  id: string;
  name: string;
  version: string;
  port: number;
  status: ServiceStatus;
  mem: string;
}

export interface Metric {
  t: string;
  cpu: number;
  ram: number;
  net_in: number;
  net_out: number;
}

export interface WidgetsState {
  php: boolean;
  node: boolean;
  db: boolean;
  ssl: boolean;
  tunnel: boolean;
}

export interface DashboardState {
  metrics: Metric[];
  health: HiveHealth;
  refreshing: boolean;
  widgets: WidgetsState;
}

export interface DBConnection {
  name: string;
  driver: string;
  db: string;
  status: "connected" | "idle" | "error";
}

export interface SSLCert {
  domain: string;
  expiry: string;
  daysLeft: number;
}

export interface LogEntry {
  id: number;
  level: LogLevel;
  project: string;
  msg: string;
  ts: string;
}

export interface LogColor {
  dot: string;
  text: string;
  bg: string;
}

export interface Notification {
  id: number;
  level: LogLevel;
  title: string;
  body: string;
  time: string;
  action: string | null;
}

export interface QuickStat {
  label: string;
  value: number | string;
  sub: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}

export interface ChartSeries {
  key: keyof Pick<Metric, "cpu" | "ram" | "net_in" | "net_out">;
  name: string;
  color: string;
  unit: string;
}

export interface ChartActive {
  cpu: boolean;
  ram: boolean;
  net_in: boolean;
  net_out: boolean;
}

export interface ServiceColor {
  running: string;
  stopped: string;
  error: string;
}

export interface ShortcutCommand {
  label: string;
  icon: React.ReactNode;
  cmd: string;
  project?: string;
}

export interface ShortcutGroup {
  title: string;
  commands: ShortcutCommand[];
}