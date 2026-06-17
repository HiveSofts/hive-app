import { useState } from "react";

import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/app/components/ui/badge.tsx";
import { Button } from "@/app/components/ui/button.tsx";
import { Input } from "@/app/components/ui/input.tsx";
import { Label } from "@/app/components/ui/label.tsx";

const mockPackages = [
    { name: "laravel/framework", version: "^11.0", installed: "11.28.1", type: "require" },
    { name: "livewire/livewire", version: "^3.0", installed: "3.5.12", type: "require" },
    { name: "phpunit/phpunit", version: "^11.0", installed: "11.3.6", type: "require-dev" },
];

export function PackagesPanel() {
    const [tab, setTab] = useState<"installed" | "add">("installed");
    const [pkgInput, setPkgInput] = useState("");
    const [packages, setPackages] = useState(mockPackages);
    const [installing, setInstalling] = useState<string | null>(null);
    const [removing, setRemoving] = useState<string | null>(null);

    const install = () => {
        if (!pkgInput.trim()) return;
        setInstalling(pkgInput.trim());
        setTimeout(() => {
            setPackages((p) => [
                ...p,
                { name: pkgInput.trim(), version: "^latest", installed: "latest", type: "require" },
            ]);
            setInstalling(null);
            setPkgInput("");
        }, 2000);
    };

    const remove = (name: string) => {
        setRemoving(name);
        setTimeout(() => {
            setPackages((p) => p.filter((x) => x.name !== name));
            setRemoving(null);
        }, 1500);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                {(["installed", "add"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${tab === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                        {t === "installed" ? `Installed (${packages.length})` : "+ Add package"}
                    </button>
                ))}
            </div>

            {tab === "installed" && (
                <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b bg-muted/40">
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                    Package
                                </th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                    Installed
                                </th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                    Type
                                </th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody>
                            {packages.map((pkg) => (
                                <tr
                                    key={pkg.name}
                                    className="border-b last:border-0 hover:bg-muted/20"
                                >
                                    <td className="px-4 py-2.5 font-mono text-foreground/90">
                                        {pkg.name}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-emerald-600 dark:text-emerald-400">
                                        {pkg.installed}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] ${pkg.type === "require-dev" ? "text-purple-500 border-purple-500/30" : "text-blue-500 border-blue-500/30"}`}
                                        >
                                            {pkg.type}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 text-[11px] px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                            onClick={() => remove(pkg.name)}
                                            disabled={removing === pkg.name}
                                        >
                                            {removing === pkg.name ? (
                                                <span className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <Trash2 className="w-2.5 h-2.5 mr-1" />
                                                    Remove
                                                </>
                                            )}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === "add" && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs">Package name</Label>
                        <div className="flex gap-2">
                            <Input
                                value={pkgInput}
                                onChange={(e) => setPkgInput(e.target.value)}
                                placeholder="vendor/package-name"
                                className="font-mono text-xs"
                                onKeyDown={(e) => e.key === "Enter" && install()}
                            />
                            <Button
                                onClick={install}
                                disabled={!pkgInput || !!installing}
                                className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                            >
                                {installing ? (
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-1" />
                                        Install
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                    {installing && (
                        <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-4 font-mono text-xs">
                            <div className="flex gap-2 mb-2">
                                <span className="text-emerald-400">❯</span>
                                <span className="text-zinc-100">composer require {installing}</span>
                            </div>
                            <div className="text-zinc-500 animate-pulse">Installing package...</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
