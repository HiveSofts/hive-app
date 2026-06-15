import { useState } from "react";

import { FaNodeJs } from "@react-icons/all-files/fa/FaNodeJs";
import { Box, ChevronRight, Globe, Info, Package, RefreshCw, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { GlobalPackagesPanel } from "./components/GlobalPackagesPanel";
import { NodeInfoPanel } from "./components/NodeInfoPanel";
import { NodeVersionCard } from "./components/NodeVersionCard";
import { PackageManagersPanel } from "./components/PackageManagersPanel";
import { ProjectAssignmentRow } from "./components/ProjectAssignmentRow";

export interface NodeVersion {
    id: string;
    major: string;
    full: string;
    lts: boolean;
    installPath: string;
    installedAt: string;
    state: "installed" | "installing" | "not-installed";
    isDefault: boolean;
    downloadSize: string;
    progress?: number;
}

const AVAILABLE_VERSIONS: NodeVersion[] = [
    {
        id: "22",
        major: "22",
        full: "22.14.0",
        lts: true,
        installPath: "~/.hive/node/22",
        installedAt: "",
        state: "not-installed",
        isDefault: false,
        downloadSize: "~35 MB",
    },
    {
        id: "20",
        major: "20",
        full: "20.18.1",
        lts: true,
        installPath: "~/.hive/node/20",
        installedAt: "2024-12-01",
        state: "installed",
        isDefault: true,
        downloadSize: "~34 MB",
    },
    {
        id: "18",
        major: "18",
        full: "18.20.5",
        lts: true,
        installPath: "~/.hive/node/18",
        installedAt: "2024-09-15",
        state: "installed",
        isDefault: false,
        downloadSize: "~33 MB",
    },
    {
        id: "23",
        major: "23",
        full: "23.6.0",
        lts: false,
        installPath: "~/.hive/node/23",
        installedAt: "",
        state: "not-installed",
        isDefault: false,
        downloadSize: "~36 MB",
    },
];

const MOCK_PROJECTS = [
    { id: 1, name: "my-blog", type: "laravel", nodeVersion: null },
    { id: 2, name: "dashboard-app", type: "react", nodeVersion: "20" },
    { id: 3, name: "api-gateway", type: "nextjs", nodeVersion: null },
    { id: 4, name: "vue-portfolio", type: "vue", nodeVersion: "18" },
    { id: 5, name: "nuxt-shop", type: "nuxt", nodeVersion: "20" },
];

export default function NodeManagerPage() {
    const [versions, setVersions] = useState<NodeVersion[]>(AVAILABLE_VERSIONS);

    const defaultVer = versions.find((v) => v.isDefault)?.major ?? "20";
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
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                        <FaNodeJs className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Node.js Manager</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {installedVersions.length} version
                            {installedVersions.length !== 1 ? "s" : ""} installed · Default: Node{" "}
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
                        <NodeVersionCard
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
                            <span className="text-sm font-semibold">Node.js {defaultVer}</span>
                            <Badge
                                variant="outline"
                                className="text-[10px] border-amber-500/40 text-amber-500"
                            >
                                Default
                            </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            ~/.hive/node/{defaultVer}/bin/node · Used by CLI and new projects
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono bg-muted rounded px-2 py-1">node -v</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>v{versions.find((v) => v.isDefault)?.full}</span>
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
                        {
                            id: "packagers",
                            label: "Package Managers",
                            icon: <Box className="w-3.5 h-3.5" />,
                        },
                        {
                            id: "global",
                            label: "Global Packages",
                            icon: <Globe className="w-3.5 h-3.5" />,
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
                                <span className="text-xs font-medium">
                                    Node.js version per project
                                </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                Creates <span className="font-mono">.node-version</span> in project
                                root
                            </span>
                        </div>
                        <div>
                            {MOCK_PROJECTS.map((p) => (
                                <ProjectAssignmentRow
                                    key={p.id}
                                    project={p}
                                    versions={versions}
                                    defaultVersion={defaultVer}
                                />
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="packagers" className="mt-0">
                    <PackageManagersPanel />
                </TabsContent>

                <TabsContent value="global" className="mt-0">
                    <GlobalPackagesPanel />
                </TabsContent>

                <TabsContent value="info" className="mt-0">
                    <NodeInfoPanel versions={versions} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
