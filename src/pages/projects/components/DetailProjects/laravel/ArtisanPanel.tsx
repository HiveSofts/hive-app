import { useState } from "react";

import { ChevronRight, Search, Send } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";

const mockArtisanCmds = [
    "cache:clear",
    "config:cache",
    "migrate",
    "migrate:fresh",
    "make:controller",
    "make:model",
    "route:list",
    "queue:work",
];

export function ArtisanPanel() {
    const [search, setSearch] = useState("");
    const [running, setRunning] = useState<string | null>(null);
    const [output, setOutput] = useState<{ cmd: string; result: string } | null>(null);

    const filtered = mockArtisanCmds.filter((c) => c.includes(search));

    const runCmd = (cmd: string) => {
        setRunning(cmd);
        setOutput(null);
        setTimeout(() => {
            setRunning(null);
            setOutput({
                cmd: `php artisan ${cmd}`,
                result: `✔  Command [${cmd}] executed successfully.`,
            });
        }, 1400);
    };

    return (
        <div className="grid grid-cols-5 gap-4 h-[500px]">
            <div className="col-span-2 flex flex-col gap-3">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search commands..."
                        className="pl-8 h-8 text-xs"
                    />
                </div>
                <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
                    {filtered.map((cmd) => (
                        <button
                            key={cmd}
                            onClick={() => runCmd(cmd)}
                            disabled={running === cmd}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-mono hover:bg-muted transition-colors group"
                        >
                            <span className="text-foreground/80 group-hover:text-foreground truncate">
                                {cmd}
                            </span>
                            {running === cmd ? (
                                <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                            ) : (
                                <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
            <div className="col-span-3 flex flex-col gap-3">
                <div className="rounded-xl border border-zinc-700/60 bg-zinc-950 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        <span className="ml-2 text-[11px] text-zinc-500 font-mono">
                            artisan output
                        </span>
                    </div>
                    <div className="flex-1 p-4 font-mono text-xs overflow-y-auto">
                        {!output && !running && (
                            <span className="text-zinc-600">Select a command to run it...</span>
                        )}
                        {running && (
                            <div className="space-y-1">
                                <div className="flex gap-2">
                                    <span className="text-emerald-400">❯</span>
                                    <span className="text-zinc-100">php artisan {running}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-500 mt-2">
                                    <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                    Running...
                                </div>
                            </div>
                        )}
                        {output && (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <span className="text-emerald-400">❯</span>
                                    <span className="text-zinc-100">{output.cmd}</span>
                                </div>
                                <div className="text-emerald-400 mt-1">{output.result}</div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Input
                        placeholder="--flag=value (optional args)"
                        className="text-xs h-8 font-mono"
                    />
                    <Button
                        size="sm"
                        className="h-8 bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                    >
                        <Send className="w-3 h-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
