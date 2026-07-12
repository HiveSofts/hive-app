import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { GitPullRequest, Rocket, Terminal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NextjsDeployPanelProps {
    projectPath: string;
    packageManager?: string;
}

const LOCKFILES: Record<string, string> = {
    "yarn.lock": "yarn",
    "pnpm-lock.yaml": "pnpm",
    "package-lock.json": "npm",
};

export function NextjsDeployPanel({ projectPath, packageManager }: NextjsDeployPanelProps) {
    const [pm, setPm] = useState(packageManager || "npm");
    const [remote, setRemote] = useState<string | null>(null);
    const [branch, setBranch] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [deploying, setDeploying] = useState(false);
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

    const loadGitInfo = useCallback(async () => {
        setLoading(true);
        try {
            const rem = await invoke<string>("execute_shell_command", {
                command: "git remote -v",
                cwd: projectPath,
            }).catch(() => "");
            const remMatch = rem.match(/origin\s+(\S+)\s+\(fetch\)/);
            setRemote(remMatch ? remMatch[1] : null);

            const br = await invoke<string>("execute_shell_command", {
                command: "git rev-parse --abbrev-ref HEAD",
                cwd: projectPath,
            }).catch(() => "");
            setBranch(br.trim() || null);
        } catch {
            setRemote(null);
            setBranch(null);
        } finally {
            setLoading(false);
        }
    }, [projectPath]);

    useEffect(() => {
        detectPackageManager();
        loadGitInfo();
    }, [detectPackageManager, loadGitInfo]);

    const installCmd =
        pm === "yarn"
            ? "yarn install --frozen-lockfile"
            : pm === "pnpm"
              ? "pnpm install --frozen-lockfile"
              : "npm ci";
    const buildCmd = pm === "yarn" ? "yarn build" : pm === "pnpm" ? "pnpm build" : "npm run build";

    const runSteps = useCallback(
        async (steps: string[]) => {
            if (deploying) return;
            setDeploying(true);
            setExitCode(null);
            setOutput([]);
            for (const step of steps) {
                setOutput((prev) => [...prev, `$ ${step}`]);
                const sid = `${Date.now()}-${Math.random()}-${step}`;
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
                        setExitCode(event.payload.exit_code);
                        if (event.payload.exit_code !== 0) setDeploying(false);
                        return;
                    }
                    setOutput((prev) => [...prev, event.payload.line]);
                });
                try {
                    await invoke("execute_shell_streaming", {
                        sessionId: sid,
                        command: step,
                        cwd: projectPath,
                    });
                } catch (e: any) {
                    setOutput((prev) => [...prev, String(e)]);
                    setDeploying(false);
                    unlisten();
                    return;
                }
            }
            setDeploying(false);
        },
        [deploying, projectPath]
    );

    const deploy = () => runSteps(["git pull", installCmd, buildCmd]);
    const buildOnly = () => runSteps([buildCmd]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                    <Rocket className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Deployment</span>
                </div>
                <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">
                                Package Manager
                            </span>
                            <span className="font-mono font-medium capitalize">{pm}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">Branch</span>
                            <span className="font-mono font-medium">{branch ?? "—"}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 col-span-2">
                            <span className="text-[11px] text-muted-foreground">Remote</span>
                            <span className="font-mono font-medium truncate">{remote ?? "—"}</span>
                        </div>
                    </div>

                    {!remote && (
                        <p className="text-xs text-amber-500/80">
                            No git remote configured. Add an origin remote to enable pull-based
                            deploys.
                        </p>
                    )}

                    <div className="flex gap-2 pt-1 border-t">
                        <Button
                            onClick={deploy}
                            disabled={deploying || !remote}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white"
                        >
                            {deploying ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <GitPullRequest className="w-4 h-4 mr-1.5" />
                                    Pull · Install · Build
                                </>
                            )}
                        </Button>
                        <Button variant="outline" onClick={buildOnly} disabled={deploying}>
                            <Rocket className="w-4 h-4 mr-1.5" />
                            Build only
                        </Button>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-zinc-700/60 bg-zinc-950 shadow-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
                    <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[11px] text-zinc-500 font-mono">deploy output</span>
                    {exitCode !== null && (
                        <Badge
                            variant="outline"
                            className={`ml-auto text-[10px] ${
                                exitCode === 0
                                    ? "text-emerald-500 border-emerald-500/30"
                                    : "text-red-500 border-red-500/30"
                            }`}
                        >
                            {exitCode === 0 ? "success" : `exit ${exitCode}`}
                        </Badge>
                    )}
                </div>
                <div className="p-4 font-mono text-xs min-h-[160px] max-h-[360px] overflow-y-auto space-y-0.5">
                    {output.length === 0 ? (
                        <p className="text-zinc-600">Deployment output will appear here.</p>
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
                            <div ref={outputRef} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
