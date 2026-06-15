import { useState } from "react";

import { Archive, ArrowLeft, Play, RotateCcw, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { LaravelIcon } from "@/components/icons/LaravelIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArtisanPanel } from "@/pages/projects/components/DetailProjects/laravel/ArtisanPanel.tsx";
import { DatabasePanel } from "@/pages/projects/components/DetailProjects/laravel/DatabasePanel.tsx";
import { DeployPanel } from "@/pages/projects/components/DetailProjects/laravel/DeployPanel.tsx";
import { LogsPanel } from "@/pages/projects/components/DetailProjects/laravel/LogsPanel.tsx";
import { MetricsPanel } from "@/pages/projects/components/DetailProjects/laravel/MetricsPanel.tsx";
import { PackagesPanel } from "@/pages/projects/components/DetailProjects/laravel/PackagesPanel.tsx";
import { QueuesPanel } from "@/pages/projects/components/DetailProjects/laravel/QueuesPanel.tsx";
import { ReadmePanel } from "@/pages/projects/components/DetailProjects/laravel/ReadmePanel.tsx";
import { SchedulesPanel } from "@/pages/projects/components/DetailProjects/laravel/SchedulesPanel.tsx";
import { TerminalShell } from "@/pages/projects/components/DetailProjects/laravel/TerminalShell.tsx";

const mockProject = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "my-blog",
    type: "laravel",
    path: "~/Projects/my-blog",
    description: "Personal blog built with Laravel & Livewire",
    status: "running" as const,
    version: "11.x",
    phpVersion: "8.3",
    port: 8000,
    database: {
        driver: "mysql",
        name: "my_blog_db",
        host: "127.0.0.1",
        port: 3306,
        status: "connected",
    },
    readme: `# My Blog\n\nA personal blog built with **Laravel 11** and Livewire.\n\n## Requirements\n\n- PHP >= 8.2\n- MySQL 8.0\n- Composer 2.x\n\n## Installation\n\n\`\`\`bash\ncomposer install\ncp .env.example .env\nphp artisan key:generate\nphp artisan migrate --seed\nphp artisan serve\n\`\`\`\n\n## Features\n\n- Post management\n- Tags & categories\n- Comment system\n- RSS feed\n- Dark mode\n`,
};

const TABS = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "shell", label: "Shell", icon: "💻" },
    { id: "artisan", label: "Artisan", icon: "⚡" },
    { id: "queues", label: "Queues", icon: "📋" },
    { id: "schedules", label: "Schedules", icon: "📅" },
    { id: "logs", label: "Logs", icon: "📄" },
    { id: "packages", label: "Packages", icon: "📦" },
    { id: "database", label: "Database", icon: "🗄️" },
    { id: "deploy", label: "Deploy", icon: "🚀" },
];

export default function ProjectDetailPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<"running" | "stopped">(mockProject.status);
    const [restarting, setRestarting] = useState(false);
    const [backingUp, setBackingUp] = useState(false);

    const restart = () => {
        setRestarting(true);
        setTimeout(() => setRestarting(false), 2200);
    };

    const toggleStatus = () => setStatus((s) => (s === "running" ? "stopped" : "running"));

    const backup = () => {
        setBackingUp(true);
        setTimeout(() => setBackingUp(false), 2500);
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-3">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/projects")}
                        className="gap-1.5 text-muted-foreground hover:text-foreground h-7 px-2"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back
                    </Button>
                    <div className="h-4 w-px bg-border" />
                    <LaravelIcon className="w-5 h-5 shrink-0" />
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm">{mockProject.name}</span>
                        <Badge
                            variant="outline"
                            className="font-mono text-[10px] text-muted-foreground hidden sm:flex"
                        >
                            v{mockProject.version}
                        </Badge>
                        <Badge
                            variant="outline"
                            className="font-mono text-[10px] text-muted-foreground hidden sm:flex"
                        >
                            PHP {mockProject.phpVersion}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${status === "running" ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`}
                            />
                            <span className="text-[11px] text-muted-foreground">
                                {status === "running" ? `localhost:${mockProject.port}` : "stopped"}
                            </span>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={backup}
                            disabled={backingUp}
                        >
                            {backingUp ? (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Archive className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">Backup</span>
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={restart}
                            disabled={restarting}
                        >
                            {restarting ? (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <RotateCcw className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">Restart</span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={toggleStatus}
                            className={`h-7 text-xs gap-1 ${status === "running" ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
                        >
                            {status === "running" ? (
                                <>
                                    <Square className="w-3 h-3" />
                                    Stop
                                </>
                            ) : (
                                <>
                                    <Play className="w-3 h-3" />
                                    Start
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                <Tabs defaultValue="overview">
                    <TabsList className="flex h-auto gap-0.5 bg-muted/40 p-1 rounded-xl mb-6 flex-wrap">
                        {TABS.map((t) => (
                            <TabsTrigger
                                key={t.id}
                                value={t.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                                <span>{t.icon}</span>
                                {t.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4 mt-0">
                        <MetricsPanel />
                        <ReadmePanel content={mockProject.readme} />
                    </TabsContent>

                    <TabsContent value="shell" className="mt-0">
                        <TerminalShell />
                    </TabsContent>

                    <TabsContent value="artisan" className="mt-0">
                        <ArtisanPanel />
                    </TabsContent>

                    <TabsContent value="queues" className="mt-0">
                        <QueuesPanel />
                    </TabsContent>

                    <TabsContent value="schedules" className="mt-0">
                        <SchedulesPanel />
                    </TabsContent>

                    <TabsContent value="logs" className="mt-0">
                        <LogsPanel />
                    </TabsContent>

                    <TabsContent value="packages" className="mt-0">
                        <PackagesPanel />
                    </TabsContent>

                    <TabsContent value="database" className="mt-0">
                        <DatabasePanel db={mockProject.database} />
                    </TabsContent>

                    <TabsContent value="deploy" className="mt-0">
                        <DeployPanel />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
