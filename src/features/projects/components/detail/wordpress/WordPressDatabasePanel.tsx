import { memo } from "react";

import { Copy, Database, Server } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WordPressDatabasePanelProps {
    dbDriver?: string;
    dbName?: string;
    dbUser?: string;
    dbHost?: string;
    dbPort?: number;
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            <span className="font-mono font-medium truncate">{value}</span>
        </div>
    );
}

export const WordPressDatabasePanel = memo(function WordPressDatabasePanel({
    dbDriver,
    dbName,
    dbUser,
    dbHost,
    dbPort,
}: WordPressDatabasePanelProps) {
    const hasConfig = Boolean(dbName || dbHost || dbUser || dbDriver);

    const wpConfig = `define('DB_NAME', '${dbName ?? ""}');
define('DB_USER', '${dbUser ?? ""}');
define('DB_PASSWORD', '${"*".repeat(8)}');
define('DB_HOST', '${dbHost ?? "localhost"}:${dbPort ?? 3306}');
define('DB_CHARSET', 'utf8');
define('DB_COLLATE', '');`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(wpConfig);
        } catch {
            /* ignore */
        }
    };

    if (!hasConfig) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No database configuration found for this project.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-500" />
                <h3 className="text-sm font-medium">Database Configuration</h3>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                    <Server className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Connection</span>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                    <Field label="Driver" value={dbDriver ? dbDriver.toUpperCase() : "—"} />
                    <Field label="Database" value={dbName || "—"} />
                    <Field label="User" value={dbUser || "—"} />
                    <Field label="Host" value={dbHost ? `${dbHost}:${dbPort ?? ""}` : "—"} />
                </div>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground">
                        wp-config.php constants
                    </span>
                    <Button variant="ghost" size="sm" onClick={copy} className="h-7 px-2">
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                    </Button>
                </div>
                <pre className="p-4 text-[11px] font-mono text-emerald-400 bg-zinc-950 overflow-x-auto">
                    {wpConfig}
                </pre>
            </div>

            <p className="text-[11px] text-muted-foreground">
                Hive does not provision the database server. Make sure your{" "}
                <span className="capitalize">{dbDriver || "mysql"}</span> instance is running and
                the database <span className="font-mono">{dbName}</span> exists before starting the
                site.
            </p>
        </div>
    );
});
