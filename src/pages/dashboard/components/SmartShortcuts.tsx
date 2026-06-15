import { useState } from "react";

import { Activity, CheckCircle2, Database, Package, Terminal, Trash2, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

const RECENT_CMDS = [
    "php artisan cache:clear",
    "php artisan migrate",
    "composer install",
    "php artisan optimize",
    "npm run build",
];

export function SmartShortcuts() {
    const [ran, setRan] = useState<string | null>(null);
    const run = (cmd: string) => {
        setRan(cmd);
        setTimeout(() => setRan(null), 1800);
    };

    return (
        <div className="space-y-4">
            <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Recent commands
                </p>
                <div className="flex flex-wrap gap-2">
                    {RECENT_CMDS.map((cmd) => (
                        <button
                            key={cmd}
                            onClick={() => run(cmd)}
                            className={cn(
                                "flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded-lg border transition-all",
                                ran === cmd
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                                    : "bg-muted/40 border-border hover:bg-muted hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {ran === cmd ? (
                                <CheckCircle2 className="w-3 h-3" />
                            ) : (
                                <Terminal className="w-3 h-3" />
                            )}
                            {cmd}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Laravel · my-blog
                </p>
                <div className="flex flex-wrap gap-2">
                    {[
                        {
                            label: "Run Migrations",
                            icon: <Database className="w-3 h-3" />,
                            cmd: "php artisan migrate",
                        },
                        {
                            label: "Optimize",
                            icon: <Zap className="w-3 h-3" />,
                            cmd: "php artisan optimize",
                        },
                        {
                            label: "Clear Cache",
                            icon: <Trash2 className="w-3 h-3" />,
                            cmd: "php artisan cache:clear",
                        },
                        {
                            label: "Install NPM",
                            icon: <Package className="w-3 h-3" />,
                            cmd: "npm install",
                        },
                        {
                            label: "Queue Work",
                            icon: <Activity className="w-3 h-3" />,
                            cmd: "php artisan queue:work",
                        },
                    ].map((t) => (
                        <button
                            key={t.label}
                            onClick={() => run(t.cmd)}
                            className={cn(
                                "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all",
                                ran === t.cmd
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                                    : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {ran === t.cmd ? <CheckCircle2 className="w-3 h-3" /> : t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
