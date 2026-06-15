import { useState } from "react";

import { FaNodeJs } from "@react-icons/all-files/fa/FaNodeJs";
import { CheckCircle2, Info, RefreshCw, Terminal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { NodeVersion } from "../NodeManagerPage";

const versionBadgeColor = (v: string) => {
    const colors: Record<string, string> = {
        "23": "border-violet-500/40 bg-violet-500/10 text-violet-400",
        "22": "border-amber-500/40 bg-amber-500/10 text-amber-400",
        "20": "border-blue-500/40 bg-blue-500/10 text-blue-400",
        "18": "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    };
    return colors[v] ?? "border-border bg-muted text-muted-foreground";
};

export function NodeInfoPanel({ versions }: { versions: NodeVersion[] }) {
    const installed = versions.filter((v) => v.state === "installed");
    const [selectedVer, setSelectedVer] = useState(installed[0]?.major ?? "20");
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState<string | null>(null);

    const runTest = () => {
        setRunning(true);
        setOutput(null);
        setTimeout(() => {
            setRunning(false);
            setOutput(
                `v${selectedVer === "20" ? "20.18.1" : selectedVer === "18" ? "18.20.5" : "22.14.0"}`
            );
        }, 1200);
    };

    const info = [
        {
            label: "Version",
            value: versions.find((v) => v.major === selectedVer)?.full ?? "20.18.1",
        },
        { label: "Binary", value: `~/.hive/node/${selectedVer}/bin/node` },
        {
            label: "npm",
            value:
                versions.find((v) => v.major === selectedVer)?.major === "20" ? "10.9.0" : "10.8.0",
        },
        { label: "Global packages dir", value: `~/.hive/node/${selectedVer}/lib/node_modules` },
        { label: "Cache dir", value: "~/.npm" },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/40 text-xs">
                    <FaNodeJs className="w-4 h-4 text-green-600" />
                    <select
                        value={selectedVer}
                        onChange={(e) => setSelectedVer(e.target.value)}
                        className="bg-transparent outline-none font-mono cursor-pointer"
                    >
                        {installed.map((v) => (
                            <option key={v.id} value={v.major}>
                                Node.js {v.major}
                            </option>
                        ))}
                    </select>
                </div>
                <Button
                    size="sm"
                    onClick={runTest}
                    disabled={running}
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                >
                    {running ? (
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Terminal className="w-3 h-3" />
                    )}
                    Run node -v
                </Button>
            </div>

            {output && (
                <div className="rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-950">
                    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        <span className="ml-2 text-[11px] text-zinc-500 font-mono">node -v</span>
                    </div>
                    <pre className="p-4 text-xs font-mono text-emerald-400">{output}</pre>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">Build Information</span>
                    </div>
                    <div className="divide-y">
                        {info.map((row) => (
                            <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
                                <span className="text-xs text-muted-foreground w-36 shrink-0">
                                    {row.label}
                                </span>
                                <span className="text-xs font-mono text-foreground/90 truncate">
                                    {row.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">Update Check</span>
                    </div>
                    <div className="p-4 space-y-3">
                        {installed.map((v) => (
                            <div key={v.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={`font-mono text-[10px] ${versionBadgeColor(v.major)}`}
                                    >
                                        Node.js {v.major}
                                    </Badge>
                                    <span className="text-xs font-mono text-muted-foreground">
                                        v{v.full}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-emerald-500">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Up to date
                                </div>
                            </div>
                        ))}
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-xs gap-1.5 mt-2"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Check for updates
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
