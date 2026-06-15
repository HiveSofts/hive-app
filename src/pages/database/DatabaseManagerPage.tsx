import { useEffect, useState } from "react";

import { FaDatabase } from "@react-icons/all-files/fa/FaDatabase";
import { SiMongodb } from "@react-icons/all-files/si/SiMongodb";
import { SiMysql } from "@react-icons/all-files/si/SiMysql";
import { SiPostgresql } from "@react-icons/all-files/si/SiPostgresql";
import { SiRedis } from "@react-icons/all-files/si/SiRedis";
import {
    Activity,
    Cpu,
    Database,
    Download,
    Eye,
    HardDrive,
    Play,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Settings,
    Square,
    Terminal,
    Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils.ts";

interface DatabaseService {
    id: string;
    name: string;
    icon: React.ReactNode;
    version: string;
    port: number;
    status: "running" | "stopped" | "error";
    memory: string;
    cpu: string;
    uptime: string;
    dataSize: string;
    connections: number;
}

interface Database {
    id: number;
    name: string;
    service: string;
    size: string;
    tables: number;
    status: "active" | "inactive";
}

const DATABASE_SERVICES: DatabaseService[] = [
    {
        id: "mysql",
        name: "MySQL",
        icon: <SiMysql className="w-5 h-5 text-blue-500" />,
        version: "8.0.37",
        port: 3306,
        status: "running",
        memory: "124 MB",
        cpu: "2%",
        uptime: "14d 8h",
        dataSize: "2.3 GB",
        connections: 4,
    },
    {
        id: "postgresql",
        name: "PostgreSQL",
        icon: <SiPostgresql className="w-5 h-5 text-sky-500" />,
        version: "16.3",
        port: 5432,
        status: "running",
        memory: "98 MB",
        cpu: "1%",
        uptime: "7d 12h",
        dataSize: "1.8 GB",
        connections: 3,
    },
    {
        id: "redis",
        name: "Redis",
        icon: <SiRedis className="w-5 h-5 text-red-500" />,
        version: "7.2.4",
        port: 6379,
        status: "running",
        memory: "12 MB",
        cpu: "0.5%",
        uptime: "21d 3h",
        dataSize: "156 MB",
        connections: 8,
    },
    {
        id: "mongodb",
        name: "MongoDB",
        icon: <SiMongodb className="w-5 h-5 text-green-500" />,
        version: "7.0.5",
        port: 27017,
        status: "stopped",
        memory: "0 MB",
        cpu: "0%",
        uptime: "-",
        dataSize: "-",
        connections: 0,
    },
    {
        id: "mariadb",
        name: "MariaDB",
        icon: <FaDatabase className="w-5 h-5 text-cyan-500" />,
        version: "11.2.2",
        port: 3307,
        status: "error",
        memory: "0 MB",
        cpu: "0%",
        uptime: "-",
        dataSize: "-",
        connections: 0,
    },
];

const MOCK_DATABASES: Database[] = [
    { id: 1, name: "my_blog_db", service: "mysql", size: "128 MB", tables: 24, status: "active" },
    { id: 2, name: "api_db", service: "postgresql", size: "256 MB", tables: 42, status: "active" },
    { id: 3, name: "cache_store", service: "redis", size: "64 MB", tables: 0, status: "active" },
    {
        id: 4,
        name: "analytics_db",
        service: "mongodb",
        size: "512 MB",
        tables: 8,
        status: "inactive",
    },
    { id: 5, name: "wordpress_db", service: "mysql", size: "92 MB", tables: 12, status: "active" },
];

const QUERY_HISTORY = [
    {
        id: 1,
        db: "my_blog_db",
        query: "SELECT * FROM posts WHERE published = 1",
        duration: "12ms",
        time: "2 min ago",
    },
    {
        id: 2,
        db: "api_db",
        query: "UPDATE users SET last_login = NOW() WHERE id = 42",
        duration: "8ms",
        time: "5 min ago",
    },
    {
        id: 3,
        db: "cache_store",
        query: "GET user:session:abc123",
        duration: "1ms",
        time: "12 min ago",
    },
    {
        id: 4,
        db: "my_blog_db",
        query: "INSERT INTO comments (post_id, user_id, content) VALUES (15, 3, 'Great post!')",
        duration: "24ms",
        time: "1 hr ago",
    },
];

const BACKUPS = [
    {
        id: 1,
        name: "my_blog_db_backup_2025-01-15",
        size: "128 MB",
        createdAt: "2025-01-15 02:00:00",
        status: "completed",
    },
    {
        id: 2,
        name: "api_db_backup_2025-01-15",
        size: "256 MB",
        createdAt: "2025-01-15 03:00:00",
        status: "completed",
    },
    {
        id: 3,
        name: "my_blog_db_backup_2025-01-14",
        size: "127 MB",
        createdAt: "2025-01-14 02:00:00",
        status: "completed",
    },
];

function ServiceCard({
    service,
    onStart,
    onStop,
    onRestart,
}: {
    service: DatabaseService;
    onStart: (id: string) => void;
    onStop: (id: string) => void;
    onRestart: (id: string) => void;
}) {
    const statusColor = {
        running: {
            bg: "bg-emerald-500",
            text: "text-emerald-500",
            border: "border-emerald-500/30",
            badge: "bg-emerald-500/10 text-emerald-500",
        },
        stopped: {
            bg: "bg-zinc-400",
            text: "text-zinc-400",
            border: "border-zinc-500/30",
            badge: "bg-zinc-500/10 text-zinc-400",
        },
        error: {
            bg: "bg-red-500",
            text: "text-red-500",
            border: "border-red-500/30",
            badge: "bg-red-500/10 text-red-500",
        },
    }[service.status];

    return (
        <div
            className={`rounded-xl border bg-card p-5 transition-all hover:shadow-md ${statusColor.border}`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                        {service.icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-base">{service.name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                                {service.version}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-muted-foreground font-mono">
                                :{service.port}
                            </span>
                            <Badge className={`text-[9px] px-1.5 py-0 ${statusColor.badge}`}>
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${statusColor.bg} mr-1 inline-block ${service.status === "running" ? "animate-pulse" : ""}`}
                                />
                                {service.status}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onStart(service.id)}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors"
                        disabled={service.status === "running"}
                    >
                        <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onStop(service.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                        disabled={service.status === "stopped"}
                    >
                        <Square className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onRestart(service.id)}
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Memory</div>
                    <div className="text-xs font-mono font-semibold">{service.memory}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">CPU</div>
                    <div className="text-xs font-mono font-semibold">{service.cpu}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Uptime</div>
                    <div className="text-xs font-mono font-semibold">{service.uptime}</div>
                </div>
            </div>

            {service.status === "running" && (
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>📊 {service.dataSize} data</span>
                    <span>🔗 {service.connections} connections</span>
                </div>
            )}
        </div>
    );
}

function DatabaseList({ databases }: { databases: Database[] }) {
    const [search, setSearch] = useState("");
    const filtered = databases.filter((db) => db.name.includes(search.toLowerCase()));

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search databases..."
                    className="pl-8 h-8 text-xs"
                />
            </div>
            <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b bg-muted/40">
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Name
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Service
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Size
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Tables
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Status
                            </th>
                            <th className="px-4 py-2.5" />
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((db) => (
                            <tr key={db.id} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="px-4 py-2.5 font-mono font-medium">{db.name}</td>
                                <td className="px-4 py-2.5">{db.service}</td>
                                <td className="px-4 py-2.5 font-mono">{db.size}</td>
                                <td className="px-4 py-2.5">{db.tables}</td>
                                <td className="px-4 py-2.5">
                                    <Badge
                                        variant="outline"
                                        className={
                                            db.status === "active"
                                                ? "text-emerald-500 border-emerald-500/30"
                                                : "text-zinc-400"
                                        }
                                    >
                                        {db.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <button className="p-1 rounded hover:bg-muted transition-colors">
                                        <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button className="p-1 rounded hover:bg-muted transition-colors">
                                        <Terminal className="w-3.5 h-3.5" />
                                    </button>
                                    <button className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1">
                <Plus className="w-3 h-3" />
                Create Database
            </Button>
        </div>
    );
}

function QueryHistory() {
    return (
        <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Recent Queries</span>
                </div>
                <Button size="sm" variant="ghost" className="h-6 text-[10px]">
                    View all
                </Button>
            </div>
            <div className="divide-y">
                {QUERY_HISTORY.map((q) => (
                    <div key={q.id} className="px-4 py-2.5 hover:bg-muted/20">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-emerald-500">{q.db}</span>
                            <span className="text-[10px] text-muted-foreground">{q.time}</span>
                        </div>
                        <p className="text-[11px] font-mono text-foreground/80 mt-0.5 truncate">
                            {q.query}
                        </p>
                        <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span>⏱️ {q.duration}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BackupsPanel() {
    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button
                    size="sm"
                    className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1"
                >
                    <Download className="w-3 h-3" />
                    New Backup
                </Button>
            </div>
            <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b bg-muted/40">
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Name
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Size
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Created
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Status
                            </th>
                            <th className="px-4 py-2.5" />
                        </tr>
                    </thead>
                    <tbody>
                        {BACKUPS.map((backup) => (
                            <tr
                                key={backup.id}
                                className="border-b last:border-0 hover:bg-muted/20"
                            >
                                <td className="px-4 py-2.5 font-mono text-foreground/90">
                                    {backup.name}
                                </td>
                                <td className="px-4 py-2.5 font-mono">{backup.size}</td>
                                <td className="px-4 py-2.5 text-muted-foreground">
                                    {backup.createdAt}
                                </td>
                                <td className="px-4 py-2.5">
                                    <Badge
                                        variant="outline"
                                        className="text-emerald-500 border-emerald-500/30"
                                    >
                                        completed
                                    </Badge>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <button className="p-1 rounded hover:bg-muted transition-colors">
                                        <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MetricsPanel() {
    const [metrics, setMetrics] = useState({ cpu: 23, memory: 42, disk: 56 });
    useEffect(() => {
        const t = setInterval(() => {
            setMetrics({
                cpu: Math.round(15 + Math.random() * 30),
                memory: Math.round(30 + Math.random() * 40),
                disk: Math.round(50 + Math.random() * 20),
            });
        }, 3000);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-medium">CPU Usage</span>
                </div>
                <div className="text-2xl font-bold">{metrics.cpu}%</div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div
                        className="bg-orange-500 h-1.5 rounded-full"
                        style={{ width: `${metrics.cpu}%` }}
                    />
                </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium">Memory</span>
                </div>
                <div className="text-2xl font-bold">{metrics.memory}%</div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${metrics.memory}%` }}
                    />
                </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-medium">Disk Usage</span>
                </div>
                <div className="text-2xl font-bold">{metrics.disk}%</div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div
                        className="bg-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${metrics.disk}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

export default function DatabaseManagerPage() {
    const [services, setServices] = useState(DATABASE_SERVICES);
    const [refreshing, setRefreshing] = useState(false);

    const handleStart = (id: string) => {
        setServices((prev) =>
            prev.map((s) =>
                s.id === id
                    ? { ...s, status: "running", memory: "64 MB", cpu: "1%", uptime: "0s" }
                    : s
            )
        );
    };
    const handleStop = (id: string) => {
        setServices((prev) =>
            prev.map((s) =>
                s.id === id
                    ? {
                          ...s,
                          status: "stopped",
                          memory: "0 MB",
                          cpu: "0%",
                          uptime: "-",
                          connections: 0,
                      }
                    : s
            )
        );
    };
    const handleRestart = (id: string) => {
        setServices((prev) => prev.map((s) => (s.id === id ? { ...s, status: "running" } : s)));
    };
    const refresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    };

    const runningCount = services.filter((s) => s.status === "running").length;
    const stoppedCount = services.filter((s) => s.status === "stopped").length;
    const errorCount = services.filter((s) => s.status === "error").length;

    return (
        <div className="min-h-screen p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Database className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Database Manager</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {runningCount} running · {stoppedCount} stopped · {errorCount} error
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8"
                        onClick={refresh}
                        disabled={refreshing}
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                        <Settings className="w-3.5 h-3.5" />
                        Settings
                    </Button>
                </div>
            </div>

            <MetricsPanel />

            <div>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Database Services
                    </span>
                    <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map((svc) => (
                        <ServiceCard
                            key={svc.id}
                            service={svc}
                            onStart={handleStart}
                            onStop={handleStop}
                            onRestart={handleRestart}
                        />
                    ))}
                </div>
            </div>

            <Tabs defaultValue="databases">
                <TabsList className="flex h-auto gap-0.5 bg-muted/40 p-1 rounded-xl mb-5 w-full sm:w-auto">
                    {[
                        {
                            id: "databases",
                            label: "Databases",
                            icon: <Database className="w-3.5 h-3.5" />,
                        },
                        {
                            id: "queries",
                            label: "Query History",
                            icon: <Activity className="w-3.5 h-3.5" />,
                        },
                        {
                            id: "backups",
                            label: "Backups",
                            icon: <Download className="w-3.5 h-3.5" />,
                        },
                    ].map((t) => (
                        <TabsTrigger
                            key={t.id}
                            value={t.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                            {t.icon}
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <TabsContent value="databases" className="mt-0">
                    <DatabaseList databases={MOCK_DATABASES} />
                </TabsContent>
                <TabsContent value="queries" className="mt-0">
                    <QueryHistory />
                </TabsContent>
                <TabsContent value="backups" className="mt-0">
                    <BackupsPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}
