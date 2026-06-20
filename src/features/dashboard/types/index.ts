export type HiveHealth = "ok" | "warn" | "error";

export interface Project {
    id: number;
    name: string;
    type: string;
    url: string;
    php: string;
    status: "running" | "stopped";
    pinned: boolean;
    port: number;
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
