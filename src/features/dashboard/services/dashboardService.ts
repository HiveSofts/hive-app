import { invoke } from "@tauri-apps/api/core";

import { projectService } from "@/features/projects/services/projectService";
import { listContainers } from "@/features/docker/services/docker.service";

import {
    DbConnection,
    DnsProxyData,
    LogEntry,
    Metric,
    NotificationItem,
    Project,
    Service,
    SslCert,
    TunnelInfo,
} from "../types";

interface ServerRecord {
    project_path: string;
    project_name: string;
    project_type: string;
    port: number;
    is_running: boolean;
    error_count?: number;
}

interface ContainerInfo {
    id: string;
    name: string;
    image: string;
    status: string;
    state: string;
    ports: { host_port: number; container_port: number; protocol: string }[];
}

function containerToService(c: ContainerInfo): Service {
    const state = c.state.toLowerCase();
    let status: Service["status"] = "stopped";
    if (state.includes("running")) status = "running";
    else if (state.includes("exited") || state.includes("dead") || state.includes("created")) status = "stopped";
    else if (state.includes("restarting") || state.includes("paused")) status = "error";

    const port = c.ports[0]?.host_port || 0;
    const version = c.image.includes(":") ? c.image.split(":").slice(1).join(":") : "";

    return {
        id: c.id,
        name: c.name,
        version,
        port,
        status,
        mem: "—",
    };
}

function serverToService(s: ServerRecord): Service {
    const status: Service["status"] = !s.is_running ? "stopped" : s.error_count && s.error_count > 0 ? "error" : "running";

    return {
        id: String(s.project_path),
        name: s.project_name,
        version: s.project_type,
        port: s.port,
        status,
        mem: "—",
    };
}

function toDashboardProject(p: {
    id?: string | null;
    name: string;
    type: string;
    path: string;
    status?: string | null;
    host?: string | null;
    port?: number | null;
    phpVersion?: string | null;
    nodeVersion?: string | null;
    isRunning?: boolean;
}): Project {
    return {
        id: p.id || p.path,
        name: p.name,
        type: p.type || "unknown",
        url: p.host || `${p.name}.test`,
        php: p.phpVersion || p.nodeVersion || "—",
        status: p.isRunning ? "running" : (p.status === "running" ? "running" : "stopped"),
        pinned: false,
        port: p.port || 0,
        path: p.path,
    };
}

const DB_CONNS_MOCK: DbConnection[] = [
    { name: "my-blog", driver: "mysql", db: "my_blog_db", status: "connected" },
    { name: "api-gateway", driver: "pgsql", db: "api_db", status: "connected" },
    { name: "vue-portfolio", driver: "sqlite", db: "portfolio.db", status: "idle" },
];

const SSL_CERTS_MOCK: SslCert[] = [
    { domain: "*.test", expiry: "2025-12-31", daysLeft: 199 },
    { domain: "*.local", expiry: "2025-09-14", daysLeft: 91 },
    { domain: "localhost", expiry: "2026-03-01", daysLeft: 259 },
];

export const dashboardService = {
    async getProjects(): Promise<Project[]> {
        try {
            const [projectInfos, runningServers] = await Promise.all([
                projectService.listAll(),
                invoke<ServerRecord[]>("get_all_running_servers").catch(() => []),
            ]);

            const runningPaths = new Set(runningServers.map((s) => s.project_path));

            return projectInfos.map((p) =>
                toDashboardProject({
                    ...p,
                    isRunning: runningPaths.has(p.path),
                })
            );
        } catch {
            return [];
        }
    },

    async getServices(): Promise<Service[]> {
        try {
            const [containers, servers] = await Promise.all([
                listContainers(),
                invoke<ServerRecord[]>("get_all_running_servers").catch(() => []),
            ]);

            const dockerServices = containers.map(containerToService);
            const serverServices = servers.map(serverToService);

            const all = [...dockerServices, ...serverServices];
            const seen = new Map<string, Service>();
            for (const svc of all) {
                const key = `${svc.name}-${svc.port}`;
                if (!seen.has(key)) seen.set(key, svc);
            }
            return Array.from(seen.values());
        } catch {
            return [];
        }
    },

    async getHealth(): Promise<"ok" | "warn" | "error"> {
        try {
            const projects = await this.getProjects();

            if (projects.length === 0) return "warn";
            const runningCount = projects.filter((p) => p.status === "running").length;
            if (runningCount === 0) return "error";
            if (runningCount < projects.length) return "warn";
            return "ok";
        } catch {
            return "warn";
        }
    },

    async getMetrics(): Promise<Metric[]> {
        try {
            const cpuOutput = await invoke<string>("execute_shell_command", {
                command: "ps -eo %cpu --no-headers 2>/dev/null | awk '{s+=$1} END {if (NR>0) printf \"%.1f\", s/NR; else print 0}'",
                cwd: "/tmp",
            });
            const ramOutput = await invoke<string>("execute_shell_command", {
                command: "free -m 2>/dev/null | awk '/Mem:/ {print $3}'",
                cwd: "/tmp",
            });

            const cpu = parseFloat(cpuOutput) || 0;
            const ram = parseFloat(ramOutput) || 0;

            return [
                { t: "now", cpu: Math.round(cpu), ram: Math.round(ram), net_in: 0, net_out: 0 },
            ];
        } catch {
            return [];
        }
    },

    async getLogs(projects: Project[]): Promise<LogEntry[]> {
        const running = projects.filter((p) => p.status === "running");
        if (running.length === 0) return [];

        try {
            const results = await Promise.all(
                running.map((p) =>
                    invoke<any>("get_project_logs", {
                        projectPath: p.path,
                        page: 1,
                        perPage: 20,
                    }).catch(() => null)
                )
            );

            const entries: LogEntry[] = [];
            results.forEach((result, idx) => {
                if (result && result.entries) {
                    result.entries.forEach((entry: any) => {
                        entries.push({
                            id: entries.length + 1,
                            level: entry.level?.toLowerCase() === "error"
                                ? "error"
                                : entry.level?.toLowerCase() === "warning"
                                    ? "warn"
                                    : "info",
                            project: running[idx].name,
                            msg: entry.message || entry.context || "",
                            ts: entry.time || "",
                        });
                    });
                }
            });

            return entries.sort((a, b) => b.id - a.id).slice(0, 50);
        } catch {
            return [];
        }
    },

    async getNotifications(projects: Project[]): Promise<NotificationItem[]> {
        const notifications: NotificationItem[] = [];
        let id = 1;

        const running = projects.filter((p) => p.status === "running");
        const stopped = projects.filter((p) => p.status === "stopped");

        if (stopped.length > 0) {
            notifications.push({
                id: id++,
                level: "warn",
                title: `${stopped.length} project${stopped.length > 1 ? "s" : ""} stopped`,
                body: stopped.map((p) => p.name).join(", "),
                time: "now",
                action: "Start",
            });
        }

        for (const p of running) {
            try {
                const failed = await invoke<any[]>("get_failed_jobs", { projectPath: p.path }).catch(() => []);
                if (failed && failed.length > 0) {
                    notifications.push({
                        id: id++,
                        level: "error",
                        title: `${p.name}: ${failed.length} failed job${failed.length > 1 ? "s" : ""}`,
                        body: "Check queue:failed for details.",
                        time: "now",
                        action: "Retry",
                    });
                }
            } catch {
                // ignore per-project failures
            }
        }

        return notifications.slice(0, 20);
    },

    async getWidgetData(projects: Project[]): Promise<{
        dbConnections: DbConnection[];
        sslCerts: SslCert[];
        tunnels: TunnelInfo[];
    }> {
        const running = projects.filter((p) => p.status === "running");

        const dbConnections: DbConnection[] = [];
        for (const p of running.slice(0, 5)) {
            try {
                const info = await invoke<any>("get_database_info", { projectPath: p.path }).catch(() => null);
                if (info) {
                    dbConnections.push({
                        name: p.name,
                        driver: info.connection || "mysql",
                        db: info.database || info.db || "—",
                        status: "connected",
                    });
                }
            } catch {
                dbConnections.push({
                    name: p.name,
                    driver: "mysql",
                    db: "—",
                    status: "idle",
                });
            }
        }

        if (dbConnections.length === 0) {
            DB_CONNS_MOCK.forEach((c) => dbConnections.push(c));
        }

        let sslCerts: SslCert[] = [];
        try {
            const output = await invoke<string>("execute_shell_command", {
                command: "ls -la /etc/letsencrypt/live/ 2>/dev/null | awk 'NR>1 {print $9}' || echo ''",
                cwd: "/tmp",
            });
            const domains = output.split("\n").filter((d) => d.trim()).slice(0, 3);
            if (domains.length > 0) {
                sslCerts = domains.map((domain) => {
                    const expiryOut = invoke<string>("execute_shell_command", {
                        command: `openssl s_client -connect ${domain}:443 -servername ${domain} 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo ''`,
                        cwd: "/tmp",
                    }).catch(() => "");
                    const expiry = typeof expiryOut === "string" ? expiryOut : "";
                    const daysLeft = expiry ? Math.max(0, Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000)) : 0;
                    return { domain: `*.${domain}`, expiry, daysLeft };
                });
            }
        } catch {
            // ignore
        }

        if (sslCerts.length === 0) {
            sslCerts = SSL_CERTS_MOCK;
        }

        let tunnels: TunnelInfo[] = [];
        try {
            const activeTunnels = await invoke<TunnelInfo[]>("get_all_active_tunnels").catch(() => []);
            tunnels = activeTunnels.map((t) => ({
                projectName: t.projectName,
                localUrl: t.localUrl,
                publicUrl: t.publicUrl,
                status: t.status,
                startedAt: t.startedAt,
            }));
        } catch {
            // ignore
        }

        return { dbConnections, sslCerts, tunnels };
    },

    async getDnsProxyData(): Promise<DnsProxyData> {
        try {
            const [nginxOutput, dnsOutput, reqsOutput] = await Promise.all([
                invoke<string>("execute_shell_command", {
                    command: "ss -tlnp | grep ':80 ' || echo 'inactive'",
                    cwd: "/tmp",
                }).catch(() => "inactive"),
                invoke<string>("execute_shell_command", {
                    command: "ss -udpn | grep ':53 ' || echo 'inactive'",
                    cwd: "/tmp",
                }).catch(() => "inactive"),
                invoke<string>("execute_shell_command", {
                    command: "cat /proc/net/sockstat 2>/dev/null | awk 'NR==2 {print $3}' || echo '0'",
                    cwd: "/tmp",
                }).catch(() => "0"),
            ]);

            const proxyActive = nginxOutput && !nginxOutput.includes("inactive");
            const dnsActive = dnsOutput && !dnsOutput.includes("inactive");
            const reqs = parseInt(reqsOutput || "0", 10) || 0;

            const zonesOut = await invoke<string>("execute_shell_command", {
                command: "cat /etc/resolv.conf 2>/dev/null | grep search | awk '{print $2}' || echo 'local'",
                cwd: "/tmp",
            }).catch(() => "local");

            return {
                proxyListen: proxyActive ? "127.0.0.1:80" : "inactive",
                proxySsl: proxyActive ? "127.0.0.1:443" : "inactive",
                proxyReqs: reqs,
                dnsZones: `*.${zonesOut}`,
                dnsResolver: dnsActive ? "127.0.0.1:53" : "inactive",
                dnsRecords: dnsActive ? 4 : 0,
            };
        } catch {
            return {
                proxyListen: "127.0.0.1:80",
                proxySsl: "127.0.0.1:443",
                proxyReqs: 0,
                dnsZones: "*.test · *.local",
                dnsResolver: "127.0.0.1:53",
                dnsRecords: 4,
            };
        }
    },
};

export const generateMetrics = (points: number = 30): Metric[] => {
    return Array.from({ length: points }, (_, i) => ({
        t: `${points - i}s`,
        cpu: Math.round(12 + Math.random() * 38),
        ram: Math.round(820 + Math.random() * 220),
        net_in: Math.round(Math.random() * 80),
        net_out: Math.round(Math.random() * 40),
    }));
};

export const generateNewMetric = (): Metric => ({
    t: "now",
    cpu: Math.round(12 + Math.random() * 38),
    ram: Math.round(820 + Math.random() * 220),
    net_in: Math.round(Math.random() * 80),
    net_out: Math.round(Math.random() * 40),
});
