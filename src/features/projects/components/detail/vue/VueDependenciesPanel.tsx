import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import {
    Package,
    PackageCheck,
    PackageX,
    Plus,
    RefreshCw,
    Search,
    Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Dependency {
    name: string;
    version: string;
    description?: string;
    isDev?: boolean;
}

interface VueDependenciesPanelProps {
    projectPath: string;
    projectName: string;
    projectType: string;
    packageManager?: string;
}

export const VueDependenciesPanel = ({
    projectPath,
    packageManager = "npm",
}: VueDependenciesPanelProps) => {
    const [dependencies, setDependencies] = useState<Dependency[]>([]);
    const [devDependencies, setDevDependencies] = useState<Dependency[]>([]);
    const [installing, setInstalling] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [newPackage, setNewPackage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"prod" | "dev">("prod");

    useEffect(() => {
        loadDependencies();
    }, [projectPath]);

    const loadDependencies = async () => {
        setLoading(true);
        try {
            // In a real implementation, this would call the backend:
            const depsResult = await invoke<any>("get_project_dependencies", {
                projectPath,
                packageManager,
            });

            if (depsResult.dependencies) {
                setDependencies(depsResult.dependencies);
            }

            if (depsResult.devDependencies) {
                setDevDependencies(depsResult.devDependencies);
            }
        } catch (error) {
            console.error("Error loading dependencies:", error);

            // For demo purposes, populate with sample Vue dependencies
            const sampleDeps: Dependency[] = [
                {
                    name: "vue",
                    version: "^3.4.21",
                    description: "The progressive JavaScript framework",
                    isDev: false,
                },
                {
                    name: "vue-router",
                    version: "^4.3.0",
                    description: "Official router for Vue.js",
                    isDev: false,
                },
                {
                    name: "@vueuse/core",
                    version: "^10.9.0",
                    description: "Collection of essential Vue Composition Utilities",
                    isDev: false,
                },
            ];

            const sampleDevDeps: Dependency[] = [
                {
                    name: "@vitejs/plugin-vue",
                    version: "^5.0.4",
                    description: "Vite plugin for Vue 3 single-file components",
                    isDev: true,
                },
                {
                    name: "@vue/cli-service",
                    version: "^5.0.8",
                    description: "CLI service for Vue projects",
                    isDev: true,
                },
                {
                    name: "typescript",
                    version: "~5.3.0",
                    description: "TypeScript enables JavaScript to scale",
                    isDev: true,
                },
                {
                    name: "@types/node",
                    version: "^20.11.30",
                    description: "TypeScript definitions for Node.js",
                    isDev: true,
                },
                {
                    name: "eslint",
                    version: "^8.57.0",
                    description: "Tool for identifying and reporting on patterns in JavaScript",
                    isDev: true,
                },
            ];

            setDependencies(sampleDeps);
            setDevDependencies(sampleDevDeps);
        } finally {
            setLoading(false);
        }
    };

    const installDependency = async () => {
        if (!newPackage.trim()) return;

        setInstalling(true);
        try {
            await invoke("install_dependency", {
                projectPath,
                packageName: newPackage.trim(),
                packageManager,
                isDev: false,
            });

            setNewPackage("");
            loadDependencies(); // Reload dependencies after installation
        } catch (error) {
            console.error("Error installing dependency:", error);
        } finally {
            setInstalling(false);
        }
    };

    const removeDependency = async (packageName: string) => {
        setRemoving(true);
        try {
            await invoke("remove_dependency", {
                projectPath,
                packageName,
                packageManager,
            });

            loadDependencies(); // Reload dependencies after removal
        } catch (error) {
            console.error("Error removing dependency:", error);
        } finally {
            setRemoving(false);
        }
    };

    const filteredDeps = dependencies.filter((dep) =>
        dep.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredDevDeps = devDependencies.filter((dep) =>
        dep.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-blue-600" />
                        <span>Dependencies Management</span>
                    </CardTitle>
                    <CardDescription>
                        Manage your Vue project dependencies and packages
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <Label htmlFor="new-package">Install New Dependency</Label>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    id="new-package"
                                    placeholder="e.g., vue-router, axios, pinia..."
                                    value={newPackage}
                                    onChange={(e) => setNewPackage(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && installDependency()}
                                />
                                <Button
                                    onClick={installDependency}
                                    disabled={installing || !newPackage.trim()}
                                    className="flex items-center gap-2"
                                >
                                    {installing ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4" />
                                    )}
                                    Install
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search dependencies..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-md"
                        />
                    </div>

                    <div className="border-b mb-4">
                        <nav className="flex space-x-8">
                            <button
                                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                                    activeTab === "prod"
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                }`}
                                onClick={() => setActiveTab("prod")}
                            >
                                Dependencies ({dependencies.length})
                            </button>
                            <button
                                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                                    activeTab === "dev"
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                }`}
                                onClick={() => setActiveTab("dev")}
                            >
                                Dev Dependencies ({devDependencies.length})
                            </button>
                        </nav>
                    </div>

                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-2">
                            {loading ? (
                                <div className="flex items-center justify-center h-64">
                                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-muted-foreground">
                                        Loading dependencies...
                                    </span>
                                </div>
                            ) : activeTab === "prod" ? (
                                filteredDeps.length > 0 ? (
                                    filteredDeps.map((dep, index) => (
                                        <div
                                            key={`prod-${index}`}
                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <PackageCheck className="h-5 w-5 text-green-500" />
                                                <div>
                                                    <h4 className="font-medium">{dep.name}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        Version: {dep.version}
                                                    </p>
                                                    {dep.description && (
                                                        <p className="text-xs text-muted-foreground mt-1 max-w-md">
                                                            {dep.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="capitalize">
                                                    {dep.isDev ? "dev" : "prod"}
                                                </Badge>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        removeDependency(dep.name)
                                                    }
                                                    disabled={removing}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                        <PackageX className="h-12 w-12 mb-3 opacity-50" />
                                        <p>No production dependencies found</p>
                                        {searchTerm && (
                                            <p className="text-sm mt-1">
                                                No matches for "{searchTerm}"
                                            </p>
                                        )}
                                    </div>
                                )
                            ) : filteredDevDeps.length > 0 ? (
                                filteredDevDeps.map((dep, index) => (
                                    <div
                                        key={`dev-${index}`}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <PackageCheck className="h-5 w-5 text-blue-500" />
                                            <div>
                                                <h4 className="font-medium">{dep.name}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Version: {dep.version}
                                                </p>
                                                {dep.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 max-w-md">
                                                        {dep.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="capitalize">
                                                dev
                                            </Badge>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => removeDependency(dep.name)}
                                                disabled={removing}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                    <PackageX className="h-12 w-12 mb-3 opacity-50" />
                                    <p>No development dependencies found</p>
                                    {searchTerm && (
                                        <p className="text-sm mt-1">
                                            No matches for "{searchTerm}"
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="flex items-center justify-between mt-4">
                        <Button variant="outline" onClick={loadDependencies} disabled={loading}>
                            <RefreshCw
                                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                            />
                            Refresh Dependencies
                        </Button>

                        <div className="text-sm text-muted-foreground">
                            Using {packageManager} package manager
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
