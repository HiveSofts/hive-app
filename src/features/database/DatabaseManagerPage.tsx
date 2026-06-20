import { cn } from "@/core/lib/utils";

import { ActivityIcon, Database, Download, RefreshCw, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { BackupsPanel } from "./components/BackupsPanel";
import { DatabaseList } from "./components/DatabaseList";
import { MetricsPanel } from "./components/MetricsPanel";
import { QueryHistory } from "./components/QueryHistory";
import { ServiceCard } from "./components/ServiceCard";
import { useDatabase } from "./hooks/useDatabase";
import { getBackups, getDatabases, getQueryHistory } from "./services/databaseService";

export default function DatabaseManagerPage() {
    const {
        services,
        metrics,
        refreshing,
        runningCount,
        stoppedCount,
        errorCount,
        handleStart,
        handleStop,
        handleRestart,
        refresh,
    } = useDatabase();

    const databases = getDatabases();
    const queries = getQueryHistory();
    const backups = getBackups();

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Header */}
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

            {/* Metrics */}
            <MetricsPanel metrics={metrics} />

            {/* Services */}
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

            {/* Tabs */}
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
                            icon: <ActivityIcon className="w-3.5 h-3.5" />,
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
                    <DatabaseList databases={databases} />
                </TabsContent>
                <TabsContent value="queries" className="mt-0">
                    <QueryHistory queries={queries} />
                </TabsContent>
                <TabsContent value="backups" className="mt-0">
                    <BackupsPanel backups={backups} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
