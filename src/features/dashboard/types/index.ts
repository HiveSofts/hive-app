export type HiveHealth = "ok" | "warn" | "error";

export interface Project {
    id: string;
    name: string;
    type: string;
    url: string;
    php: string;
    status: "running" | "stopped";
    pinned: boolean;
    port: number;
    path?: string;
}

export interface Service {
    id: string;
    name: string;
    version: string;
    port: number;
    status: "running" | "stopped" | "error";
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

export interface LogEntry {
    id: number;
    level: "error" | "warn" | "info";
    project: string;
    msg: string;
    ts: string;
}

export interface NotificationItem {
    id: number;
    level: "error" | "warn" | "info";
    title: string;
    body: string;
    time: string;
    action?: string;
}

export interface DbConnection {
    name: string;
    driver: string;
    db: string;
    status: "connected" | "idle";
}

export interface SslCert {
    domain: string;
    expiry: string;
    daysLeft: number;
}

export interface TunnelInfo {
    projectName: string;
    localUrl: string;
    publicUrl?: string;
    status: string;
    startedAt: string;
}

export interface DnsProxyData {
    proxyListen: string;
    proxySsl: string;
    proxyReqs: number;
    dnsZones: string;
    dnsResolver: string;
    dnsRecords: number;
}
