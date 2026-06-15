import { useState } from "react";

import { SiNpm } from "@react-icons/all-files/si/SiNpm";
import { SiYarn } from "@react-icons/all-files/si/SiYarn";
import { IconBrandPnpm } from "@tabler/icons-react";
import { CheckCircle2, Download } from "lucide-react";
import { Cake } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PackageManager {
    id: "npm" | "yarn" | "pnpm" | "bun";
    name: string;
    icon: React.ReactNode;
    version: string;
    installed: boolean;
}

const PACKAGE_MANAGERS: PackageManager[] = [
    {
        id: "npm",
        name: "npm",
        icon: <SiNpm className="w-4 h-4 text-red-500" />,
        version: "10.9.0",
        installed: true,
    },
    {
        id: "yarn",
        name: "Yarn",
        icon: <SiYarn className="w-4 h-4 text-blue-500" />,
        version: "1.22.22",
        installed: true,
    },
    {
        id: "pnpm",
        name: "pnpm",
        icon: <IconBrandPnpm className="w-4 h-4 text-orange-500" />,
        version: "9.15.0",
        installed: false,
    },
    {
        id: "bun",
        name: "Bun",
        icon: <Cake className="w-4 h-4 text-yellow-500" />,
        version: "1.1.38",
        installed: false,
    },
];

export function PackageManagersPanel() {
    const [managers, setManagers] = useState(PACKAGE_MANAGERS);
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
                {managers.map((pm) => (
                    <div
                        key={pm.id}
                        className="rounded-xl border bg-card p-4 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                                {pm.icon}
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
                ))}
            </div>
            <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground">
                💡 Tip: You can also install any package manager globally using:{" "}
                <code className="font-mono text-emerald-400">npm install -g &lt;name&gt;</code>
            </div>
        </div>
    );
}
