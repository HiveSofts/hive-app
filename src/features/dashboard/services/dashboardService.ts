import { invoke } from "@tauri-apps/api/core";

import { projectService } from "@/features/projects/services/projectService";
import { listContainers } from "@/features/docker/services/docker.service";

import {
    DnsProxyData,
    LogEntry,
    Metric,
    Project,
    Service,
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
    else if (state.includes("restarting") || state.includes("paused")) status = "error";

    return {
        id: c.id,
        name: c.name,
        version: c.image.includes(":") ? c.image.split(":").slice(1).join(":") : "",
        port: c.ports[0]?.host_port || 0,
        status,
        mem: "—",
    };
}

function serverToService(s: ServerRecord): Service {
    return {
        id: s.project_path,
        name: s.project_name,
        version: s.project_type,
        port: s.port,
        status: !s.is_running ? "stopped" : s.error_count && s.error_count > 0 ? "error" : "running",
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
        status: p.isRunning ? "running" : p.status === "running" ? "running" : "stopped",
        pinned: false,
        port: p.port || 0,
        path: p.path,
    };
}

async function shellCmd(command: string): Promise<string> {
    return invoke<string>("execute_shell_command", { command, cwd: "/tmp" });
}

export const dashboardService = {
    async getProjects(): Promise<Project[]> {
        try {
            const [projectInfos, runningServers] = await Promise.all([
                projectService.listAll(),
                invoke<ServerRecord[]>("get_all_running_servers").catch(() => [] as ServerRecord[]),
            ]);

            const runningPaths = new Set(runningServers.map((s) => s.project_path));

            return projectInfos.map((p) =>
                toDashboardProject({ ...p, isRunning: runningPaths.has(p.path) })
            );
        } catch {
            return [];
        }
    },

    async getServices(): Promise<Service[]> {
        try {
            const [containers, servers] = await Promise.all([
                listContainers(),
                invoke<ServerRecord[]>("get_all_running_servers").catch(() => [] as ServerRecord[]),
            ]);

            const all = [
                ...containers.map(containerToService),
                ...servers.map(serverToService),
            ];

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
            const [cpuOut, ramOut, netOut] = await Promise.all([
                shellCmd(
                    "ps -eo %cpu --no-headers 2>/dev/null | awk '{s+=$1} END {if (NR>0) printf \"%.1f\", s/NR; else print 0}'"
                ).catch(() => "0"),
                shellCmd(
                    "free -m 2>/dev/null | awk '/Mem:/ {print $3}'"
                ).catch(() => "0"),
                shellCmd(
                    "cat /proc/net/dev 2>/dev/null | awk 'NR>2 && !/lo/ {rx+=$2; tx+=$10} END {printf \"%d %d\", rx/1024, tx/1024}'"
                ).catch(() => "0 0"),
            ]);

            const [net_in_str, net_out_str] = netOut.trim().split(" ");

            return [
                {
                    t: "now",
                    cpu: Math.round(parseFloat(cpuOut) || 0),
                    ram: Math.round(parseFloat(ramOut) || 0),
                    net_in: Math.round(parseFloat(net_in_str) || 0),
                    net_out: Math.round(parseFloat(net_out_str) || 0),
                },
            ];
        } catch {
            return [];
        }
    },

    async getLogs(projects: Project[]): Promise<LogEntry[]> {
        const running = projects.filter((p) => p.status === "running");
        if (running.length === 0) return [];

        try {
            const results = await Promise.allSettled(
                running.map((p) =>
                    invoke<{ entries: { level: string; message: string; context: string; time: string }[] }>(
                        "get_project_logs",
                        { projectPath: p.path, page: 1, perPage: 20 }
                    )
                )
            );

            const entries: LogEntry[] = [];
            results.forEach((result, idx) => {
                if (result.status === "fulfilled" && result.value?.entries) {
                    result.value.entries.forEach((entry) => {
                        const lvl = entry.level?.toLowerCase();
                        entries.push({
                            id: entries.length + 1,
                            level: lvl === "error" ? "error" : lvl === "warning" ? "warn" : "info",
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

    async getDnsProxyData(): Promise<DnsProxyData> {
        try {
            const [nginxOut, dnsOut, reqsOut, zoneOut] = await Promise.all([
                shellCmd("ss -tlnp 2>/dev/null | grep ':80 ' | head -1 || echo 'inactive'").catch(() => "inactive"),
                shellCmd("ss -ulnp 2>/dev/null | grep ':53 ' | head -1 || echo 'inactive'").catch(() => "inactive"),
                shellCmd("cat /proc/net/sockstat 2>/dev/null | awk '/TCP:/ {print $3}' || echo '0'").catch(() => "0"),
                shellCmd("awk '/^search/ {print $2}' /etc/resolv.conf 2>/dev/null || echo 'local'").catch(() => "local"),
            ]);

            const proxyActive = !nginxOut.includes("inactive");
            const dnsActive = !dnsOut.includes("inactive");
            const reqs = parseInt(reqsOut.trim(), 10) || 0;
            const zone = zoneOut.trim() || "local";

            let dnsRecordCount = 0;
            if (dnsActive) {
                try {
                    const hostsOut = await shellCmd(
                        "grep -c '\\.test\\|\\.local' /etc/hosts 2>/dev/null || echo '0'"
                    ).catch(() => "0");
                    dnsRecordCount = parseInt(hostsOut.trim(), 10) || 0;
                } catch {
                    dnsRecordCount = 0;
                }
            }

            return {
                proxyListen: proxyActive ? "127.0.0.1:80" : "inactive",
                proxySsl: proxyActive ? "127.0.0.1:443" : "inactive",
                proxyReqs: reqs,
                dnsZones: `*.${zone}`,
                dnsResolver: dnsActive ? "127.0.0.1:53" : "inactive",
                dnsRecords: dnsRecordCount,
            };
        } catch {
            return {
                proxyListen: "inactive",
                proxySsl: "inactive",
                proxyReqs: 0,
                dnsZones: "*.local",
                dnsResolver: "inactive",
                dnsRecords: 0,
            };
        }
    },
};

export const generateMetrics = (points = 30): Metric[] =>
    Array.from({ length: points }, (_, i) => ({
        t: `${points - i}s`,
        cpu: Math.round(12 + Math.random() * 38),
        ram: Math.round(820 + Math.random() * 220),
        net_in: Math.round(Math.random() * 80),
        net_out: Math.round(Math.random() * 40),
    }));

export const generateNewMetric = (): Metric => ({
    t: "now",
    cpu: Math.round(12 + Math.random() * 38),
    ram: Math.round(820 + Math.random() * 220),
    net_in: Math.round(Math.random() * 80),
    net_out: Math.round(Math.random() * 40),
});