import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Loader2, Play, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";

interface NextjsBuildPanelProps {
    projectPath: string;
    projectName?: string;
    packageManager?: string;
}

function pmRun(pm: string, script: string): string {
    switch (pm) {
        case "pnpm":
            return `pnpm ${script}`;
        case "yarn":
            return `yarn ${script}`;
        case "bun":
            return `bun run ${script}`;
        default:
            return `npm run ${script}`;
    }
}

interface OutputLine {
    text: string;
    isErr: boolean;
}

export function NextjsBuildPanel({
    projectPath,
    packageManager,
}: NextjsBuildPanelProps) {
    const pm = packageManager ?? "npm";

    const [scripts, setScripts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState<string | null>(null);
    const [output, setOutput] = useState<OutputLine[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const content = await invoke<string>("read_project_file", {
                projectPath,
                fileName: "package.json",
            });
            const json = JSON.parse(content);
            setScripts(json.scripts || {});
        } catch (e) {
            setError(
                typeof e === "string"
                    ? e
                    : "Failed to read package.json scripts."
            );
        } finally {
            setLoading(false);
        }
    }, [projectPath]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (output.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [output]);

    const run = async (script: string) => {
        if (running) return;
        setRunning(script);
        setOutput([]);

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
                return;
            }
            setOutput((prev) => [
                ...prev,
                { text: event.payload.line, isErr: event.payload.is_stderr },
            ]);
        });

        try {
            await invoke("execute_shell_streaming", {
                sessionId: sid,
                command: pmRun(pm, script),
                cwd: projectPath,
            });
        } catch (e: any) {
            setOutput((prev) => [...prev, { text: String(e), isErr: true }]);
            setRunning(null);
            unlisten();
        }
    };

    const scriptEntries = Object.entries(scripts);

    return (
        <div className="space-y-4">
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                            Scripts
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                            ({scriptEntries.length})
                        </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono capitalize">
                        {pm}
                    </span>
                </div>

                <div className="p-4 space-y-4">
                    {error && (
                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                            {error}
                        </p>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : scriptEntries.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                            No scripts defined in package.json.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {scriptEntries.map(([name, cmd]) => (
                                <div
                                    key={name}
                                    className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium font-mono truncate">
                                            {name}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground font-mono truncate">
                                            {cmd}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={running !== null}
                                        onClick={() => run(name)}
                                        className="shrink-0 gap-1.5"
                                    >
                                        {running === name ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Play className="w-3.5 h-3.5" />
                                        )}
                                        Run
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {output.length > 0 && (
                <div className="rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-950 shadow-xl">
                    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80 select-none">
                        <span className="w-3 h-3 rounded-full bg-red-500/80" />
                        <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                        <span className="ml-3 text-[11px] text-zinc-500 font-mono">
                            {running ? `running ${running}…` : "output"}
                        </span>
                    </div>
                    <div className="p-4 font-mono text-xs min-h-[120px] max-h-[360px] overflow-y-auto space-y-1">
                        {output.map((l, i) => (
                            <pre
                                key={i}
                                className={`whitespace-pre-wrap leading-relaxed ${
                                    l.isErr ? "text-red-400" : "text-zinc-300"
                                }`}
                            >
                                {l.text}
                            </pre>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                </div>
            )}
        </div>
    );
}
