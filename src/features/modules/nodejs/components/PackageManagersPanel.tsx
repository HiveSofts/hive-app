import { useState } from "react";

import { CheckCircle2, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getPackageManagers } from "../services/nodeService";
import { PackageManager } from "../types";

export function PackageManagersPanel() {
    const [managers, setManagers] = useState<PackageManager[]>(() => getPackageManagers());
    const [installing, setInstalling] = useState<string | null>(null);

    const handleInstall = (id: string) => {
        setInstalling(id);
        setTimeout(() => {
            setManagers((prev) => prev.map((p) => (p.id === id ? { ...p, installed: true } : p)));
            setInstalling(null);
        }, 2000);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                {managers.map((pm) => {
                    const IconComponent = pm.icon;
                    return (
                        <div
                            key={pm.id}
                            className="rounded-xl border bg-card p-4 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                                    <IconComponent className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">{pm.name}</div>
                                    <div className="text-[11px] font-mono text-muted-foreground">
                                        v{pm.version}
                                    </div>
                                </div>
                            </div>
                            {pm.installed ? (
                                <Badge
                                    variant="outline"
                                    className="text-emerald-500 border-emerald-500/30 text-[10px]"
                                >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Installed
                                </Badge>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() => handleInstall(pm.id)}
                                    disabled={installing === pm.id}
                                    className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1"
                                >
                                    {installing === pm.id ? (
                                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Download className="w-3 h-3" />
                                    )}
                                    Install
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground">
                💡 Tip: You can also install any package manager globally using:{" "}
                <code className="font-mono text-emerald-400">npm install -g &lt;name&gt;</code>
            </div>
        </div>
    );
}
