import { cn } from "@/core/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Activity, AlertCircle, ArrowLeft, Check, ChevronRight,
    Copy, Cpu, Database, Download, ExternalLink, HardDrive,
    Info, Loader2, Network, Play, RefreshCw, RotateCcw, Save,
    Server, Settings, Shield, Square, Terminal, Trash2,
    Wifi, X, Zap, FolderOpen, Clock, Box, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContainerDetails, ContainerInfo, ContainerStats } from "./services/types";
import * as dockerService from "./services/docker.service";
import { DB_PRESETS } from "./services/config/dbPresets";


function formatBytes(bytes: number): string {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
}

function formatDate(d: string) {
    if (!d || d === "0001-01-01T00:00:00Z") return "—";
    try { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d)); }
    catch { return d; }
}

function formatUptime(s: string) {
    if (!s || s === "0001-01-01T00:00:00Z") return "—";
    const sec = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
    return `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`;
}

// ─── Detect DB type from container image/env ───────────────────────────────

function detectDbType(image: string, envVars?: string[]): string {
    const img = image.toLowerCase();
    if (img.includes("postgres") || img.includes("pgvector") || img.includes("timescale")) return "postgresql";
    if (img.includes("mysql")) return "mysql";
    if (img.includes("mariadb")) return "mariadb";
    if (img.includes("mongo")) return "mongodb";
    if (img.includes("redis") || img.includes("keydb") || img.includes("dragonfly")) return "redis";
    if (img.includes("mssql") || img.includes("sqlserver")) return "mssql";
    if (img.includes("cassandra") || img.includes("scylla")) return "cassandra";
    if (img.includes("elastic")) return "elasticsearch";
    if (img.includes("clickhouse")) return "clickhouse";
    if (img.includes("neo4j")) return "neo4j";
    if (img.includes("influx")) return "influxdb";
    if (img.includes("couchdb")) return "couchdb";
    if (img.includes("memcached")) return "memcached";
    return "postgresql";
}

// Db types that the SQL runner and backup tool actually know how to talk to.
// Keeping this list in sync with the switch statements below avoids the
// "not supported" crash when a detected type has no matching case.
const SQL_SUPPORTED_TYPES = ["postgresql", "mysql", "mariadb", "mongodb", "redis", "mssql", "cassandra", "clickhouse", "influxdb", "couchdb", "neo4j", "elasticsearch", "memcached"];
const BACKUP_SUPPORTED_TYPES = ["postgresql", "mysql", "mariadb", "mongodb", "redis", "mssql", "clickhouse", "influxdb", "couchdb", "neo4j"];

function parseEnv(envVars: string[]): Record<string, string> {
    return Object.fromEntries(
        envVars.map(e => { const [k, ...v] = e.split("="); return [k, v.join("=")]; })
    );
}

function extractCreds(image: string, envVars: string[]) {
    const env = parseEnv(envVars);
    const dbType = detectDbType(image, envVars);
    let user = "postgres", password = "", database = "postgres";

    if (dbType === "postgresql") {
        user = env.POSTGRES_USER || env.PGUSER || "postgres";
        password = env.POSTGRES_PASSWORD || env.PGPASSWORD || "";
        database = env.POSTGRES_DB || env.PGDATABASE || "postgres";
    } else if (dbType === "mysql" || dbType === "mariadb") {
        user = env.MYSQL_USER || env.MARIADB_USER || "root";
        password = env.MYSQL_PASSWORD || env.MARIADB_PASSWORD || env.MYSQL_ROOT_PASSWORD || env.MARIADB_ROOT_PASSWORD || "";
        database = env.MYSQL_DATABASE || env.MARIADB_DATABASE || "mysql";
    } else if (dbType === "mongodb") {
        user = env.MONGO_INITDB_ROOT_USERNAME || "root";
        password = env.MONGO_INITDB_ROOT_PASSWORD || "";
        database = env.MONGO_INITDB_DATABASE || "admin";
    } else if (dbType === "redis") {
        password = env.REDIS_PASSWORD || env.REQUIREPASS || "";
        user = "";
        database = "";
    } else if (dbType === "mssql") {
        user = "sa";
        password = env.SA_PASSWORD || env.MSSQL_SA_PASSWORD || "";
        database = env.MSSQL_DATABASE || "master";
    } else if (dbType === "cassandra") {
        user = env.CASSANDRA_USER || "cassandra";
        password = env.CASSANDRA_PASSWORD || "cassandra";
        database = env.CASSANDRA_KEYSPACE || "";
    } else if (dbType === "clickhouse") {
        user = env.CLICKHOUSE_USER || "default";
        password = env.CLICKHOUSE_PASSWORD || "";
        database = env.CLICKHOUSE_DB || "default";
    } else if (dbType === "influxdb") {
        user = env.DOCKER_INFLUXDB_INIT_USERNAME || "admin";
        password = env.DOCKER_INFLUXDB_INIT_PASSWORD || env.INFLUXDB_ADMIN_TOKEN || "";
        database = env.DOCKER_INFLUXDB_INIT_BUCKET || env.DOCKER_INFLUXDB_INIT_ORG || "";
    } else if (dbType === "couchdb") {
        user = env.COUCHDB_USER || "admin";
        password = env.COUCHDB_PASSWORD || "";
        database = "";
    } else if (dbType === "neo4j") {
        user = "neo4j";
        password = (env.NEO4J_AUTH && env.NEO4J_AUTH.includes("/")) ? env.NEO4J_AUTH.split("/")[1] : (env.NEO4J_AUTH || "");
        database = "neo4j";
    } else if (dbType === "elasticsearch") {
        user = env.ELASTIC_USERNAME || "elastic";
        password = env.ELASTIC_PASSWORD || "";
        database = "";
    } else if (dbType === "memcached") {
        user = "";
        password = "";
        database = "";
    }
    return { dbType, user, password, database };
}

// ─── SQL execution inside container (no host CLI needed) ──────────────────

async function runSqlInContainer(
    containerName: string,
    dbType: string,
    user: string,
    password: string,
    database: string,
    query: string
): Promise<string> {
    let cmd = "";
    const q = query.replace(/"/g, '\\"');

    switch (dbType) {
        case "postgresql":
            cmd = `docker exec ${containerName} sh -c "PGPASSWORD='${password}' psql -U ${user} -d ${database} -c \\"${q}\\" 2>&1"`;
            break;
        case "mysql":
        case "mariadb":
            cmd = `docker exec ${containerName} sh -c "mysql -u${user} -p'${password}' ${database} -e \\"${q}\\" 2>&1"`;
            break;
        case "mongodb":
            cmd = `docker exec ${containerName} sh -c "mongosh -u ${user} -p '${password}' --authenticationDatabase admin ${database} --eval '${query}' 2>&1"`;
            break;
        case "redis": {
            const authPart = password ? `-a '${password}'` : "";
            cmd = `docker exec ${containerName} sh -c "redis-cli ${authPart} ${query} 2>&1"`;
            break;
        }
        case "mssql":
            cmd = `docker exec ${containerName} sh -c "/opt/mssql-tools/bin/sqlcmd -S localhost -U ${user} -P '${password}' -d ${database} -Q \\"${q}\\" 2>&1"`;
            break;
        case "cassandra":
            cmd = `docker exec ${containerName} sh -c "cqlsh -u ${user} -p '${password}' -e \\"${q}\\" 2>&1"`;
            break;
        case "clickhouse":
            cmd = `docker exec ${containerName} sh -c "clickhouse-client -u ${user} --password '${password}' --database ${database} --query \\"${q}\\" 2>&1"`;
            break;
        case "influxdb":
            cmd = `docker exec ${containerName} sh -c "influx query '${query}' --org '${database}' --token '${password}' 2>&1"`;
            break;
        case "couchdb":
            cmd = `docker exec ${containerName} sh -c "curl -s -u ${user}:'${password}' http://localhost:5984/${database}/_all_docs 2>&1"`;
            break;
        case "neo4j":
            cmd = `docker exec ${containerName} sh -c "cypher-shell -u ${user} -p '${password}' \\"${q}\\" 2>&1"`;
            break;
        case "elasticsearch":
            cmd = `docker exec ${containerName} sh -c "curl -s -u ${user}:'${password}' -X GET 'http://localhost:9200/${database}/_search?pretty' -H 'Content-Type: application/json' -d '${q}' 2>&1"`;
            break;
        case "memcached": {
            const trimmed = query.trim();
            cmd = `docker exec ${containerName} sh -c "printf '%s\\r\\nquit\\r\\n' \\"${trimmed}\\" | nc -q1 localhost 11211 2>&1"`;
            break;
        }
        default:
            throw new Error(`SQL execution not supported for ${dbType}`);
    }

    return dockerService.execInContainer(containerName, cmd);
}

async function runBackupInContainer(
    containerName: string,
    dbType: string,
    user: string,
    password: string,
    database: string,
    outputPath: string
): Promise<string> {
    let cmd = "";

    switch (dbType) {
        case "postgresql":
            cmd = `docker exec ${containerName} sh -c "PGPASSWORD='${password}' pg_dump -U ${user} -d ${database} -F c -f ${outputPath} 2>&1 && echo 'Backup complete: ${outputPath}'"`;
            break;
        case "mysql":
        case "mariadb":
            cmd = `docker exec ${containerName} sh -c "mysqldump -u${user} -p'${password}' ${database} > ${outputPath} 2>&1 && echo 'Backup complete: ${outputPath}'"`;
            break;
        case "mongodb":
            cmd = `docker exec ${containerName} sh -c "mongodump -u ${user} -p '${password}' --authenticationDatabase admin --db ${database} --archive=${outputPath} 2>&1 && echo 'Backup complete: ${outputPath}'"`;
            break;
        case "redis": {
            const authPart = password ? `-a '${password}'` : "";
            cmd = `docker exec ${containerName} sh -c "redis-cli ${authPart} SAVE && cp /data/dump.rdb ${outputPath} 2>&1 && echo 'Backup complete: ${outputPath}'"`;
            break;
        }
        case "mssql":
            cmd = `docker exec ${containerName} sh -c "/opt/mssql-tools/bin/sqlcmd -S localhost -U ${user} -P '${password}' -Q \\"BACKUP DATABASE [${database}] TO DISK='${outputPath}'\\" 2>&1"`;
            break;
        case "clickhouse":
            cmd = `docker exec ${containerName} sh -c "clickhouse-client -u ${user} --password '${password}' --query 'BACKUP DATABASE ${database} TO File(\\'${outputPath}\\')' 2>&1"`;
            break;
        case "influxdb":
            cmd = `docker exec ${containerName} sh -c "influx backup ${outputPath} --org '${database}' --token '${password}' 2>&1 && echo 'Backup complete: ${outputPath}'"`;
            break;
        case "couchdb":
            cmd = `docker exec ${containerName} sh -c "curl -s -u ${user}:'${password}' http://localhost:5984/${database}/_all_docs?include_docs=true > ${outputPath} 2>&1 && echo 'Backup complete: ${outputPath}'"`;
            break;
        case "neo4j":
            cmd = `docker exec ${containerName} sh -c "neo4j-admin database dump ${database} --to-path=${outputPath} 2>&1 && echo 'Backup complete: ${outputPath}'"`;
            break;
        case "elasticsearch":
            throw new Error("Elasticsearch needs a registered snapshot repository — use the Snapshot API instead of a plain file dump.");
        case "memcached":
            throw new Error("Memcached only stores data in memory, so there is nothing on disk to back up.");
        default:
            throw new Error(`Backup not supported for ${dbType}`);
    }

    return dockerService.execInContainer(containerName, cmd);
}

// ─── Mini components ──────────────────────────────────────────────────────────

function CopyBtn({ text, size = "sm" }: { text: string; size?: "sm" | "xs" }) {
    const [ok, setOk] = useState(false);
    return (
        <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}
            className={cn("rounded hover:bg-white/10 transition-colors text-zinc-500 hover:text-zinc-300 shrink-0", size === "xs" ? "p-0.5" : "p-1")}>
            {ok ? <Check className={size === "xs" ? "w-2.5 h-2.5 text-emerald-500" : "w-3 h-3 text-emerald-500"} /> : <Copy className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />}
        </button>
    );
}

function InfoRow({ label, value, mono, copy, color }: { label: string; value: string; mono?: boolean; copy?: boolean; color?: string }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 gap-4">
            <span className="text-[11px] text-zinc-500 shrink-0 w-36 font-medium">{label}</span>
            <div className="flex items-center gap-1.5 min-w-0 ml-auto">
                <span className={cn("text-[11px] text-right truncate", mono && "font-mono", color || "text-zinc-200")}>{value || "—"}</span>
                {copy && value && <CopyBtn text={value} />}
            </div>
        </div>
    );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn("rounded-2xl border border-white/8 bg-zinc-900/60 p-5", className)}>{children}</div>;
}

function SectionHead({ icon: Icon, title, action }: { icon: React.ElementType; title: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{title}</span>
            </div>
            {action}
        </div>
    );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
    return (
        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden mt-2">
            <div className={`h-full rounded-full transition-all duration-700 bg-${color}-500`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
    );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{label}</label>
            {children}
        </div>
    );
}

// Small helper for the "something went wrong" states so Overview/Config never
// get stuck on an endless spinner when a fetch fails.
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-400/70" />
            <p className="text-xs text-red-400 font-mono max-w-md break-all">{message}</p>
            <button onClick={onRetry}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-white/10 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
        </div>
    );
}

const inputCls = "w-full h-8 px-3 text-xs bg-zinc-900 border border-white/10 rounded-lg text-zinc-200 focus:outline-none focus:border-white/20 font-mono";
const selectCls = "w-full h-8 px-2 text-xs bg-zinc-900 border border-white/10 rounded-lg text-zinc-200 focus:outline-none";

// ─── Tabs content ─────────────────────────────────────────────────────────────

function StatsTab({ stats, details, isRunning, onStart, busy }: {
    stats: ContainerStats | null;
    details: ContainerDetails | null;
    isRunning: boolean;
    onStart: () => void;
    busy: boolean;
}) {
    if (!isRunning) return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <Square className="w-10 h-10 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-400 mb-1">Container is stopped</p>
            <p className="text-xs text-zinc-600 mb-5">Start it to see live metrics</p>
            <button onClick={onStart} disabled={busy}
                className="flex items-center gap-1.5 px-4 h-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-all disabled:opacity-50">
                <Play className="w-3.5 h-3.5" /> Start Container
            </button>
        </div>
    );

    if (!stats) return (
        <div className="flex items-center justify-center py-20 text-zinc-600">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Collecting metrics...
        </div>
    );

    const memPct = stats.mem_limit_mb > 0 ? (stats.mem_used_mb / stats.mem_limit_mb) * 100 : 0;
    const cpuPct = parseFloat(stats.cpu);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "CPU", value: stats.cpu, pct: cpuPct, color: "blue", icon: Cpu },
                    { label: "Memory", value: stats.memory, pct: memPct, color: "violet", icon: HardDrive },
                    { label: "Net In", value: stats.net.split(" / ")[0], sub: `↓ ${stats.net.split(" / ")[1]}`, color: "emerald", icon: Network },
                    { label: "Block I/O", value: stats.block.split(" / ")[0], sub: `write ${stats.block.split(" / ")[1]}`, color: "amber", icon: Activity },
                ].map(({ label, value, pct, sub, color, icon: Icon }) => (
                    <div key={label} className={`rounded-2xl border border-${color}-500/15 bg-${color}-500/5 p-4 space-y-2`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-widest text-${color}-400`}>{label}</span>
                            <Icon className={`w-3.5 h-3.5 text-${color}-400/50`} />
                        </div>
                        <span className="text-xl font-bold font-mono text-white block">{value}</span>
                        {pct !== undefined ? <MiniBar pct={pct} color={color} /> : <span className="text-[10px] text-zinc-500">{sub}</span>}
                        {sub && pct !== undefined && <span className="text-[10px] text-zinc-500">{sub}</span>}
                    </div>
                ))}
            </div>
            {details && details.pid > 0 && (
                <Panel>
                    <SectionHead icon={Settings} title="Process" />
                    <InfoRow label="PID" value={String(details.pid)} mono />
                    <InfoRow label="Hostname" value={details.hostname || "—"} mono copy />
                    <InfoRow label="Working Dir" value={details.working_dir || "/"} mono />
                    <InfoRow label="User" value={details.user || "root"} mono />
                </Panel>
            )}
        </div>
    );
}

function LogsTab({ containerName }: { containerName: string }) {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [tail, setTail] = useState(200);
    const [filter, setFilter] = useState("");
    const [autoScroll, setAutoScroll] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        try { setLogs(await dockerService.getContainerLogs(containerName, tail)); }
        catch { setLogs(["Failed to fetch logs."]); }
        finally { setLoading(false); }
    }, [containerName, tail]);

    useEffect(() => { fetch(); }, [fetch]);
    useEffect(() => { if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs, autoScroll]);

    const filtered = filter ? logs.filter(l => l.toLowerCase().includes(filter.toLowerCase())) : logs;

    const lineColor = (l: string) => {
        if (/error|err|fail|fatal|critical/i.test(l)) return "text-red-400";
        if (/warn|warning/i.test(l)) return "text-amber-400";
        if (/info|ready|started|listening|connected|success/i.test(l)) return "text-emerald-400";
        if (/debug/i.test(l)) return "text-blue-400/70";
        return "text-zinc-400";
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <input type="text" placeholder="Filter logs..." value={filter} onChange={e => setFilter(e.target.value)}
                    className="flex-1 h-8 px-3 text-xs bg-zinc-900 border border-white/10 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none font-mono" />
                <select value={tail} onChange={e => setTail(Number(e.target.value))}
                    className="h-8 px-2 text-xs bg-zinc-900 border border-white/10 rounded-lg text-zinc-400 focus:outline-none">
                    {[50, 100, 200, 500, 1000].map(n => <option key={n} value={n}>Last {n}</option>)}
                </select>
                <button onClick={() => setAutoScroll(a => !a)}
                    className={cn("h-8 px-3 text-[10px] font-medium rounded-lg border transition-colors", autoScroll ? "bg-blue-500/15 border-blue-500/30 text-blue-400" : "bg-zinc-900 border-white/10 text-zinc-500")}>
                    Auto
                </button>
                <button onClick={fetch} disabled={loading}
                    className="w-8 h-8 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 flex items-center justify-center transition-colors">
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                </button>
                <button onClick={() => navigator.clipboard.writeText(filtered.join("\n"))}
                    className="w-8 h-8 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 flex items-center justify-center transition-colors">
                    <Copy className="w-3 h-3" />
                </button>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/70 font-mono text-[11px] h-[420px] overflow-y-auto p-4 space-y-px">
                {loading && logs.length === 0 ? (
                    <div className="flex items-center gap-2 text-zinc-600"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</div>
                ) : filtered.length === 0 ? (
                    <span className="text-zinc-600">No logs found.</span>
                ) : filtered.map((line, i) => (
                    <div key={i} className="flex gap-2 hover:bg-white/3 rounded px-1 py-0.5">
                        <span className="text-zinc-700 select-none shrink-0 w-8 text-right">{i + 1}</span>
                        <span className={lineColor(line)}>{line}</span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-600">
                <span>{filtered.length} lines{filter && ` (filtered from ${logs.length})`}</span>
                <span>{filter && `Matching: "${filter}"`}</span>
            </div>
        </div>
    );
}

function SqlTab({ containerName, image, envVars }: { containerName: string; image: string; envVars: string[] }) {
    const creds = extractCreds(image, envVars);
    const [dbType, setDbType] = useState(creds.dbType);
    const [user, setUser] = useState(creds.user);
    const [password, setPassword] = useState(creds.password);
    const [database, setDatabase] = useState(creds.database);
    const [query, setQuery] = useState("SELECT version();");
    const [result, setResult] = useState("");
    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");

    const QUICK = [
        { label: "Version", q: "SELECT version();" },
        { label: "Databases", q: "SELECT datname FROM pg_database;" },
        { label: "Tables", q: "SELECT tablename FROM pg_tables WHERE schemaname='public';" },
        { label: "Connections", q: "SELECT count(*) FROM pg_stat_activity;" },
        { label: "DB Size", q: "SELECT pg_database_size(current_database());" },
        { label: "Running queries", q: "SELECT pid, query, state FROM pg_stat_activity WHERE state='active';" },
    ];

    const run = async () => {
        if (!query.trim()) return;
        setRunning(true);
        setError("");
        setResult("");
        try {
            const res = await runSqlInContainer(containerName, dbType, user, password, database, query);
            setResult(res);
        } catch (e) { setError(String(e)); }
        finally { setRunning(false); }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FieldRow label="DB Type">
                    <select value={dbType} onChange={e => setDbType(e.target.value)} className={selectCls}>
                        {SQL_SUPPORTED_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </FieldRow>
                <FieldRow label="User">
                    <input value={user} onChange={e => setUser(e.target.value)} className={inputCls} />
                </FieldRow>
                <FieldRow label="Password">
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
                </FieldRow>
                <FieldRow label="Database">
                    <input value={database} onChange={e => setDatabase(e.target.value)} className={inputCls} />
                </FieldRow>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {QUICK.map(({ label, q }) => (
                    <button key={label} onClick={() => setQuery(q)}
                        className="px-2.5 py-1 text-[10px] rounded-lg border border-white/10 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200 transition-colors font-mono">
                        {label}
                    </button>
                ))}
            </div>

            <div className="relative">
                <textarea value={query} onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run(); }}
                    rows={5}
                    className="w-full px-4 py-3 text-[12px] bg-black/60 border border-white/10 rounded-xl text-emerald-300 font-mono focus:outline-none focus:border-white/20 resize-none"
                    placeholder="-- Write SQL here (Ctrl+Enter to run)" />
                <button onClick={run} disabled={running || !query.trim()}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50 transition-colors">
                    {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Run
                </button>
            </div>

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <pre className="whitespace-pre-wrap break-all">{error}</pre>
                </div>
            )}

            {result && !error && (
                <div className="rounded-xl border border-white/8 bg-black/60 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Result</span>
                        <CopyBtn text={result} />
                    </div>
                    <pre className="font-mono text-[11px] text-zinc-300 whitespace-pre-wrap break-all max-h-72 overflow-auto">{result}</pre>
                </div>
            )}
        </div>
    );
}

function BackupTab({ containerName, image, envVars }: { containerName: string; image: string; envVars: string[] }) {
    const creds = extractCreds(image, envVars);
    const [dbType, setDbType] = useState(creds.dbType);
    const [user, setUser] = useState(creds.user);
    const [password, setPassword] = useState(creds.password);
    const [database, setDatabase] = useState(creds.database);
    const [outputPath, setOutputPath] = useState(`/tmp/${creds.database || "backup"}_${new Date().toISOString().slice(0, 10)}.dump`);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState("");
    const [error, setError] = useState("");
    const [history, setHistory] = useState<Array<{ path: string; db: string; date: string; ok: boolean }>>([]);

    const run = async () => {
        setRunning(true);
        setResult("");
        setError("");
        try {
            const out = await runBackupInContainer(containerName, dbType, user, password, database, outputPath);
            setResult(out);
            setHistory(h => [{ path: outputPath, db: database, date: new Date().toLocaleString(), ok: true }, ...h]);
        } catch (e) {
            setError(String(e));
            setHistory(h => [{ path: outputPath, db: database, date: new Date().toLocaleString(), ok: false }, ...h]);
        } finally { setRunning(false); }
    };

    const RESTORE_HINTS: Record<string, string> = {
        postgresql: `PGPASSWORD='...' pg_restore -U ${user} -d ${database} -F c /path/to/backup.dump`,
        mysql: `mysql -u${user} -p'...' ${database} < /path/to/backup.sql`,
        mariadb: `mysql -u${user} -p'...' ${database} < /path/to/backup.sql`,
        mongodb: `mongorestore -u ${user} -p '...' --authenticationDatabase admin --archive=/path/to/backup.dump`,
        redis: `cp /path/to/dump.rdb /data/dump.rdb && redis-server --requirepass '...'`,
        mssql: `RESTORE DATABASE [${database}] FROM DISK='/path/to/backup.bak'`,
        clickhouse: `clickhouse-client --query "RESTORE DATABASE ${database} FROM File('/path/to/backup')"`,
        influxdb: `influx restore /path/to/backup --org '${database}' --token '...'`,
        couchdb: `curl -u ${user}:'...' -X POST http://localhost:5984/${database}/_bulk_docs -d @/path/to/backup`,
        neo4j: `neo4j-admin database load ${database} --from-path=/path/to/backup`,
    };

    // Types the underlying backup runner doesn't support at all (no dump mechanism).
    const isUnsupported = !BACKUP_SUPPORTED_TYPES.includes(dbType);

    return (
        <div className="space-y-4">
            <Panel>
                <SectionHead icon={Download} title="Create Backup" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <FieldRow label="DB Type">
                        <select value={dbType} onChange={e => setDbType(e.target.value)} className={selectCls}>
                            {SQL_SUPPORTED_TYPES.map(t => (
                                <option key={t} value={t}>{t}{!BACKUP_SUPPORTED_TYPES.includes(t) ? " (unsupported)" : ""}</option>
                            ))}
                        </select>
                    </FieldRow>
                    <FieldRow label="User">
                        <input value={user} onChange={e => setUser(e.target.value)} className={inputCls} />
                    </FieldRow>
                    <FieldRow label="Password">
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
                    </FieldRow>
                    <FieldRow label="Database">
                        <input value={database} onChange={e => setDatabase(e.target.value)} className={inputCls} />
                    </FieldRow>
                </div>
                <div className="flex gap-2 mb-4">
                    <FieldRow label="Output Path (inside container)">
                        <input value={outputPath} onChange={e => setOutputPath(e.target.value)} className={cn(inputCls, "w-full")} />
                    </FieldRow>
                    <div className="flex items-end shrink-0">
                        <button onClick={run} disabled={running || isUnsupported}
                            title={isUnsupported ? `Backups aren't supported for ${dbType}` : undefined}
                            className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-50 transition-colors">
                            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            {running ? "Running..." : "Backup Now"}
                        </button>
                    </div>
                </div>

                {isUnsupported && !error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                            {dbType === "memcached"
                                ? "Memcached only keeps data in memory, so there's nothing to back up."
                                : dbType === "elasticsearch"
                                    ? "Elasticsearch backups need a snapshot repository configured first — the Snapshot API can't be driven from a plain file dump."
                                    : `Backups aren't implemented for ${dbType} yet.`}
                        </span>
                    </div>
                )}

                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <pre className="whitespace-pre-wrap break-all">{error}</pre>
                    </div>
                )}
                {result && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-mono">
                        <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <pre className="whitespace-pre-wrap break-all">{result}</pre>
                    </div>
                )}
            </Panel>

            {history.length > 0 && (
                <Panel>
                    <SectionHead icon={FolderOpen} title="Backup History" />
                    <div className="space-y-2">
                        {history.map((b, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 border border-white/6">
                                <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
                                    b.ok ? "bg-blue-500/10 border-blue-500/20" : "bg-red-500/10 border-red-500/20")}>
                                    {b.ok ? <Save className="w-3.5 h-3.5 text-blue-400" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-mono text-zinc-200 truncate">{b.path}</div>
                                    <div className="text-[10px] text-zinc-500 mt-0.5">{b.db} · {b.date}</div>
                                </div>
                                <CopyBtn text={b.path} />
                            </div>
                        ))}
                    </div>
                </Panel>
            )}

            {RESTORE_HINTS[dbType] && (
                <Panel>
                    <SectionHead icon={Shield} title="Restore Command" />
                    <div className="p-3 rounded-xl bg-zinc-800/60 border border-white/6 font-mono text-[11px] text-zinc-300 flex items-start gap-2">
                        <pre className="flex-1 whitespace-pre-wrap break-all">{RESTORE_HINTS[dbType]}</pre>
                        <CopyBtn text={RESTORE_HINTS[dbType]} />
                    </div>
                </Panel>
            )}
        </div>
    );
}

function ShellTab({ containerName }: { containerName: string }) {
    const [cmd, setCmd] = useState("");
    const [history, setHistory] = useState<Array<{ cmd: string; out: string; ok: boolean }>>([]);
    const [running, setRunning] = useState(false);
    const [histIdx, setHistIdx] = useState(-1);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const cmds = history.map(h => h.cmd).reverse();

    const run = async () => {
        const c = cmd.trim();
        if (!c) return;
        setRunning(true);
        setCmd("");
        setHistIdx(-1);
        try {
            const out = await dockerService.execInContainer(containerName, c);
            setHistory(h => [...h, { cmd: c, out, ok: true }]);
        } catch (e) {
            setHistory(h => [...h, { cmd: c, out: String(e), ok: false }]);
        } finally { setRunning(false); setTimeout(() => inputRef.current?.focus(), 50); }
    };

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

    const QUICK_CMDS = [
        { label: "df -h", cmd: "df -h" },
        { label: "free -m", cmd: "free -m" },
        { label: "ps aux", cmd: "ps aux" },
        { label: "ls /", cmd: "ls /" },
        { label: "env", cmd: "env" },
        { label: "top -bn1", cmd: "top -bn1 | head -20" },
        { label: "cat /etc/os-release", cmd: "cat /etc/os-release" },
        { label: "netstat -tlnp", cmd: "netstat -tlnp 2>/dev/null || ss -tlnp" },
    ];

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
                {QUICK_CMDS.map(({ label, cmd: c }) => (
                    <button key={label} onClick={() => { setCmd(c); inputRef.current?.focus(); }}
                        className="px-2.5 py-1 text-[10px] rounded-lg border border-white/10 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200 transition-colors font-mono">
                        {label}
                    </button>
                ))}
            </div>
            <div className="rounded-xl border border-white/8 bg-black/70 font-mono text-[11px] h-[380px] overflow-y-auto p-4 space-y-2">
                {history.length === 0 && <div className="text-zinc-600">Shell ready — type a command below</div>}
                {history.map((h, i) => (
                    <div key={i}>
                        <div className="flex items-center gap-2 text-zinc-300">
                            <span className="text-emerald-500 select-none">$</span>
                            <span>{h.cmd}</span>
                        </div>
                        <pre className={cn("pl-4 text-[10px] whitespace-pre-wrap break-all mt-0.5", h.ok ? "text-zinc-400" : "text-red-400")}>{h.out}</pre>
                    </div>
                ))}
                {running && <div className="flex items-center gap-2 text-zinc-500"><Loader2 className="w-3 h-3 animate-spin" /> Running...</div>}
                <div ref={bottomRef} />
            </div>
            <div className="flex gap-2">
                <div className="flex items-center gap-2 flex-1 px-3 h-9 bg-zinc-900/80 border border-white/10 rounded-lg focus-within:border-white/20 transition-colors">
                    <span className="text-emerald-500 font-mono text-xs select-none shrink-0">$</span>
                    <input ref={inputRef} value={cmd} onChange={e => setCmd(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === "Enter") { run(); }
                            if (e.key === "ArrowUp") { const i = Math.min(histIdx + 1, cmds.length - 1); setHistIdx(i); setCmd(cmds[i] || ""); }
                            if (e.key === "ArrowDown") { const i = Math.max(histIdx - 1, -1); setHistIdx(i); setCmd(i >= 0 ? cmds[i] : ""); }
                        }}
                        className="flex-1 bg-transparent text-xs text-zinc-200 font-mono focus:outline-none placeholder:text-zinc-600"
                        placeholder="echo hello"
                        disabled={running}
                        autoFocus
                    />
                </div>
                <button onClick={run} disabled={running || !cmd.trim()}
                    className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs disabled:opacity-50 transition-colors">
                    {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setHistory([])}
                    className="h-9 px-3 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 text-xs transition-colors">
                    Clear
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DatabaseDetailPage() {
    const { containerName } = useParams<{ containerName: string }>();
    const navigate = useNavigate();
    const name = containerName ?? "";

    const [container, setContainer] = useState<ContainerInfo | null>(null);
    const [details, setDetails] = useState<ContainerDetails | null>(null);
    const [stats, setStats] = useState<ContainerStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Separate error state for the initial "which container/what does it look like"
    // fetch, and for the detail inspection fetch, so a failure in either one is
    // visible instead of leaving the UI stuck on a spinner forever.
    const [pageError, setPageError] = useState<string | null>(null);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [uptime, setUptime] = useState("—");
    const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const uptimeRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchContainer = useCallback(async () => {
        try {
            const list = await dockerService.listContainers(true);
            setContainer(list.find(c => c.name === name) ?? null);
            setPageError(null);
        } catch (e) {
            setPageError(String(e));
        }
    }, [name]);

    const fetchDetails = useCallback(async () => {
        try {
            setDetails(await dockerService.inspectContainer(name));
            setDetailsError(null);
        } catch (e) {
            setDetailsError(String(e));
        }
    }, [name]);

    const fetchStats = useCallback(async () => {
        try { setStats(await dockerService.getContainerStats(name)); } catch { }
    }, [name]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([fetchContainer(), fetchDetails()]);
        } finally {
            // Always clear the top-level spinner, even if one of the fetches
            // failed — the failure is surfaced via pageError/detailsError instead.
            setLoading(false);
        }
    }, [fetchContainer, fetchDetails]);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (statsRef.current) clearInterval(statsRef.current);
        if (uptimeRef.current) clearInterval(uptimeRef.current);

        if (container?.state === "running") {
            fetchStats();
            statsRef.current = setInterval(fetchStats, 5000);
            if (details?.started_at) {
                const tick = () => setUptime(formatUptime(details.started_at));
                tick();
                uptimeRef.current = setInterval(tick, 1000);
            }
        } else {
            setStats(null);
            setUptime("—");
        }
        return () => {
            if (statsRef.current) clearInterval(statsRef.current);
            if (uptimeRef.current) clearInterval(uptimeRef.current);
        };
    }, [container?.state, details?.started_at]);

    const act = async (label: string, fn: () => Promise<unknown>) => {
        setBusy(label);
        setError(null);
        try { await fn(); await loadData(); }
        catch (e) { setError(String(e)); }
        finally { setBusy(null); }
    };

    const handleRemove = async () => {
        if (!confirm(`Permanently remove "${name}"?`)) return;
        setBusy("remove");
        try { await dockerService.removeContainer(name, false); navigate(-1); }
        catch (e) { setError(String(e)); setBusy(null); }
    };

    const isRunning = container?.state === "running";
    const preset = DB_PRESETS.find(p => container?.image.toLowerCase().includes(p.id));
    const port = container?.ports[0]?.host_port;

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="flex items-center gap-3 text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
            </div>
        </div>
    );

    if (pageError && !container) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 gap-3">
            <AlertCircle className="w-10 h-10 text-red-400/70" />
            <h2 className="text-base font-semibold text-zinc-200">Couldn't load this container</h2>
            <p className="text-xs text-red-400 font-mono max-w-md break-all">{pageError}</p>
            <div className="flex gap-2 mt-1">
                <button onClick={loadData} className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-white/10 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
                <Button size="sm" variant="outline" onClick={() => navigate(-1)} className="gap-1.5 text-xs border-white/10">
                    <ArrowLeft className="w-3.5 h-3.5" /> Go back
                </Button>
            </div>
        </div>
    );

    if (!container) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <AlertCircle className="w-10 h-10 text-zinc-700 mb-4" />
            <h2 className="text-base font-semibold text-zinc-200 mb-1.5">Container not found</h2>
            <p className="text-xs text-zinc-500 mb-5">No container named <code className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded">{name}</code></p>
            <Button size="sm" variant="outline" onClick={() => navigate(-1)} className="gap-1.5 text-xs border-white/10">
                <ArrowLeft className="w-3.5 h-3.5" /> Go back
            </Button>
        </div>
    );

    const envVars = details?.env_vars ?? [];

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-5 max-w-6xl mx-auto space-y-5">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)}
                    className="w-8 h-8 rounded-xl border border-white/10 bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">
                    <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                    <span>Databases</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-zinc-300 font-medium">{container.name}</span>
                </div>
            </div>

            {/* Hero */}
            <div className="rounded-2xl border border-white/8 bg-zinc-900/60 p-5 relative overflow-hidden">
                {preset && (
                    <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                        style={{ background: `radial-gradient(circle at 80% 50%, ${preset.color}, transparent 60%)` }} />
                )}
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 border"
                        style={preset
                            ? { backgroundColor: preset.color + "15", borderColor: preset.color + "30" }
                            : { backgroundColor: "#ffffff08", borderColor: "#ffffff15" }}>
                        {preset?.icon ?? "🗄️"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-lg font-bold tracking-tight">{container.name}</h1>
                            <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold",
                                isRunning ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-zinc-800 border-white/10 text-zinc-400")}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-500")} />
                                {container.state}
                            </div>
                            {preset && (
                                <span className="px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-semibold text-zinc-400 bg-zinc-800/60 capitalize">
                                    {preset.category}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 font-mono">{container.image}</p>
                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                            {port && (
                                <div className="flex items-center gap-1.5">
                                    <Server className="w-3 h-3 text-zinc-600" />
                                    <span className="text-xs font-mono text-zinc-300">:{port}</span>
                                    <a href={`http://localhost:${port}`} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-zinc-400 transition-colors">
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-zinc-600" />
                                <span className="text-xs text-zinc-500">Uptime: <span className="text-zinc-300 font-mono">{uptime}</span></span>
                            </div>
                            {details?.ip_address && (
                                <div className="flex items-center gap-1.5">
                                    <Wifi className="w-3 h-3 text-zinc-600" />
                                    <span className="text-xs font-mono text-zinc-500">{details.ip_address}</span>
                                    <CopyBtn text={details.ip_address} size="xs" />
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Box className="w-3 h-3 text-zinc-600" />
                                <span className="text-xs font-mono text-zinc-500">{container.id.slice(0, 12)}</span>
                                <CopyBtn text={container.id} size="xs" />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {isRunning ? (
                            <button onClick={() => act("stop", () => dockerService.stopContainer(name))} disabled={!!busy}
                                className="flex items-center gap-1.5 px-3 h-8 rounded-xl border border-white/10 bg-zinc-800/80 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400 text-zinc-300 text-xs font-medium transition-all disabled:opacity-50">
                                {busy === "stop" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                                Stop
                            </button>
                        ) : (
                            <button onClick={() => act("start", () => dockerService.startContainer(name))} disabled={!!busy}
                                className="flex items-center gap-1.5 px-3 h-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-all disabled:opacity-50">
                                {busy === "start" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                Start
                            </button>
                        )}
                        <button onClick={() => act("restart", () => dockerService.restartContainer(name))} disabled={!!busy}
                            className="flex items-center gap-1.5 px-3 h-8 rounded-xl border border-white/10 bg-zinc-800/80 hover:bg-amber-500/15 hover:border-amber-500/30 hover:text-amber-400 text-zinc-300 text-xs font-medium transition-all disabled:opacity-50">
                            {busy === "restart" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                            Restart
                        </button>
                        <button onClick={loadData} disabled={!!busy}
                            className="w-8 h-8 rounded-xl border border-white/10 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center transition-all">
                            <RefreshCw className={cn("w-3.5 h-3.5", !!busy && "animate-spin")} />
                        </button>
                        <button onClick={handleRemove}
                            className="w-8 h-8 rounded-xl border border-white/10 bg-zinc-800/80 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400 text-zinc-500 flex items-center justify-center transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono flex-1">{error}</span>
                    <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
                </div>
            )}

            {isRunning && stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { icon: Cpu, label: "CPU", value: stats.cpu, color: "blue" },
                        { icon: HardDrive, label: "Memory", value: stats.memory, color: "violet" },
                        { icon: Network, label: "Network", value: stats.net.split(" / ")[0], color: "emerald" },
                        { icon: Activity, label: "Block I/O", value: stats.block.split(" / ")[0], color: "amber" },
                    ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className={`rounded-xl border border-${color}-500/15 bg-${color}-500/5 px-4 py-3 flex items-center gap-3`}>
                            <Icon className={`w-4 h-4 text-${color}-400 shrink-0`} />
                            <div>
                                <div className="text-[10px] text-zinc-500">{label}</div>
                                <div className={`text-sm font-bold font-mono text-${color}-300`}>{value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-zinc-900 border border-white/8 rounded-xl p-1 h-auto flex gap-0.5 flex-wrap">
                    {[
                        { value: "overview", icon: Info, label: "Overview" },
                        { value: "config", icon: Settings, label: "Config" },
                        { value: "stats", icon: Activity, label: "Stats" },
                        { value: "logs", icon: Terminal, label: "Logs" },
                        { value: "sql", icon: Database, label: "SQL Runner" },
                        { value: "backup", icon: Download, label: "Backup" },
                        { value: "shell", icon: Zap, label: "Shell" },
                    ].map(({ value, icon: Icon, label }) => (
                        <TabsTrigger key={value} value={value}
                            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-500 hover:text-zinc-300 transition-all">
                            <Icon className="w-3 h-3" />{label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-0">
                    {detailsError ? (
                        <ErrorState message={detailsError} onRetry={fetchDetails} />
                    ) : details ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Panel>
                                <SectionHead icon={Box} title="Container" />
                                <InfoRow label="ID" value={details.id} mono copy />
                                <InfoRow label="Name" value={details.name} mono />
                                <InfoRow label="Image" value={details.image} mono copy />
                                <InfoRow label="State" value={details.state} color={isRunning ? "text-emerald-400" : "text-zinc-400"} />
                                <InfoRow label="Status" value={details.status} />
                                <InfoRow label="Restart Count" value={String(details.restart_count)} />
                                <InfoRow label="Restart Policy" value={details.restart_policy || "—"} />
                                <InfoRow label="Platform" value={details.platform || "—"} />
                            </Panel>
                            <Panel>
                                <SectionHead icon={Clock} title="Timing" />
                                <InfoRow label="Created" value={formatDate(details.created)} />
                                <InfoRow label="Started At" value={formatDate(details.started_at)} />
                                <InfoRow label="Finished At" value={formatDate(details.finished_at)} />
                                <div className="mt-4" />
                                <SectionHead icon={Server} title="Resources" />
                                <InfoRow label="Memory Limit" value={details.memory_limit > 0 ? formatBytes(details.memory_limit) : "Unlimited"} />
                                <InfoRow label="CPU Shares" value={String(details.cpu_shares || "Default")} />
                                <InfoRow label="IP Address" value={details.ip_address || "—"} mono copy />
                                <InfoRow label="Hostname" value={details.hostname || "—"} mono />
                            </Panel>
                            <Panel>
                                <SectionHead icon={Terminal} title="Runtime" />
                                <InfoRow label="User" value={details.user || "root"} mono />
                                <InfoRow label="Working Dir" value={details.working_dir || "/"} mono />
                                <InfoRow label="Entrypoint" value={details.entrypoint?.join(" ") || "—"} mono />
                                <InfoRow label="Command" value={details.cmd?.join(" ") || "—"} mono />
                                <InfoRow label="Privileged" value={details.privileged ? "Yes" : "No"} />
                                <InfoRow label="PID" value={details.pid > 0 ? String(details.pid) : "—"} mono />
                            </Panel>
                            {details.ports && details.ports.length > 0 && (
                                <Panel>
                                    <SectionHead icon={Network} title="Port Bindings" />
                                    <div className="space-y-2">
                                        {details.ports.map((p, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 border border-white/6">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold font-mono" style={{ color: preset?.color || "#60a5fa" }}>{p.host_port}</span>
                                                    <span className="text-zinc-600 text-xs">→</span>
                                                    <span className="text-xs font-mono text-zinc-400">{p.container_port}/{p.protocol}</span>
                                                </div>
                                                <a href={`http://localhost:${p.host_port}`} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-zinc-400 transition-colors">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </Panel>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-16 text-zinc-600">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading details...
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="config" className="space-y-4 mt-0">
                    {detailsError ? (
                        <ErrorState message={detailsError} onRetry={fetchDetails} />
                    ) : details ? (
                        <>
                            {envVars.length > 0 && (
                                <Panel>
                                    <SectionHead icon={Tag} title="Environment Variables" />
                                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                                        {envVars.map((env, i) => {
                                            const [key, ...vp] = env.split("=");
                                            const val = vp.join("=");
                                            const secret = /password|secret|key|token/i.test(key);
                                            return (
                                                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/40 border border-white/5 text-[11px] font-mono">
                                                    <span className="text-blue-400 shrink-0">{key}</span>
                                                    <span className="text-zinc-600">=</span>
                                                    <span className="flex-1 truncate text-zinc-300">
                                                        {secret ? <span className="text-zinc-600">{"•".repeat(8)}</span> : val}
                                                    </span>
                                                    {!secret && val && <CopyBtn text={val} size="xs" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Panel>
                            )}
                            {details.mounts && details.mounts.length > 0 && (
                                <Panel>
                                    <SectionHead icon={HardDrive} title="Volumes & Mounts" />
                                    <div className="space-y-2">
                                        {details.mounts.map((m, i) => (
                                            <div key={i} className="p-3 rounded-xl bg-zinc-800/40 border border-white/6 space-y-2">
                                                <div className="flex gap-2">
                                                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                                                        m.mount_type === "volume" ? "bg-blue-500/15 text-blue-400" : "bg-zinc-700 text-zinc-400")}>
                                                        {m.mount_type}
                                                    </span>
                                                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                                                        m.rw ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-700 text-zinc-500")}>
                                                        {m.rw ? "rw" : "ro"}
                                                    </span>
                                                </div>
                                                {[["source", m.source], ["target", m.destination]].map(([lbl, val]) => (
                                                    <div key={lbl} className="flex items-center gap-2 text-[11px] font-mono">
                                                        <span className="text-zinc-600 w-12 shrink-0">{lbl}</span>
                                                        <span className="truncate text-zinc-300 flex-1">{val}</span>
                                                        <CopyBtn text={val} size="xs" />
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </Panel>
                            )}
                            {details.labels && details.labels.length > 0 && (
                                <Panel>
                                    <SectionHead icon={Tag} title="Labels" />
                                    <div className="flex flex-wrap gap-2">
                                        {details.labels.map((l, i) => (
                                            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8 bg-zinc-800/40 text-[10px] font-mono">
                                                <span className="text-zinc-500">{l.key}</span>
                                                <span className="text-zinc-700">=</span>
                                                <span className="text-zinc-300">{l.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Panel>
                            )}
                            {envVars.length === 0 && (!details.mounts || details.mounts.length === 0) && (!details.labels || details.labels.length === 0) && (
                                <div className="flex items-center justify-center py-16 text-zinc-600 text-xs">
                                    No env vars, mounts, or labels found for this container.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center py-16 text-zinc-600">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="stats" className="mt-0">
                    <Panel>
                        <StatsTab stats={stats} details={details} isRunning={isRunning}
                            onStart={() => act("start", () => dockerService.startContainer(name))}
                            busy={!!busy} />
                    </Panel>
                </TabsContent>

                <TabsContent value="logs" className="mt-0">
                    <Panel>
                        <SectionHead icon={Terminal} title="Container Logs" />
                        <LogsTab containerName={name} />
                    </Panel>
                </TabsContent>

                <TabsContent value="sql" className="mt-0">
                    <Panel>
                        <SectionHead icon={Database} title="SQL Runner" />
                        <SqlTab containerName={name} image={container.image} envVars={envVars} />
                    </Panel>
                </TabsContent>

                <TabsContent value="backup" className="mt-0">
                    <BackupTab containerName={name} image={container.image} envVars={envVars} />
                </TabsContent>

                <TabsContent value="shell" className="mt-0">
                    <Panel>
                        <SectionHead icon={Zap} title="Execute in Container" />
                        <ShellTab containerName={name} />
                    </Panel>
                </TabsContent>
            </Tabs>
        </div>
    );
}