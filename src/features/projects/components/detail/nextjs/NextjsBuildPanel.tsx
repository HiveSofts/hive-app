import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Hammer, Play, RotateCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface NextjsBuildPanelProps {
    projectPath: string;
    packageManager?: string;
}

const LOCKFILES: Record<string, string> = {
    "yarn.lock": "yarn",
    "pnpm-lock.yaml": "pnpm",
    "package-lock.json": "npm",
};

export function NextjsBuildPanel({
    projectPath,
    packageManager,
}: NextjsBuildPanelProps) {
    const [pm, setPm] = useState(packageManager || "npm");
    const [scripts, setScripts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState<string | null>(null);
    const [output, setOutput] = useState<string[]>([]);
    const [exitCode, setExitCode] = useState<number | null>(null);

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
                // try next
            }
        }
        setPm("npm");
    }, [packageManager, projectPath]);

    const loadScripts = useCallback(async () => {
        setLoading(true);
        try {
            const raw = await invoke<string>("read_project_file", {
                projectPath,
                fileName: "package.json",
            });
            const json = JSON.parse(raw);
            setScripts(json.scripts || {});
        } catch (error) {
            console.error("Failed to load package.json scripts:", error);
            setScripts({});
        } finally {
            setLoading(false);
        }
    }, [projectPath]);

    useEffect(() => {
        detectPackageManager();
        loadScripts();
    }, [detectPackageManager, loadScripts]);

    const runScript = useCallback(
        async (script: string) => {
            if (running) return;
            const cmd =
                pm === "yarn"
                    ? `yarn ${script}`
                    : pm === "pnpm"
                      ? `pnpm ${script}`
                      : `npm run ${script}`;
            setRunning(script);
            setExitCode(null);
            setOutput((prev) => [...prev, `$ ${cmd}`]);
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
                    setRunning(null);
                    setExitCode(event.payload.exit_code);
                    return;
                }
                setOutput((prev) => [...prev, event.payload.line]);
            });
            try {
                await invoke("execute_shell_streaming", {
                    sessionId: sid,
                    command: cmd,
                    cwd: projectPath,
                });
            } catch (e: any) {
                setOutput((prev) => [...prev, String(e)]);
                setRunning(null);
                unlisten();
            }
        },
        [pm, projectPath, running]
    );

    const clearOutput = () => {
        setOutput([]);
        setExitCode(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
                <Badge
                    variant="outline"
                    className="gap-1.5 font-mono text-indigo-500 border-indigo-500/30 bg-indigo-500/10"
                >
                    <Hammer className="w-3 h-3" />
                    <span className="capitalize">{pm}</span>
                </Badge>
                <span className="text-xs text-muted-foreground">
                    {Object.keys(scripts).length} scripts available
                </span>
            </div>

            <div className="flex gap-2 flex-wrap">
                {Object.keys(scripts).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No scripts defined in package.json
                    </p>
                ) : (
                    Object.entries(scripts).map(([name, command]) => (
                        <button
                            key={name}
                            onClick={() => runScript(name)}
                            disabled={!!running}
                            title={command}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {running === name ? (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Play className="w-3 h-3" />
                            )}
                            {name}
                        </button>
                    ))
                )}
            </div>

            <div className="rounded-xl border border-zinc-700/60 bg-zinc-950 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
                    <span className="text-[11px] text-zinc-500 font-mono">
                        build output
                    </span>
                    {output.length > 0 && (
                        <button
                            onClick={clearOutput}
                            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                        >
                            <RotateCw className="w-3 h-3" />
                            Clear
                        </button>
                    )}
                </div>
                <div className="p-4 font-mono text-xs min-h-[200px] max-h-[420px] overflow-y-auto space-y-0.5">
                    {output.length === 0 ? (
                        <p className="text-zinc-600">
                            Run a script to see its output here.
                        </p>
                    ) : (
                        <>
                            {output.map((line, i) => (
                                <pre
                                    key={i}
                                    className="whitespace-pre-wrap leading-relaxed text-zinc-300"
                                >
                                    {line}
                                </pre>
                            ))}
                            {exitCode !== null && (
                                <pre
                                    className={`whitespace-pre-wrap leading-relaxed ${
                                        exitCode === 0
                                            ? "text-emerald-400"
                                            : "text-red-400"
                                    }`}
                                >
                                    {exitCode === 0
                                        ? "✓ Finished successfully"
                                        : `✗ Exited with code ${exitCode}`}
                                </pre>
                            )}
                            <div ref={outputRef} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
