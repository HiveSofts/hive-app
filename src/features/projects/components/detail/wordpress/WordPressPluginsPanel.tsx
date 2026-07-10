import { memo, useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { Boxes, Loader2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface WordPressExtension {
    slug: string;
    name: string;
    version?: string;
    path: string;
}

interface WordPressPluginsPanelProps {
    projectPath: string;
}

export const WordPressPluginsPanel = memo(function WordPressPluginsPanel({
    projectPath,
}: WordPressPluginsPanelProps) {
    const [plugins, setPlugins] = useState<WordPressExtension[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await invoke<WordPressExtension[]>("get_wordpress_plugins", {
                projectPath,
            });
            setPlugins(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load plugins");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectPath]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-medium">Installed Plugins</h3>
                    {!loading && (
                        <Badge variant="outline" className="text-muted-foreground">
                            {plugins.length}
                        </Badge>
                    )}
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground p-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading plugins...</span>
                </div>
            ) : error ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-sm p-4">
                    {error}
                </div>
            ) : plugins.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No plugins found in <span className="font-mono">wp-content/plugins</span>.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {plugins.map((plugin) => (
                        <div
                            key={plugin.slug}
                            className="rounded-lg border bg-card p-3 flex items-start justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{plugin.name}</p>
                                <p className="text-[11px] text-muted-foreground font-mono truncate">
                                    {plugin.slug}
                                </p>
                            </div>
                            {plugin.version && (
                                <Badge
                                    variant="outline"
                                    className="shrink-0 text-amber-500 border-amber-500/30 bg-amber-500/10 font-mono"
                                >
                                    v{plugin.version}
                                </Badge>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
