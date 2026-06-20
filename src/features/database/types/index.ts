import { ComponentType } from "react";

export interface DatabaseService {
    id: string;
    name: string;
    icon: ComponentType<{ className?: string }>;
    version: string;
    port: number;
    status: "running" | "stopped" | "error";
    memory: string;
    cpu: string;
    uptime: string;
    dataSize: string;
    connections: number;
}

export interface Database {
    id: number;
    name: string;
    service: string;
    size: string;
    tables: number;
    status: "active" | "inactive";
}

export interface QueryHistory {
    id: number;
    db: string;
    query: string;
    duration: string;
    time: string;
}

export interface Backup {
    id: number;
    name: string;
    size: string;
    createdAt: string;
    status: "completed" | "running" | "failed";
}

export interface Metrics {
    cpu: number;
    memory: number;
    disk: number;
}
