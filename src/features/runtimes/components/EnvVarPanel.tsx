import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccentColors, EnvVar } from "../types/runtime.types";
import { CopyButton } from "@/components/ui/CopyButton";

interface EnvVarPanelProps {
    vars: EnvVar[];
    colors: AccentColors;
}

export function EnvVarPanel({ vars, colors }: EnvVarPanelProps) {
    const [envVars, setEnvVars] = useState(vars);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Environment variables</p>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] gap-1"
                    onClick={() =>
                        setEnvVars((prev) => [...prev, { key: "", value: "", description: "" }])
                    }
                >
                    <Plus className="w-3 h-3" />
                    Add
                </Button>
            </div>
            <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                {envVars.map((ev, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors group">
                        <Input
                            value={ev.key}
                            onChange={(e) =>
                                setEnvVars((prev) =>
                                    prev.map((v, j) => (j === i ? { ...v, key: e.target.value } : v))
                                )
                            }
                            className="h-7 text-xs font-mono bg-white/5 border-white/10 w-48 shrink-0"
                            placeholder="KEY"
                        />
                        <span className="text-muted-foreground text-xs">=</span>
                        <Input
                            value={ev.value}
                            onChange={(e) =>
                                setEnvVars((prev) =>
                                    prev.map((v, j) => (j === i ? { ...v, value: e.target.value } : v))
                                )
                            }
                            className="h-7 text-xs font-mono bg-white/5 border-white/10 flex-1"
                            placeholder="value"
                        />
                        <CopyButton text={`${ev.key}=${ev.value}`} />
                        <button
                            onClick={() => setEnvVars((prev) => prev.filter((_, j) => j !== i))}
                            className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}