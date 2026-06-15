import { useCallback, useEffect, useState } from "react";

import { Activity, Bell, Globe, Layers, Package, Server, TrendingUp, Zap } from "lucide-react";

import { DnsProxy } from "./components/DnsProxy";
import { LogStream } from "./components/LogStream";
import { NotificationCenter } from "./components/NotificationCenter";
import { ProjectCards } from "./components/ProjectCards";
import { QuickStats } from "./components/QuickStats";
import { ResourceChart } from "./components/ResourceChart";
import { Section } from "./components/Section";
import { ServicesPanel } from "./components/ServicesPanel";
import { SmartShortcuts } from "./components/SmartShortcuts";
import { StatusBar } from "./components/StatusBar";
import { Widgets } from "./components/Widgets";
import { HiveHealth } from "./types";

const PROJECTS = [
    {
        id: 1,
        name: "my-blog",
        type: "laravel",
        url: "my-blog.test",
        php: "8.3",
        status: "running",
        pinned: true,
        port: 8000,
    },
    {
        id: 2,
        name: "dashboard-app",
        type: "react",
        url: "dashboard-app.test",
        php: "Node 20",
        status: "running",
        pinned: true,
        port: 3000,
    },
    {
        id: 3,
        name: "api-gateway",
        type: "nextjs",
        url: "api-gateway.test",
        php: "Node 18",
        status: "stopped",
        pinned: false,
        port: 3001,
    },
    {
        id: 4,
        name: "vue-portfolio",
        type: "vue",
        url: "vue-portfolio.test",
        php: "Node 20",
        status: "stopped",
        pinned: false,
        port: 5173,
    },
    {
        id: 5,
        name: "infra-stack",
        type: "docker",
        url: "—",
        php: "—",
        status: "running",
        pinned: false,
        port: 0,
    },
];

const SERVICES = [
    { id: "mysql", name: "MySQL", version: "8.0.37", port: 3306, status: "running", mem: "124 MB" },
    { id: "redis", name: "Redis", version: "7.2.4", port: 6379, status: "running", mem: "8 MB" },
    { id: "nginx", name: "Nginx", version: "1.25.3", port: 80, status: "running", mem: "4 MB" },
    { id: "mailpit", name: "Mailpit", version: "1.19.0", port: 8025, status: "stopped", mem: "—" },
    { id: "minio", name: "MinIO", version: "2024-01", port: 9000, status: "error", mem: "56 MB" },
];

const genMetrics = (points = 30) =>
    Array.from({ length: points }, (_, i) => ({
        t: `${points - i}s`,
        cpu: Math.round(12 + Math.random() * 38),
        ram: Math.round(820 + Math.random() * 220),
        net_in: Math.round(Math.random() * 80),
        net_out: Math.round(Math.random() * 40),
    }));

export default function Dashboard() {
    const [metrics, setMetrics] = useState(genMetrics);
    const [refreshing, setRefreshing] = useState(false);
    const [health] = useState<HiveHealth>("warn");
    const [widgets, setWidgets] = useState({
        php: true,
        node: true,
        db: true,
        ssl: true,
        tunnel: false,
    });

    const refresh = useCallback(() => {
        setRefreshing(true);
        setMetrics(genMetrics());
        setTimeout(() => setRefreshing(false), 800);
    }, []);

    useEffect(() => {
        const t = setInterval(() => {
            setMetrics((m) => [
                ...m.slice(1),
                {
                    t: "now",
                    cpu: Math.round(12 + Math.random() * 38),
                    ram: Math.round(820 + Math.random() * 220),
                    net_in: Math.round(Math.random() * 80),
                    net_out: Math.round(Math.random() * 40),
                },
            ]);
        }, 2000);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="min-h-screen p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </div>
            </div>
            <StatusBar
                health={health}
                metrics={metrics}
                onRefresh={refresh}
                refreshing={refreshing}
            />
            <QuickStats projects={PROJECTS} services={SERVICES} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-2 space-y-5">
                    <Section title="Projects" icon={<Layers className="w-4 h-4" />}>
                        <ProjectCards projects={PROJECTS} />
                    </Section>
                    <Section title="Resource Monitor" icon={<TrendingUp className="w-4 h-4" />}>
                        <ResourceChart metrics={metrics} />
                    </Section>
                    <Section title="Log Stream" icon={<Activity className="w-4 h-4" />}>
                        <LogStream />
                    </Section>
                    <Section title="Smart Shortcuts" icon={<Zap className="w-4 h-4" />}>
                        <SmartShortcuts />
                    </Section>
                </div>
                <div className="space-y-5">
                    <Section title="Notifications" icon={<Bell className="w-4 h-4" />}>
                        <NotificationCenter />
                    </Section>
                    <Section title="Services" icon={<Server className="w-4 h-4" />}>
                        <ServicesPanel services={SERVICES} />
                    </Section>
                    <Section title="DNS & Proxy" icon={<Globe className="w-4 h-4" />}>
                        <DnsProxy />
                    </Section>
                </div>
            </div>
            <Section title="Widgets" icon={<Package className="w-4 h-4" />} defaultOpen={true}>
                <Widgets widgets={widgets} setWidgets={setWidgets} />
            </Section>
        </div>
    );
}
