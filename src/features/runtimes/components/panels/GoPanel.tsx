import { useState } from "react";
import { Sliders, Command, Globe, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/core/lib/utils";
import { accentMap } from "../../utils/accent.utils";
import { LangMeta } from "../../types/runtime.types";
import { GO_ENV_VARS } from "../../data/go.data";
import { EnvVarPanel } from "../EnvVarPanel";

interface GoPanelProps {
    lang: LangMeta;
}

export function GoPanel({ lang }: GoPanelProps) {
    const colors = accentMap[lang.accent];
    const [activeTab, setActiveTab] = useState("env");

    return (
        <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto gap-1">
                    {[
                        { id: "env", label: "GOENV", icon: <Sliders className="w-3.5 h-3.5" /> },
                        { id: "tools", label: "Tools", icon: <Command className="w-3.5 h-3.5" /> },
                        { id: "modules", label: "Module Proxy", icon: <Globe className="w-3.5 h-3.5" /> },
                    ].map((t) => (
                        <TabsTrigger
                            key={t.id}
                            value={t.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white"
                        >
                            {t.icon}
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="env" className="mt-4">
                    <EnvVarPanel vars={GO_ENV_VARS} colors={colors} />
                </TabsContent>

                <TabsContent value="tools" className="mt-4 space-y-3">
                    {[
                        { name: "gopls", desc: "Go language server", installed: true },
                        { name: "golangci-lint", desc: "Linter aggregator", installed: true },
                        { name: "delve", desc: "Go debugger", installed: false },
                        { name: "staticcheck", desc: "Static analysis", installed: false },
                        { name: "goimports", desc: "Import formatter", installed: true },
                        { name: "godoc", desc: "Documentation server", installed: true },
                    ].map((tool) => (
                        <div key={tool.name} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                            <div className={cn("w-2 h-2 rounded-full", tool.installed ? "bg-green-400" : "bg-white/20")} />
                            <div className="flex-1">
                                <p className="text-sm font-mono">{tool.name}</p>
                                <p className="text-xs text-muted-foreground">{tool.desc}</p>
                            </div>
                            {tool.installed ? (
                                <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
                                    Installed
                                </Badge>
                            ) : (
                                <Button size="sm" className={cn("h-7 text-xs gap-1", colors.bg, colors.text, "border", colors.border)}>
                                    <Download className="w-3 h-3" />
                                    Install
                                </Button>
                            )}
                        </div>
                    ))}
                </TabsContent>

                <TabsContent value="modules" className="mt-4 space-y-3">
                    <p className="text-xs text-muted-foreground">Configure Go module proxy and sum database settings</p>
                    {[
                        { key: "GOPROXY", value: "https://proxy.golang.org,direct", desc: "Module proxy URL" },
                        { key: "GONOSUMCHECK", value: "", desc: "Patterns to skip sum check" },
                        { key: "GONOSUMDB", value: "", desc: "Patterns to skip sum DB" },
                        { key: "GOPRIVATE", value: "", desc: "Private modules" },
                        { key: "GOFLAGS", value: "-mod=mod", desc: "Default flags" },
                    ].map((item) => (
                        <div key={item.key} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10">
                            <div className="flex-1">
                                <p className="text-xs font-mono">{item.key}</p>
                                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                            </div>
                            <Input
                                defaultValue={item.value}
                                className="w-64 h-7 text-xs font-mono bg-white/5 border-white/10"
                                placeholder="Not set"
                            />
                        </div>
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    );
}