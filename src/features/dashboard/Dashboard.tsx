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
import { useDashboard } from "./hooks/useDashboard";

export default function Dashboard() {
    const { metrics, refreshing, health, widgets, setWidgets, projects, services, refresh } =
        useDashboard();

    const date = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="min-h-screen p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
                </div>
            </div>

            {/* Status Bar */}
            <StatusBar
                health={health}
                metrics={metrics}
                onRefresh={refresh}
                refreshing={refreshing}
            />

            {/* Quick Stats */}
            <QuickStats projects={projects} services={services} />

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Left Column */}
                <div className="xl:col-span-2 space-y-5">
                    <Section title="Projects" icon={<Layers className="w-4 h-4" />}>
                        <ProjectCards projects={projects} />
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

                {/* Right Column */}
                <div className="space-y-5">
                    <Section title="Notifications" icon={<Bell className="w-4 h-4" />}>
                        <NotificationCenter />
                    </Section>

                    <Section title="Services" icon={<Server className="w-4 h-4" />}>
                        <ServicesPanel services={services} />
                    </Section>

                    <Section title="DNS & Proxy" icon={<Globe className="w-4 h-4" />}>
                        <DnsProxy />
                    </Section>
                </div>
            </div>

            {/* Widgets */}
            <Section title="Widgets" icon={<Package className="w-4 h-4" />} defaultOpen>
                <Widgets widgets={widgets} setWidgets={setWidgets} />
            </Section>
        </div>
    );
}
