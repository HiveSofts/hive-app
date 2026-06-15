import { useState } from "react";

import { ChevronRight, Info, Package, Puzzle, RefreshCw, Settings, Star } from "lucide-react";

import { PhpIcon } from "@/components/icons/PhpIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PhpExtensionsPanel } from "./components/PhpExtensionsPanel";
import { PhpInfoPanel } from "./components/PhpInfoPanel";
import { PhpIniEditor } from "./components/PhpIniEditor";
import { PhpProjectAssignmentRow } from "./components/PhpProjectAssignmentRow";
import { PhpVersionCard } from "./components/PhpVersionCard";

export interface PhpVersion {
    id: string;
    minor: string;
    patch: string;
    full: string;
    installPath: string;
    installedAt: string;
    state: "installed" | "installing" | "not-installed";
    isDefault: boolean;
    downloadSize: string;
    progress?: number;
}

const AVAILABLE_VERSIONS: PhpVersion[] = [
    {
        id: "8.4",
        minor: "8.4",
        patch: "8.4.1",
        full: "PHP 8.4.1",
        installPath: "~/.hive/php/8.4",
        installedAt: "",
        state: "not-installed",
        isDefault: false,
        downloadSize: "~27 MB",
    },
    {
        id: "8.3",
        minor: "8.3",
        patch: "8.3.14",
        full: "PHP 8.3.14",
        installPath: "~/.hive/php/8.3",
        installedAt: "2024-12-01",
        state: "installed",
        isDefault: true,
        downloadSize: "~26 MB",
    },
    {
        id: "8.2",
        minor: "8.2",
        patch: "8.2.26",
        full: "PHP 8.2.26",
        installPath: "~/.hive/php/8.2",
        installedAt: "2024-09-15",
        state: "installed",
        isDefault: false,
        downloadSize: "~25 MB",
    },
    {
        id: "8.1",
        minor: "8.1",
        patch: "8.1.31",
        full: "PHP 8.1.31",
        installPath: "~/.hive/php/8.1",
        installedAt: "",
        state: "not-installed",
        isDefault: false,
        downloadSize: "~24 MB",
    },
];

const MOCK_PROJECTS = [
    { id: 1, name: "my-blog", type: "laravel", phpVersion: null },
    { id: 2, name: "dashboard-app", type: "react", phpVersion: "8.2" },
    { id: 3, name: "api-gateway", type: "nextjs", phpVersion: null },
    { id: 4, name: "shop-backend", type: "php", phpVersion: "8.2" },
];

export default function PhpManagerPage() {
    const [versions, setVersions] = useState<PhpVersion[]>(AVAILABLE_VERSIONS);

    const defaultVer = versions.find((v) => v.isDefault)?.minor ?? "8.3";
    const installedVersions = versions.filter((v) => v.state === "installed");

    const handleInstall = (id: string) => {
        setVersions((prev) =>
            prev.map((v) => (v.id === id ? { ...v, state: "installing", progress: 0 } : v))
        );
        let prog = 0;
        const interval = setInterval(() => {
            prog += Math.round(5 + Math.random() * 10);
            if (prog >= 100) {
                clearInterval(interval);
                setVersions((prev) =>
                    prev.map((v) =>
                        v.id === id
                            ? {
                                  ...v,
                                  state: "installed",
                                  progress: undefined,
                                  installedAt: new Date().toISOString().slice(0, 10),
                              }
                            : v
                    )
                );
            } else {
                setVersions((prev) =>
                    prev.map((v) => (v.id === id ? { ...v, progress: Math.min(prog, 99) } : v))
                );
            }
        }, 300);
    };

    const handleSetDefault = (id: string) => {
        setVersions((prev) => prev.map((v) => ({ ...v, isDefault: v.id === id })));
    };

    const handleRemove = (id: string) => {
        setVersions((prev) =>
            prev.map((v) =>
                v.id === id
                    ? { ...v, state: "not-installed", installedAt: "", isDefault: false }
                    : v
            )
        );
    };

    return (
        <div className="min-h-screen p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <PhpIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">PHP Manager</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {installedVersions.length} version
                            {installedVersions.length !== 1 ? "s" : ""} installed · Default: PHP{" "}
                            {defaultVer}
                        </p>
                    </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Check Updates
                </Button>
            </div>

            <div>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Available Versions
                    </span>
                    <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {versions.map((ver) => (
                        <PhpVersionCard
                            key={ver.id}
                            ver={ver}
                            onInstall={handleInstall}
                            onSetDefault={handleSetDefault}
                            onRemove={handleRemove}
                        />
                    ))}
                </div>
            </div>

            {installedVersions.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4 flex items-center gap-4 flex-wrap">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">PHP {defaultVer}</span>
                            <Badge
                                variant="outline"
                                className="text-[10px] border-amber-500/40 text-amber-500"
                            >
                                Default
                            </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            ~/.hive/php/{defaultVer}/bin/php · Used by CLI and new projects
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono bg-muted rounded px-2 py-1">php -v</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>PHP {versions.find((v) => v.isDefault)?.patch}</span>
                    </div>
                </div>
            )}

            <Tabs defaultValue="projects">
                <TabsList className="flex h-auto gap-0.5 bg-muted/40 p-1 rounded-xl mb-5 w-full sm:w-auto">
                    {[
                        {
                            id: "projects",
                            label: "Project Assignment",
                            icon: <Package className="w-3.5 h-3.5" />,
                        },
                        { id: "ini", label: "php.ini", icon: <Settings className="w-3.5 h-3.5" /> },
                        {
                            id: "extensions",
                            label: "Extensions",
                            icon: <Puzzle className="w-3.5 h-3.5" />,
                        },
                        {
                            id: "info",
                            label: "Info & Test",
                            icon: <Info className="w-3.5 h-3.5" />,
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

                <TabsContent value="projects" className="mt-0">
                    <div className="rounded-xl border bg-card overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                            <div className="flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium">PHP version per project</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                Creates <span className="font-mono">.php-version</span> in project
                                root
                            </span>
                        </div>
                        <div>
                            {MOCK_PROJECTS.map((p) => (
                                <PhpProjectAssignmentRow
                                    key={p.id}
                                    project={p}
                                    versions={versions}
                                    defaultVersion={defaultVer}
                                />
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="ini" className="mt-0">
                    <PhpIniEditor versions={versions} />
                </TabsContent>

                <TabsContent value="extensions" className="mt-0">
                    <PhpExtensionsPanel versions={versions} />
                </TabsContent>

                <TabsContent value="info" className="mt-0">
                    <PhpInfoPanel versions={versions} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
