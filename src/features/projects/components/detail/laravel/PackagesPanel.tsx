import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { Package, Plus, Search, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Package {
    name: string;
    version: string;
    installed: string;
    package_type: string;
}

interface SearchResult {
    name: string;
    description: string;
}

interface PackagesPanelProps {
    projectPath: string;
}

export function PackagesPanel({ projectPath }: PackagesPanelProps) {
    const [tab, setTab] = useState<"installed" | "add" | "search">("installed");
    const [pkgInput, setPkgInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [packages, setPackages] = useState<Package[]>([]);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);
    const [removing, setRemoving] = useState<string | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);

    useEffect(() => {
        loadPackages();
    }, [projectPath]);

    const loadPackages = async () => {
        setLoading(true);
        try {
            const result = await invoke<Package[]>("get_installed_packages", { projectPath });
            setPackages(result);
        } catch (error) {
            console.error("Failed to load packages:", error);
        } finally {
            setLoading(false);
        }
    };

    const installPackage = async (pkg: string) => {
        setInstalling(pkg);
        try {
            await invoke("install_package", {
                projectPath,
                package: pkg,
            });
            await loadPackages();
            setPkgInput("");
            setSearchQuery("");
            setSearchResults([]);
            setTab("installed");
        } catch (error) {
            console.error("Failed to install package:", error);
        } finally {
            setInstalling(null);
        }
    };

    const removePackage = async (name: string) => {
        setRemoving(name);
        try {
            await invoke("remove_package", {
                projectPath,
                package: name,
            });
            await loadPackages();
        } catch (error) {
            console.error("Failed to remove package:", error);
        } finally {
            setRemoving(null);
        }
    };

    const searchPackages = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        setSearchError(null);
        try {
            const results = await invoke<SearchResult[]>("search_packages", {
                query: searchQuery.trim(),
                projectPath: projectPath,
            });
            setSearchResults(results);
        } catch (error) {
            setSearchError(error instanceof Error ? error.message : "Search failed");
            console.error("Failed to search packages:", error);
        } finally {
            setSearchLoading(false);
        }
    };

    const isPackageInstalled = (name: string) => {
        return packages.some((pkg) => pkg.name === name);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setTab("installed")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        tab === "installed"
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                >
                    Installed ({packages.length})
                </button>
                <button
                    onClick={() => setTab("add")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        tab === "add"
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                >
                    + Add
                </button>
                <button
                    onClick={() => setTab("search")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        tab === "search"
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                >
                    <Search className="w-3 h-3 inline mr-1" />
                    Search
                </button>
            </div>

            {tab === "installed" && (
                <div className="rounded-xl border overflow-hidden">
                    {packages.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No packages installed
                        </div>
                    ) : (
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
                                                className={`text-[10px] ${
                                                    pkg.package_type === "require-dev"
                                                        ? "text-purple-500 border-purple-500/30"
                                                        : "text-blue-500 border-blue-500/30"
                                                }`}
                                            >
                                                {pkg.package_type}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 text-[11px] px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                onClick={() => removePackage(pkg.name)}
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
                    )}
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
                                onKeyDown={(e) => e.key === "Enter" && installPackage(pkgInput)}
                                disabled={!!installing}
                            />
                            <Button
                                onClick={() => installPackage(pkgInput)}
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

            {tab === "search" && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs">Search packages</Label>
                        <div className="flex gap-2">
                            <Input
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (!e.target.value.trim()) {
                                        setSearchResults([]);
                                    }
                                }}
                                placeholder="Search for packages..."
                                className="font-mono text-xs"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        searchPackages();
                                    }
                                }}
                            />
                            <Button
                                onClick={searchPackages}
                                disabled={!searchQuery.trim() || searchLoading}
                                className="bg-blue-500 hover:bg-blue-600 text-white shrink-0"
                            >
                                {searchLoading ? (
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Search className="w-4 h-4 mr-1" />
                                        Search
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {searchError && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-red-500 text-xs">
                            {searchError}
                        </div>
                    )}

                    {searchLoading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <span className="ml-2 text-xs text-muted-foreground">Searching...</span>
                        </div>
                    )}

                    {!searchLoading && searchResults.length > 0 && (
                        <div className="rounded-xl border overflow-hidden">
                            <div className="bg-muted/30 px-4 py-2 border-b">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Found {searchResults.length} packages
                                </span>
                            </div>
                            <div className="divide-y">
                                {searchResults.map((result) => {
                                    const installed = isPackageInstalled(result.name);
                                    return (
                                        <div
                                            key={result.name}
                                            className="flex items-center justify-between px-4 py-3 hover:bg-muted/20"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    <span className="font-mono text-xs font-medium">
                                                        {result.name}
                                                    </span>
                                                    {installed && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[9px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                                                        >
                                                            Installed
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                    {result.description}
                                                </p>
                                            </div>
                                            {!installed && (
                                                <Button
                                                    size="sm"
                                                    className="h-6 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white shrink-0 ml-2"
                                                    onClick={() => installPackage(result.name)}
                                                    disabled={installing === result.name}
                                                >
                                                    {installing === result.name ? (
                                                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Plus className="w-3 h-3 mr-1" />
                                                            Install
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                            {installed && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 text-[11px] text-muted-foreground cursor-default"
                                                    disabled
                                                >
                                                    <X className="w-3 h-3 mr-1" />
                                                    Installed
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {!searchLoading &&
                        searchQuery.trim() &&
                        searchResults.length === 0 &&
                        !searchError && (
                            <div className="text-center py-8 text-sm text-muted-foreground">
                                No packages found for "{searchQuery}"
                            </div>
                        )}
                </div>
            )}
        </div>
    );
}
