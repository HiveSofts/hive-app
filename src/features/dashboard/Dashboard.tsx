import { useState } from "react";

import { Activity, Bell, Globe, Layers, Package, TrendingUp } from "lucide-react";

import { DnsProxy } from "./components/DnsProxy";
import { LogStream } from "./components/LogStream";
import { NotificationCenter } from "./components/NotificationCenter";
import { ProjectCards } from "./components/ProjectCards";
import { QuickStats } from "./components/QuickStats";
import { ResourceChart } from "./components/ResourceChart";
import { Section } from "./components/Section";
import { StatusBar } from "./components/StatusBar";
import { Widgets } from "./components/Widgets";
import { useDashboard } from "./hooks/useDashboard";

export default function Dashboard() {
    const { metrics, refreshing, health, widgets, setWidgets, projects, loading, error, refresh, logs, notifications, widgetData, dnsData } =
        useDashboard();

    const date = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const [showLogStream, setShowLogStream] = useState(true);
    const [showNotifications, setShowNotifications] = useState(true);
    const [showDnsProxy, setShowDnsProxy] = useState(true);
    const [showWidgets, setShowWidgets] = useState(true);

    if (loading) {
        return (
            <div className="min-h-screen p-6 space-y-5">
                <div className="space-y-1">
                    <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-xs text-muted-foreground">{date}</p>
                </div>
                <div className="rounded-2xl border bg-card p-6">
                    <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen p-6 space-y-5">
                <div className="space-y-1">
                    <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
                </div>
                <div className="rounded-2xl border bg-card p-6">
                    <p className="text-sm text-red-500">Failed to load dashboard: {error}</p>
                    <button
                        onClick={refresh}
                        className="mt-3 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

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
            <QuickStats projects={projects} />

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Left Column */}
                <div className="xl:col-span-2 space-y-5">
                    <Section title="Projects" icon={<Layers className="w-4 h-4" />}>
                        <ProjectCards projects={projects} onToggle={refresh} />
                    </Section>

                    <Section title="Resource Monitor" icon={<TrendingUp className="w-4 h-4" />}>
                        <ResourceChart metrics={metrics} />
                    </Section>

                    {showLogStream && (
                        <Section
                            title="Log Stream"
                            icon={<Activity className="w-4 h-4" />}
                            right={
                                <SectionToggle
                                    visible={showLogStream}
                                    onToggle={() => setShowLogStream((v) => !v)}
                                />
                            }
                        >
                            <LogStream logs={logs} />
                        </Section>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                    {showNotifications && (
                        <Section
                            title="Notifications"
                            icon={<Bell className="w-4 h-4" />}
                            right={
                                <SectionToggle
                                    visible={showNotifications}
                                    onToggle={() => setShowNotifications((v) => !v)}
                                />
                            }
                        >
                            <NotificationCenter notifications={notifications} />
                        </Section>
                    )}

                    {showDnsProxy && (
                        <Section
                            title="DNS & Proxy"
                            icon={<Globe className="w-4 h-4" />}
                            right={
                                <SectionToggle
                                    visible={showDnsProxy}
                                    onToggle={() => setShowDnsProxy((v) => !v)}
                                />
                            }
                        >
                            <DnsProxy data={dnsData} />
                        </Section>
                    )}
                </div>
            </div>

            {/* Widgets */}
            {showWidgets && (
                <Section
                    title="Widgets"
                    icon={<Package className="w-4 h-4" />}
                    defaultOpen
                    right={
                        <SectionToggle
                            visible={showWidgets}
                            onToggle={() => setShowWidgets((v) => !v)}
                        />
                    }
                >
                    <Widgets widgets={widgets} setWidgets={setWidgets} widgetData={widgetData} />
                </Section>
            )}
        </div>
    );
}

function SectionToggle({
    visible,
    onToggle,
}: {
    visible: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={visible ? "Hide section" : "Show section"}
        >
            {visible ? (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            ) : (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                    <path d="M17.479 17.499a10.745 10.745 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.747 10.747 0 0 1 4.446-5.143" />
                    <path d="m2 2 20 20" />
                </svg>
            )}
        </button>
    );
}