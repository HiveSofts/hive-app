import { useState } from "react";

import { openUrl } from "@tauri-apps/plugin-opener";
import { AlertTriangle, ArrowRight, Box, Download, ExternalLink, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getDockerInstallUrl, installDockerLinux } from "../services/docker.service";

interface Props {
    onRefresh: () => void;
}

export function DockerNotInstalled({ onRefresh }: Props) {
    const [installing, setInstalling] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isLinux] = useState(() => navigator.platform.toLowerCase().includes("linux"));

    const openInstallPage = async () => {
        const url = await getDockerInstallUrl();
        await openUrl(url);
    };

    const runLinuxInstall = async () => {
        setInstalling(true);
        setLogs([]);
        try {
            const result = await installDockerLinux((line) => setLogs((prev) => [...prev, line]));
            setLogs((prev) => [...prev, "✓ " + result]);
            setTimeout(onRefresh, 2000);
        } catch (e: any) {
            setLogs((prev) => [...prev, `✗ ${e}`]);
        } finally {
            setInstalling(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <Box className="w-10 h-10 text-blue-500" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Docker not detected</h2>
            <p className="text-sm text-muted-foreground text-center mb-8 max-w-md">
                Docker is required to run database containers. Install Docker Desktop
                (Windows/macOS) or Docker Engine (Linux) to continue.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-8">
                <div className="rounded-xl border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="text-xl">🪟</span> Windows
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Download Docker Desktop installer from the official website.
                    </p>
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5 text-xs"
                        onClick={openInstallPage}
                    >
                        <Download className="w-3.5 h-3.5" />
                        Download Docker Desktop
                        <ExternalLink className="w-3 h-3 ml-auto" />
                    </Button>
                </div>

                <div className="rounded-xl border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="text-xl">🐧</span> Linux
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Auto-install Docker Engine for your distro (requires sudo).
                    </p>
                    {isLinux ? (
                        <Button
                            size="sm"
                            className="w-full gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={runLinuxInstall}
                            disabled={installing}
                        >
                            <Terminal className="w-3.5 h-3.5" />
                            {installing ? "Installing..." : "Install Docker Engine"}
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-1.5 text-xs"
                            onClick={openInstallPage}
                        >
                            <ExternalLink className="w-3 h-3" />
                            View Linux install guide
                        </Button>
                    )}
                </div>
            </div>

            {logs.length > 0 && (
                <div className="w-full rounded-xl border bg-black/40 p-4 font-mono text-[11px] max-h-48 overflow-y-auto space-y-0.5">
                    {logs.map((line, i) => (
                        <div
                            key={i}
                            className={
                                line.startsWith("✗")
                                    ? "text-red-400"
                                    : line.startsWith("✓")
                                      ? "text-emerald-400"
                                      : "text-muted-foreground"
                            }
                        >
                            {line}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2 mt-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 w-full">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                After installing Docker, make sure the Docker daemon is running, then click Refresh.
            </div>

            <Button variant="ghost" size="sm" className="mt-4 gap-1.5 text-xs" onClick={onRefresh}>
                <ArrowRight className="w-3.5 h-3.5" />
                I've installed Docker, Refresh
            </Button>
        </div>
    );
}
