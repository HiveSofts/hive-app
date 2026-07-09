import { useState } from "react";
import { Package, Box, Sliders, Search, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/core/lib/utils";
import { PYTHON_PACKAGES } from "../../data/python.data";
import { LangMeta } from "../../types/runtime.types";
import { accentMap } from "../../utils/accent.utils";
import { EnvVarPanel } from "../EnvVarPanel";
interface PythonPanelProps {
    lang: LangMeta;
}

export function PythonPanel({ lang }: PythonPanelProps) {
    const [pkgSearch, setPkgSearch] = useState("");
    const [packages, setPackages] = useState(PYTHON_PACKAGES);
    const [activeTab, setActiveTab] = useState("packages");
    const [newPkg, setNewPkg] = useState("");
    const colors = accentMap[lang.accent];

    const filtered = packages.filter(
        (p) =>
            p.name.toLowerCase().includes(pkgSearch.toLowerCase()) ||
            (p.description || "").toLowerCase().includes(pkgSearch.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto gap-1">
                    {[
                        { id: "packages", label: "Packages", icon: <Package className="w-3.5 h-3.5" /> },
                        { id: "venvs", label: "Virtualenvs", icon: <Box className="w-3.5 h-3.5" /> },
                        { id: "env", label: "Environment", icon: <Sliders className="w-3.5 h-3.5" /> },
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

                <TabsContent value="packages" className="mt-4 space-y-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search packages..."
                                value={pkgSearch}
                                onChange={(e) => setPkgSearch(e.target.value)}
                                className="pl-8 h-8 text-xs bg-white/5 border-white/10"
                            />
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="sm" className={cn("h-8 text-xs gap-1.5", colors.bg, colors.text, "border", colors.border)}>
                                    <Plus className="w-3.5 h-3.5" />
                                    Install
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-zinc-900 border-white/10">
                                <DialogHeader>
                                    <DialogTitle className="text-sm">Install Package</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3">
                                    <Input
                                        placeholder="Package name (e.g. requests==2.31.0)"
                                        value={newPkg}
                                        onChange={(e) => setNewPkg(e.target.value)}
                                        className="text-sm bg-white/5 border-white/10"
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" className={cn("text-xs flex-1", colors.bg, colors.text, "border", colors.border)}>
                                            pip install
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-xs flex-1 border-white/10 bg-white/5">
                                            poetry add
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                        {filtered.map((pkg) => (
                            <div
                                key={pkg.name}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors group"
                            >
                                <div className={cn("w-1.5 h-1.5 rounded-full", pkg.global ? colors.text.replace("text-", "bg-") : "bg-white/20")} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono">{pkg.name}</span>
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                            v{pkg.version}
                                        </span>
                                        {pkg.global && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-white/10 text-white/40">
                                                global
                                            </Badge>
                                        )}
                                    </div>
                                    {pkg.description && (
                                        <p className="text-[11px] text-muted-foreground">{pkg.description}</p>
                                    )}
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

                <TabsContent value="venvs" className="mt-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">Virtual environments created with venv/virtualenv</p>
                        <Button size="sm" className={cn("h-8 text-xs gap-1.5", colors.bg, colors.text, "border", colors.border)}>
                            <Plus className="w-3.5 h-3.5" />
                            New venv
                        </Button>
                    </div>
                    {[
                        { name: "myproject-env", path: "~/Projects/myproject/.venv", python: "3.11.7", packages: 24 },
                        { name: "django-env", path: "~/Projects/django-app/.venv", python: "3.10.12", packages: 18 },
                    ].map((venv) => (
                        <div key={venv.name} className="rounded-xl border border-white/10 p-4 hover:bg-white/5 transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">{venv.name}</p>
                                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{venv.path}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Python {venv.python}</p>
                                        <p className="text-xs text-muted-foreground">{venv.packages} packages</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-red-400">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </TabsContent>

                <TabsContent value="env" className="mt-4">
                    <EnvVarPanel
                        vars={[
                            { key: "PYTHONPATH", value: "", description: "Module search path" },
                            { key: "PYTHONDONTWRITEBYTECODE", value: "1", description: "Disable .pyc files" },
                            { key: "PYTHONUNBUFFERED", value: "1", description: "Disable output buffering" },
                            { key: "PIP_NO_CACHE_DIR", value: "false", description: "Disable pip cache" },
                            { key: "VIRTUAL_ENV", value: "", description: "Active virtualenv path" },
                        ]}
                        colors={colors}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}