import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Cloud, Loader2, Play, Rocket, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NextjsDeployPanelProps {
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

export function NextjsDeployPanel({
    projectPath,
    packageManager,
}: NextjsDeployPanelProps) {
    const pm = packageManager ?? "npm";

    const [vercelAvailable, setVercelAvailable] = useState<boolean | null>(null);
    const [netlifyAvailable, setNetlifyAvailable] = useState<boolean | null>(null);
    const [running, setRunning] = useState<string | null>(null);
    const [output, setOutput] = useState<OutputLine[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    const detect = useCallback(async () => {
        try {
            setVercelAvailable(await invoke<boolean>("check_command_exists", { command: "vercel" }));
        } catch {
            setVercelAvailable(false);
        }
        try {
            setNetlifyAvailable(
                await invoke<boolean>("check_command_exists", { command: "netlify" })
            );
        } catch {
            setNetlifyAvailable(false);
        }
    }, []);

    useEffect(() => {
        detect();
    }, [detect]);

    useEffect(() => {
        if (output.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [output]);

    const run = async (label: string, command: string) => {
        if (running) return;
        setRunning(label);
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
                command,
                cwd: projectPath,
            });
        } catch (e: any) {
            setOutput((prev) => [...prev, { text: String(e), isErr: true }]);
            setRunning(null);
            unlisten();
        }
    };

    const actions = [
        {
            label: "Build for Production",
            description: "Run the production build (next build)",
            icon: <Server className="w-4 h-4" />,
            command: pmRun(pm, "build"),
            available: true,
        },
        {
            label: "Start Production Server",
            description: "Serve the optimized production build",
            icon: <Play className="w-4 h-4" />,
            command: pmRun(pm, "start"),
            available: true,
        },
        {
            label: "Deploy to Vercel",
            description: "Push to Vercel (requires Vercel CLI)",
            icon: <Rocket className="w-4 h-4" />,
            command: "vercel deploy --prod",
            available: vercelAvailable,
        },
        {
            label: "Deploy to Netlify",
            description: "Push to Netlify (requires Netlify CLI)",
            icon: <Cloud className="w-4 h-4" />,
            command: "netlify deploy --prod",
            available: netlifyAvailable,
        },
    ];

    return (
        <div className="space-y-4">
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                    <Rocket className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                        Deployment
                    </span>
                </div>

                <div className="p-4 space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Build and ship your Next.js app. Production builds run locally;
                        platform deployments use their respective CLIs when installed.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {actions.map((action) => {
                            const disabled =
                                running !== null ||
                                action.available === false ||
                                action.available === null;
                            return (
                                <div
                                    key={action.label}
                                    className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-indigo-400">{action.icon}</span>
                                        <span className="text-sm font-medium">
                                            {action.label}
                                        </span>
                                        {action.available === false && (
                                            <Badge
                                                variant="outline"
                                                className="ml-auto text-[10px] text-zinc-500"
                                            >
                                                CLI missing
                                            </Badge>
                                        )}
                                        {action.available === null && (
                                            <Badge
                                                variant="outline"
                                                className="ml-auto text-[10px] text-zinc-500"
                                            >
                                                checking…
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        {action.description}
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={disabled}
                                        onClick={() => run(action.label, action.command)}
                                        className="mt-auto gap-1.5 self-start"
                                    >
                                        {running === action.label ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Play className="w-3.5 h-3.5" />
                                        )}
                                        Run
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
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
