import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Package, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Dep {
    name: string;
    version: string;
    type: "dependency" | "devDependency";
}

interface NextjsDependenciesPanelProps {
    projectPath: string;
    packageManager?: string;
}

const LOCKFILES: Record<string, string> = {
    "yarn.lock": "yarn",
    "pnpm-lock.yaml": "pnpm",
    "package-lock.json": "npm",
};

export function NextjsDependenciesPanel({
    projectPath,
    packageManager,
}: NextjsDependenciesPanelProps) {
    const [pm, setPm] = useState(packageManager || "npm");
    const [deps, setDeps] = useState<Dep[]>([]);
    const [loading, setLoading] = useState(true);
    const [pkgInput, setPkgInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [installing, setInstalling] = useState<string | null>(null);
    const [removing, setRemoving] = useState<string | null>(null);
    const [output, setOutput] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    const outputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        outputRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [output]);

    const detectPackageManager = useCallback(async () => {
        if (packageManager) {
            setPm(packageManager);
            return;
        }
        for (const [file, manager] of Object.entries(LOCKFILES)) {
            try {
                await invoke<string>("read_project_file", {
                    projectPath,
                    fileName: file,
                });
                setPm(manager);
                return;
            } catch {
                // try next lockfile
            }
        }
        setPm("npm");
    }, [packageManager, projectPath]);

    const loadDependencies = useCallback(async () => {
        setLoading(true);
        try {
            const raw = await invoke<string>("read_project_file", {
                projectPath,
                fileName: "package.json",
            });
            const json = JSON.parse(raw);
            const dependencies = json.dependencies || {};
            const devDependencies = json.devDependencies || {};

            const list: Dep[] = [
                ...Object.entries(dependencies).map(([name, version]) => ({
                    name,
                    version: String(version),
                    type: "dependency" as const,
                })),
                ...Object.entries(devDependencies).map(([name, version]) => ({
                    name,
                    version: String(version),
                    type: "devDependency" as const,
                })),
            ];
            setDeps(list);
        } catch (error) {
            console.error("Failed to load package.json:", error);
            setDeps([]);
        } finally {
            setLoading(false);
        }
    }, [projectPath]);

    useEffect(() => {
        detectPackageManager();
        loadDependencies();
    }, [detectPackageManager, loadDependencies]);

    const runShell = useCallback(
        async (command: string) => {
            setBusy(true);
            setOutput((prev) => [...prev, `$ ${command}`]);
            const sid = `${Date.now()}-${Math.random()}`;
            const unlisten = await listen<{
                session_id: string;
                line: string;
                is_stderr: boolean;
                is_done: boolean;
                exit_code: number | null;
            }>("shell-output", (event) => {
                if (event.payload.session_id !== sid) return;
                if (event.payload.is_done) {
                    unlisten();
                    setBusy(false);
                    return;
                }
                setOutput((prev) => [...prev, event.payload.line]);
            });
            try {
                await invoke("execute_shell_streaming", {
                    sessionId: sid,
                    command,
                    cwd: projectPath,
                });
            } catch (e: any) {
                setOutput((prev) => [...prev, String(e)]);
                setBusy(false);
                unlisten();
            }
        },
        [projectPath]
    );

    const installPackage = async (pkg: string) => {
        if (!pkg.trim() || busy) return;
        setInstalling(pkg);
        const cmd =
            pm === "yarn"
                ? `yarn add ${pkg}`
                : pm === "pnpm"
                  ? `pnpm add ${pkg}`
                  : `npm install ${pkg}`;
        await runShell(cmd);
        setInstalling(null);
        setPkgInput("");
        setSearchQuery("");
        await loadDependencies();
    };

    const removePackage = async (name: string) => {
        if (busy) return;
        setRemoving(name);
        const cmd =
            pm === "yarn"
                ? `yarn remove ${name}`
                : pm === "pnpm"
                  ? `pnpm remove ${name}`
                  : `npm uninstall ${name}`;
        await runShell(cmd);
        setRemoving(null);
        await loadDependencies();
    };

    const filtered = deps.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className="gap-1.5 font-mono text-indigo-500 border-indigo-500/30 bg-indigo-500/10"
                    >
                        <Package className="w-3 h-3" />
                        <span className="capitalize">{pm}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {deps.length} packages
                    </span>
                </div>
                <div className="relative w-48">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter packages..."
                        className="pl-8 h-8 text-xs"
                    />
                </div>
            </div>

            <div className="rounded-xl border overflow-hidden">
                {deps.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        No dependencies found in package.json
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b bg-muted/40">
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                    Package
                                </th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                    Version
                                </th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                    Type
                                </th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((dep) => (
                                <tr
                                    key={`${dep.type}-${dep.name}`}
                                    className="border-b last:border-0 hover:bg-muted/20"
                                >
                                    <td className="px-4 py-2.5 font-mono text-foreground/90">
                                        {dep.name}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-emerald-600 dark:text-emerald-400">
                                        {dep.version}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] ${
                                                dep.type === "devDependency"
                                                    ? "text-purple-500 border-purple-500/30"
                                                    : "text-blue-500 border-blue-500/30"
                                            }`}
                                        >
                                            {dep.type === "devDependency"
                                                ? "dev"
                                                : "prod"}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 text-[11px] px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                            onClick={() => removePackage(dep.name)}
                                            disabled={removing === dep.name || busy}
                                        >
                                            {removing === dep.name ? (
                                                <span className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <Trash2 className="w-2.5 h-2.5 mr-1" />
                                                    Remove
                                                </>
                                            )}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="space-y-2">
                <Label className="text-xs">Add a package</Label>
                <div className="flex gap-2">
                    <Input
                        value={pkgInput}
                        onChange={(e) => setPkgInput(e.target.value)}
                        placeholder="package-name or @scope/package"
                        className="font-mono text-xs"
                        onKeyDown={(e) => e.key === "Enter" && installPackage(pkgInput)}
                        disabled={!!installing || busy}
                    />
                    <Button
                        onClick={() => installPackage(pkgInput)}
                        disabled={!pkgInput || !!installing || busy}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white shrink-0"
                    >
                        {installing ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-1" />
                                Install
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => loadDependencies()}
                        disabled={loading}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {output.length > 0 && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-4 font-mono text-xs max-h-64 overflow-y-auto space-y-0.5">
                    {output.map((line, i) => (
                        <pre
                            key={i}
                            className="whitespace-pre-wrap leading-relaxed text-zinc-300"
                        >
                            {line}
                        </pre>
                    ))}
                    <div ref={outputRef} />
                </div>
            )}
        </div>
    );
}
