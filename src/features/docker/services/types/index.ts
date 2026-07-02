export interface DockerInfo {
    installed: boolean;
    version: string | null;
    daemon_running: boolean;
    compose_available: boolean;
    compose_version: string | null;
}

export interface PortMapping {
    host_port: number;
    container_port: number;
    protocol: string;
}

export interface ContainerInfo {
    id: string;
    name: string;
    image: string;
    status: string;
    state: string;
    ports: PortMapping[];
    created: string;
}

export interface CreateDatabaseContainerRequest {
    db_type: string;
    container_name: string;
    version: string;
    host_port: number;
    root_password: string;
    database_name: string;
    username: string;
    password: string;
    data_volume: string | null;
    memory_limit: string | null;
    cpu_limit: number | null;
    restart_policy: string;
}

export interface CreateContainerResult {
    success: boolean;
    container_id: string | null;
    container_name: string;
    connection_string: string | null;
    host: string;
    port: number;
    database: string;
    username: string;
    error: string | null;
}

export interface ContainerStats {
    cpu: string;
    memory: string;
    memperc: string;
    net: string;
    block: string;
}

export type DBType = "mysql" | "mariadb" | "postgresql" | "mongodb" | "redis" | "mssql" | "cassandra" | "elasticsearch" | "neo4j" | "influxdb";

export interface DBPreset {
    id: DBType;
    label: string;
    color: string;
    icon: string;
    defaultPort: number;
    defaultVersion: string;
    versions: string[];
    hasRootPassword: boolean;
    hasDatabase: boolean;
    hasUser: boolean;
    hasPassword: boolean;
    category: "relational" | "nosql" | "cache" | "search" | "timeseries" | "graph";
    description: string;
}

export interface AppTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    category: "web" | "cms" | "monitoring" | "ci" | "storage" | "messaging" | "security" | "ai";
    tags: string[];
    composeContent: string;
    ports: number[];
    defaultEnv: Record<string, string>;
}

export interface BackupRecord {
    id: string;
    containerName: string;
    dbType: string;
    timestamp: string;
    size: string;
    path: string;
    status: "success" | "failed";
}

export interface ShellSession {
    containerId: string;
    containerName: string;
    active: boolean;
}