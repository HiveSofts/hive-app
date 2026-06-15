import { useState } from "react";

import { CheckCircle2, Info, RefreshCw, Terminal } from "lucide-react";

import { PhpIcon } from "@/components/icons/PhpIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { PhpVersion } from "../PhpManagerPage";

const versionBadgeColor = (v: string) =>
    ({
        "8.4": "border-violet-500/40 bg-violet-500/10 text-violet-400",
        "8.3": "border-amber-500/40 bg-amber-500/10 text-amber-400",
        "8.2": "border-blue-500/40 bg-blue-500/10 text-blue-400",
        "8.1": "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
    })[v] ?? "border-border bg-muted text-muted-foreground";

export function PhpInfoPanel({ versions }: { versions: PhpVersion[] }) {
    const installed = versions.filter((v) => v.state === "installed");
    const [selectedVer, setSelectedVer] = useState(installed[0]?.minor ?? "8.3");
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState<string | null>(null);

    const runTest = () => {
        setRunning(true);
        setOutput(null);
        setTimeout(() => {
            setRunning(false);
            setOutput(`PHP ${selectedVer === "8.3" ? "8.3.14" : "8.2.26"} (cli) (built: Dec  3 2024 12:30:00) (NTS)
Copyright (c) The PHP Group
Zend Engine v4.3.14, Copyright (c) Zend Technologies
    with Zend OPcache v${selectedVer === "8.3" ? "8.3.14" : "8.2.26"}, Copyright (c), by Zend Technologies`);
        }, 1200);
    };

    const info = [
        { label: "Version", value: selectedVer === "8.3" ? "8.3.14" : "8.2.26" },
        { label: "Binary", value: `~/.hive/php/${selectedVer}/bin/php` },
        { label: "php.ini", value: `~/.hive/php/${selectedVer}/php.ini` },
        { label: "Extensions dir", value: `~/.hive/php/${selectedVer}/ext` },
        { label: "Zend Engine", value: selectedVer === "8.3" ? "4.3.14" : "4.2.26" },
        { label: "Build date", value: "Dec 3 2024" },
        { label: "Architecture", value: "x86_64 (64-bit)" },
        { label: "Thread safety", value: "disabled (NTS)" },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/40 text-xs">
                    <PhpIcon className="w-4 h-4" />
                    <select
                        value={selectedVer}
                        onChange={(e) => setSelectedVer(e.target.value)}
                        className="bg-transparent outline-none font-mono cursor-pointer"
                    >
                        {installed.map((v) => (
                            <option key={v.id} value={v.minor}>
                                PHP {v.minor}
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
                    Run php -v
                </Button>
            </div>

            {output && (
                <div className="rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-950">
                    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        <span className="ml-2 text-[11px] text-zinc-500 font-mono">php -v</span>
                    </div>
                    <pre className="p-4 text-xs font-mono text-emerald-400 leading-relaxed">
                        {output}
                    </pre>
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
                                <span className="text-xs text-muted-foreground w-28 shrink-0">
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
                                        className={`font-mono text-[10px] ${versionBadgeColor(v.minor)}`}
                                    >
                                        PHP {v.minor}
                                    </Badge>
                                    <span className="text-xs font-mono text-muted-foreground">
                                        {v.patch}
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
