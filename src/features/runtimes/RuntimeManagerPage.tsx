import { cn } from "@/core/lib/utils";

import { useState } from "react";

import {
    CheckCircle2,
    ChevronRight,
    Cpu,
    Download,
    GitBranch,
    Globe,
    Package,
    RefreshCw,
    Search,
    Trash2,
    Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { PhpPanel } from "./components/panels/PhpPanel";
import { LANGUAGES } from "./data/languages.data";
import { LangId } from "./types/runtime.types";
import { accentMap } from "./utils/accent.utils";

export default function RuntimeManagerPage() {
    const [selected, setSelected] = useState<LangId>("php");
    const [search, setSearch] = useState("");

    const lang = LANGUAGES.find((l) => l.id === selected)!;
    const colors = accentMap[lang.accent];

    const filteredLangs = LANGUAGES.filter(
        (l) =>
            l.name.toLowerCase().includes(search.toLowerCase()) ||
            l.description.toLowerCase().includes(search.toLowerCase())
    );

    const installedCount = LANGUAGES.filter((l) => l.installed).length;

    const renderPanel = () => {
        switch (lang.id) {
            case "php":
                return <PhpPanel lang={lang} />;
            default:
                return (
                    <div className="text-center py-12 text-muted-foreground">
                        Panel for {lang.name} coming soon...
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Cpu className="w-5 h-5 text-white/80" />
                        </div>
                        <div>
                            <h1 className="text-base font-semibold tracking-tight">
                                Runtime Manager
                            </h1>
                            <p className="text-[11px] text-muted-foreground">
                                {installedCount} of {LANGUAGES.length} languages installed
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                                placeholder="Search runtimes..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-7 h-7 text-xs w-44 bg-white/5 border-white/10"
                            />
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5 border-white/10 bg-white/5"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1">
                <div className="w-64 shrink-0 border-r border-white/10 bg-black/10">
                    <div className="p-3 space-y-1">
                        {filteredLangs.map((l) => {
                            const c = accentMap[l.accent];
                            const isSelected = l.id === selected;
                            return (
                                <button
                                    key={l.id}
                                    onClick={() => setSelected(l.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150",
                                        isSelected
                                            ? cn("bg-white/10 border border-white/15", "shadow-sm")
                                            : "hover:bg-white/5 border border-transparent"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0",
                                            isSelected ? c.bg : "bg-white/5"
                                        )}
                                    >
                                        {l.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-medium truncate">
                                                {l.name}
                                            </span>
                                            {l.installed && (
                                                <div
                                                    className={cn(
                                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                                        isSelected
                                                            ? c.text.replace("text-", "bg-")
                                                            : "bg-green-400/60"
                                                    )}
                                                />
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground truncate">
                                            {l.installed ? l.currentVersion : "Not installed"}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <div className="p-6 space-y-6">
                        <div
                            className={cn(
                                "rounded-2xl border p-5",
                                colors.border,
                                "bg-gradient-to-br from-white/5 to-transparent"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div
                                        className={cn(
                                            "w-14 h-14 rounded-2xl border flex items-center justify-center text-3xl",
                                            colors.border,
                                            colors.bg
                                        )}
                                    >
                                        {lang.icon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2.5">
                                            <h2 className="text-xl font-bold">{lang.name}</h2>
                                            {lang.installed ? (
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-xs border",
                                                        colors.border,
                                                        colors.text
                                                    )}
                                                >
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    {lang.currentVersion}
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs border-white/10 text-white/40"
                                                >
                                                    Not installed
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            {lang.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                            <Package className="w-3 h-3" />
                                            {lang.packageManager}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Select
                                        defaultValue={
                                            lang.currentVersion || lang.versions[0]?.version
                                        }
                                    >
                                        <SelectTrigger
                                            className={cn(
                                                "w-36 h-8 text-xs border",
                                                colors.border,
                                                "bg-white/5"
                                            )}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lang.versions.map((v) => (
                                                <SelectItem
                                                    key={v.version}
                                                    value={v.version}
                                                    className="text-xs"
                                                >
                                                    {v.version}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {lang.installed ? (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs gap-1.5 border-white/10 bg-white/5"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                Update
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs gap-1.5 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Remove
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            size="sm"
                                            className={cn(
                                                "h-8 text-xs gap-1.5",
                                                colors.bg,
                                                colors.text,
                                                "border",
                                                colors.border,
                                                "hover:opacity-90"
                                            )}
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Install
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
                                {[
                                    {
                                        label: "Versions",
                                        value: lang.versions.length,
                                        icon: <GitBranch className="w-3.5 h-3.5" />,
                                    },
                                    {
                                        label: "Pkg Manager",
                                        value: lang.packageManager.split(" / ")[0],
                                        icon: <Package className="w-3.5 h-3.5" />,
                                    },
                                    {
                                        label: "Status",
                                        value: lang.installed ? "Active" : "Not installed",
                                        icon: <Zap className="w-3.5 h-3.5" />,
                                    },
                                    {
                                        label: "Platform",
                                        value: "Cross-platform",
                                        icon: <Globe className="w-3.5 h-3.5" />,
                                    },
                                ].map((stat) => (
                                    <div key={stat.label} className="flex items-center gap-2">
                                        <div
                                            className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                                colors.bg,
                                                colors.text
                                            )}
                                        >
                                            {stat.icon}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground">
                                                {stat.label}
                                            </p>
                                            <p className="text-xs font-medium">{stat.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {renderPanel()}
                    </div>
                </div>
            </div>
        </div>
    );
}
