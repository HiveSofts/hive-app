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

export interface ContainerDetails {
    id: string;
    name: string;
    image: string;
    image_id: string;
    status: string;
    state: string;
    created: string;
    started_at: string;
    finished_at: string;
    restart_count: number;
    restart_policy: string;
    platform: string;
    ports: PortMapping[];
    env_vars: string[];
    labels: LabelEntry[];
    mounts: MountInfo[];
    networks: NetworkInfo[];
    cpu_shares: number;
    memory_limit: number;
    hostname: string;
    ip_address: string;
    cmd: string[];
    entrypoint: string[];
    working_dir: string;
    user: string;
    privileged: boolean;
    pid: number;
}

export interface LabelEntry {
    key: string;
    value: string;
}

export interface MountInfo {
    mount_type: string;
    source: string;
    destination: string;
    mode: string;
    rw: boolean;
}

export interface NetworkInfo {
    name: string;
    ip_address: string;
    mac_address: string;
    gateway: string;
}

export interface ContainerStats {
    cpu: string;
    memory: string;
    memperc: string;
    net: string;
    block: string;
    pids: string;
    cpu_raw: number;
    mem_used_mb: number;
    mem_limit_mb: number;
}

export interface ContainerProcess {
    pid: string;
    ppid: string;
    user: string;
    cpu: string;
    mem: string;
    vsz: string;
    rss: string;
    tty: string;
    stat: string;
    start: string;
    time: string;
    cmd: string;
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

export interface ImageInfo {
    id: string;
    repository: string;
    tag: string;
    created: string;
    size: string;
    digest: string;
}

export interface NetworkDetail {
    id: string;
    name: string;
    driver: string;
    scope: string;
    ipam_subnet: string;
    ipam_gateway: string;
    containers_count: number;
    internal: boolean;
    attachable: boolean;
}

export interface VolumeInfo {
    name: string;
    driver: string;
    mountpoint: string;
    created: string;
    size: string;
    containers: string[];
}

export interface SystemInfo {
    containers_total: number;
    containers_running: number;
    containers_paused: number;
    containers_stopped: number;
    images: number;
    server_version: string;
    storage_driver: string;
    memory_total: number;
    cpus: number;
    os: string;
    kernel_version: string;
    architecture: string;
    disk_usage_images: string;
    disk_usage_containers: string;
    disk_usage_volumes: string;
}

export type DBType =
    | "mysql" | "mariadb" | "postgresql" | "mongodb" | "redis"
    | "mssql" | "cassandra" | "elasticsearch" | "neo4j" | "influxdb"
    | "oracle" | "sqlite" | "tidb" | "cockroachdb" | "yugabyte"
    | "singlestore" | "couchdb" | "couchbase" | "rethinkdb" | "ravendb"
    | "scylladb" | "hbase" | "keydb" | "memcached" | "dragonfly"
    | "opensearch" | "meilisearch" | "typesense" | "solr" | "manticore"
    | "arangodb" | "janusgraph" | "dgraph" | "timescaledb" | "questdb"
    | "victoriametrics" | "prometheus" | "m3db" | "weaviate" | "qdrant"
    | "milvus" | "chroma" | "pgvector" | "kafka" | "rabbitmq"
    | "nats" | "pulsar" | "clickhouse" | "druid" | "starrocks"
    | "duckdb" | "surrealdb" | "fauna" | "edgedb" | "loki"
    | "opensearch-dashboard";

export type DBCategory =
    | "relational"
    | "nosql"
    | "wide-column"
    | "cache"
    | "search"
    | "timeseries"
    | "graph"
    | "vector"
    | "stream"
    | "olap"
    | "multi-model"
    | "logs";


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
    category: DBCategory;
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

export interface RenameRequest {
    old_name: string;
    new_name: string;
}

export interface UpdateContainerRequest {
    container_name: string;
    memory_limit: string | null;
    cpu_shares: number | null;
    restart_policy: string | null;
}

export interface ComposeProject {
    name: string;
    status: string;
    services: number;
}