import { useState } from "react";

import { Download, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GlobalPackage {
    name: string;
    version: string;
    description: string;
}

const INITIAL_PACKAGES: GlobalPackage[] = [
    { name: "next", version: "15.1.0", description: "Next.js framework" },
    { name: "nuxt", version: "3.14.0", description: "Nuxt.js framework" },
    { name: "vite", version: "6.0.3", description: "Next generation frontend tooling" },
    { name: "typescript", version: "5.7.2", description: "TypeScript compiler" },
    { name: "nodemon", version: "3.1.7", description: "Auto-restart node applications" },
    { name: "pm2", version: "5.4.2", description: "Production process manager" },
];

export function GlobalPackagesPanel() {
    const [search, setSearch] = useState("");
    const [removing, setRemoving] = useState<string | null>(null);
    const [packages, setPackages] = useState(INITIAL_PACKAGES);
    const [newPackage, setNewPackage] = useState("");

    const filtered = packages.filter((p) => p.name.includes(search.toLowerCase()));

    const handleRemove = (name: string) => {
        setRemoving(name);
        setTimeout(() => {
            setPackages((prev) => prev.filter((p) => p.name !== name));
            setRemoving(null);
        }, 1500);
    };

    const addPackage = () => {
        if (!newPackage.trim()) return;
        setPackages((prev) => [
            ...prev,
            { name: newPackage.trim(), version: "latest", description: "User installed package" },
        ]);
        setNewPackage("");
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search global packages..."
                        className="pl-8 h-8 text-xs"
                    />
                </div>
                <div className="flex gap-1">
                    <Input
                        value={newPackage}
                        onChange={(e) => setNewPackage(e.target.value)}
                        placeholder="package-name"
                        className="w-40 h-8 text-xs"
                    />
                    <Button
                        onClick={addPackage}
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    >
                        <Download className="w-3 h-3" />
                        Install
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b bg-muted/40">
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Package
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Version
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Description
                            </th>
                            <th className="px-4 py-2.5" />
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((pkg) => (
                            <tr key={pkg.name} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="px-4 py-2.5 font-mono font-medium">{pkg.name}</td>
                                <td className="px-4 py-2.5 font-mono text-emerald-500">
                                    v{pkg.version}
                                </td>
                                <td className="px-4 py-2.5 text-muted-foreground">
                                    {pkg.description}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemove(pkg.name)}
                                        disabled={removing === pkg.name}
                                        className="h-6 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    >
                                        {removing === pkg.name ? (
                                            <span className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3 h-3 mr-1" />
                                        )}
                                        Remove
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
