import { useState } from "react";
import { Globe, Sliders, Settings, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/core/lib/utils";
import { LangMeta } from "../../types/runtime.types";
import { accentMap } from "../../utils/accent.utils";
import { NODE_ENV_VARS } from "../../data/node.data";
import { EnvVarPanel } from "../EnvVarPanel";

interface NodePanelProps {
    lang: LangMeta;
}

export function NodePanel({ lang }: NodePanelProps) {
    const [activeTab, setActiveTab] = useState("tools");
    const colors = accentMap[lang.accent];

    const globalPkgs = [
        { name: "npm", version: "10.2.4", description: "Node package manager" },
        { name: "pnpm", version: "8.14.0", description: "Fast disk-efficient package manager" },
        { name: "yarn", version: "4.0.2", description: "Package manager" },
        { name: "nodemon", version: "3.0.2", description: "Auto-restart on changes" },
        { name: "ts-node", version: "10.9.2", description: "TypeScript execution engine" },
        { name: "typescript", version: "5.3.3", description: "TypeScript compiler" },
        { name: "eslint", version: "8.56.0", description: "JavaScript linter" },
        { name: "prettier", version: "3.1.1", description: "Code formatter" },
        { name: "pm2", version: "5.3.0", description: "Process manager" },
    ];

    return (
        <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto gap-1">
                    {[
                        { id: "tools", label: "Global Tools", icon: <Globe className="w-3.5 h-3.5" /> },
                        { id: "env", label: "Environment", icon: <Sliders className="w-3.5 h-3.5" /> },
                        { id: "npm", label: "npm Config", icon: <Settings className="w-3.5 h-3.5" /> },
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

                <TabsContent value="tools" className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Globally installed npm packages</p>
                        <Button size="sm" className={cn("h-8 text-xs gap-1.5", colors.bg, colors.text, "border", colors.border)}>
                            <Plus className="w-3.5 h-3.5" />
                            Install global
                        </Button>
                    </div>
                    <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                        {globalPkgs.map((pkg) => (
                            <div
                                key={pkg.name}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors group"
                            >
                                <div className={cn("w-2 h-2 rounded-full", colors.text.replace("text-", "bg-"))} />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono">{pkg.name}</span>
                                        <span className="text-[10px] font-mono text-muted-foreground">v{pkg.version}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">{pkg.description}</p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <RefreshCw className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:text-red-400">
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="env" className="mt-4">
                    <EnvVarPanel vars={NODE_ENV_VARS} colors={colors} />
                </TabsContent>

                <TabsContent value="npm" className="mt-4 space-y-3">
                    {[
                        { key: "registry", value: "https://registry.npmjs.org/", description: "Package registry URL" },
                        { key: "cache", value: "~/.npm", description: "Cache location" },
                        { key: "prefix", value: "/usr/local", description: "Install prefix" },
                        { key: "fund", value: "true", description: "Show funding messages" },
                        { key: "audit", value: "true", description: "Run security audits" },
                        { key: "save-exact", value: "false", description: "Save exact versions" },
                        { key: "legacy-peer-deps", value: "false", description: "Legacy peer deps mode" },
                    ].map((item) => (
                        <div key={item.key} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                            <div className="flex-1">
                                <p className="text-xs font-mono text-white/80">{item.key}</p>
                                <p className="text-[11px] text-muted-foreground">{item.description}</p>
                            </div>
                            <Input
                                defaultValue={item.value}
                                className="w-48 h-7 text-xs font-mono bg-white/5 border-white/10"
                            />
                        </div>
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    );
}