import { useCallback, useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { Loader2, Package, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NextjsDependenciesPanelProps {
    projectPath: string;
    projectName?: string;
    packageManager?: string;
}

function pmAdd(pm: string, pkg: string, dev: boolean): string {
    switch (pm) {
        case "pnpm":
            return `pnpm add ${pkg}${dev ? " -D" : ""}`;
        case "yarn":
            return `yarn add ${pkg}${dev ? " -D" : ""}`;
        case "bun":
            return `bun add ${pkg}${dev ? " -d" : ""}`;
        default:
            return `npm install ${pkg}${dev ? " -D" : ""}`;
    }
}

function pmRemove(pm: string, pkg: string): string {
    switch (pm) {
        case "pnpm":
            return `pnpm remove ${pkg}`;
        case "yarn":
            return `yarn remove ${pkg}`;
        case "bun":
            return `bun remove ${pkg}`;
        default:
            return `npm uninstall ${pkg}`;
    }
}

export function NextjsDependenciesPanel({
    projectPath,
    packageManager,
}: NextjsDependenciesPanelProps) {
    const pm = packageManager ?? "npm";

    const [dependencies, setDependencies] = useState<Record<string, string>>({});
    const [devDependencies, setDevDependencies] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newPkg, setNewPkg] = useState("");
    const [dev, setDev] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const content = await invoke<string>("read_project_file", {
                projectPath,
                fileName: "package.json",
            });
            const json = JSON.parse(content);
            setDependencies(json.dependencies || {});
            setDevDependencies(json.devDependencies || {});
        } catch (e) {
            setError(
                typeof e === "string"
                    ? e
                    : "Failed to read package.json. Is this a valid Next.js project?"
            );
        } finally {
            setLoading(false);
        }
    }, [projectPath]);

    useEffect(() => {
        load();
    }, [load]);

    const handleAdd = async () => {
        const pkg = newPkg.trim();
        if (!pkg) return;
        setBusy("add");
        try {
            await invoke<string>("execute_shell_command", {
                command: pmAdd(pm, pkg, dev),
                cwd: projectPath,
            });
            setNewPkg("");
            await load();
        } catch (e) {
            setError(typeof e === "string" ? e : String(e));
        } finally {
            setBusy(null);
        }
    };

    const handleRemove = async (pkg: string) => {
        setBusy(pkg);
        try {
            await invoke<string>("execute_shell_command", {
                command: pmRemove(pm, pkg),
                cwd: projectPath,
            });
            await load();
        } catch (e) {
            setError(typeof e === "string" ? e : String(e));
        } finally {
            setBusy(null);
        }
    };

    const renderList = (deps: Record<string, string>, isDev: boolean) => {
        const entries = Object.entries(deps);
        if (entries.length === 0) {
            return (
                <p className="text-sm text-muted-foreground py-6 text-center">
                    No {isDev ? "dev " : ""}dependencies yet.
                </p>
            );
        }
        return (
            <div className="divide-y">
                {entries.map(([name, version]) => (
                    <div
                        key={name}
                        className="flex items-center justify-between py-2.5 px-1 group"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-mono truncate">{name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                                {version}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy !== null}
                            onClick={() => handleRemove(name)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
                        >
                            {busy === name ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                            )}
                        </Button>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                            Dependencies
                        </span>
                        <Badge
                            variant="outline"
                            className="gap-1.5 font-mono text-indigo-500 border-indigo-500/30 bg-indigo-500/10 capitalize"
                        >
                            {pm}
                        </Badge>
                    </div>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={newPkg}
                            onChange={(e) => setNewPkg(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                            placeholder="package name (e.g. zod)"
                            className="text-xs font-mono"
                            disabled={busy !== null}
                        />
                        <Button
                            onClick={handleAdd}
                            disabled={!newPkg.trim() || busy !== null}
                            size="sm"
                            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {busy === "add" ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Plus className="w-3.5 h-3.5" />
                            )}
                            Add
                        </Button>
                        <Button
                            onClick={() => setDev((v) => !v)}
                            size="sm"
                            variant={dev ? "default" : "outline"}
                            className={dev ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                            disabled={busy !== null}
                        >
                            {dev ? "dev" : "prod"}
                        </Button>
                    </div>

                    {error && (
                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                            {error}
                        </p>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Tabs defaultValue="dependencies">
                            <TabsList className="h-auto gap-0.5 bg-muted/40 p-1 rounded-lg mb-2">
                                <TabsTrigger
                                    value="dependencies"
                                    className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                >
                                    Dependencies ({Object.keys(dependencies).length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="devDependencies"
                                    className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                >
                                    Dev ({Object.keys(devDependencies).length})
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="dependencies" className="mt-0">
                                {renderList(dependencies, false)}
                            </TabsContent>
                            <TabsContent value="devDependencies" className="mt-0">
                                {renderList(devDependencies, true)}
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    );
}
