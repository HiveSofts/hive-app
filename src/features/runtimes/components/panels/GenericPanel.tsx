import { Download, Globe, GitBranch, Package, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/core/lib/utils";
import { accentMap } from "../../utils/accent.utils";
import { LangMeta } from "../../types/runtime.types";
import { EnvVarPanel } from "../EnvVarPanel";

interface GenericPanelProps {
    lang: LangMeta;
}

export function GenericPanel({ lang }: GenericPanelProps) {
    const colors = accentMap[lang.accent];

    return (
        <div className="space-y-4">
            {!lang.installed && (
                <div className={cn("rounded-xl border p-4 flex items-center gap-3", colors.border, colors.bg)}>
                    <Download className={cn("w-4 h-4 shrink-0", colors.text)} />
                    <div className="flex-1">
                        <p className="text-sm font-medium">{lang.name} is not installed</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Install from {lang.website}</p>
                    </div>
                    <Button
                        size="sm"
                        className={cn("text-xs gap-1.5", colors.bg, colors.text, "border", colors.border)}
                        onClick={() => window.open(lang.website)}
                    >
                        <Globe className="w-3 h-3" />
                        Download
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: "Current Version", value: lang.currentVersion || "Not installed", icon: <GitBranch className="w-4 h-4" /> },
                    { label: "Package Manager", value: lang.packageManager, icon: <Package className="w-4 h-4" /> },
                    { label: "Status", value: lang.installed ? "Installed" : "Not installed", icon: <Shield className="w-4 h-4" /> },
                    { label: "Website", value: lang.website.replace("https://", ""), icon: <Globe className="w-4 h-4" /> },
                ].map((item) => (
                    <div key={item.label} className={cn("rounded-xl p-4 border", colors.border, colors.bg)}>
                        <div className={cn("mb-2", colors.text)}>{item.icon}</div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-semibold mt-0.5 truncate">{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Available Versions</p>
                <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                    {lang.versions.map((v) => (
                        <div key={v} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                lang.currentVersion?.startsWith(v.split(" ")[0])
                                    ? colors.text.replace("text-", "bg-")
                                    : "bg-white/20"
                            )} />
                            <span className="text-sm font-mono flex-1">{v}</span>
                            {lang.currentVersion?.startsWith(v.split(" ")[0]) ? (
                                <Badge variant="outline" className={cn("text-[10px] border", colors.border, colors.text)}>
                                    Active
                                </Badge>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-white"
                                >
                                    <Download className="w-3 h-3" />
                                    Install
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <EnvVarPanel
                vars={[
                    { key: `${lang.name.toUpperCase().replace(".", "")}_HOME`, value: `/usr/local/${lang.id}`, description: "Installation directory" },
                    { key: "PATH", value: `$${lang.name.toUpperCase()}_HOME/bin:$PATH`, description: "Path entry" },
                ]}
                colors={colors}
            />
        </div>
    );
}