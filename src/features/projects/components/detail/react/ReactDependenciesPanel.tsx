import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { Package, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ReactDependenciesPanelProps {
    projectPath: string;
    packageManager?: string;
}

interface Dependency {
    name: string;
    version: string;
    type: "dependency" | "devDependency";
}

export function ReactDependenciesPanel({
    projectPath,
    packageManager,
}: ReactDependenciesPanelProps) {
    const [dependencies, setDependencies] = useState<Dependency[]>([]);
    const [devDependencies, setDevDependencies] = useState<Dependency[]>([]);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(false);
    const [packageName, setPackageName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadDependencies();
    }, [projectPath]);

    const loadDependencies = async () => {
        setLoading(true);
        try {
            const raw = await invoke<string>("read_project_file", {
                projectPath,
                fileName: "package.json",
            });
            const json = JSON.parse(raw);

            const deps: Dependency[] = Object.entries(json.dependencies || {}).map(
                ([name, version]) => ({
                    name,
                    version: version as string,
                    type: "dependency",
                })
            );

            const devDeps: Dependency[] = Object.entries(json.devDependencies || {}).map(
                ([name, version]) => ({
                    name,
                    version: version as string,
                    type: "devDependency",
                })
            );

            setDependencies(deps);
            setDevDependencies(devDeps);
        } catch (error) {
            console.error("Failed to load dependencies:", error);
            setDependencies([]);
            setDevDependencies([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInstall = async () => {
        if (!packageName.trim()) return;

        setInstalling(true);
        try {
            // This would call a Tauri command to install the package
            // For now, simulating the installation
            console.log(`Installing ${packageName} using ${packageManager || "npm"}`);
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
            setPackageName("");
            loadDependencies(); // Reload dependencies after installation
        } catch (error) {
            console.error("Failed to install package:", error);
        } finally {
            setInstalling(false);
        }
    };

    const handleUninstall = async (depName: string) => {
        try {
            // This would call a Tauri command to uninstall the package
            console.log(`Uninstalling ${depName} using ${packageManager || "npm"}`);
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
            loadDependencies(); // Reload dependencies after removal
        } catch (error) {
            console.error("Failed to uninstall package:", error);
        }
    };

    const filteredDependencies = dependencies.filter((dep) =>
        dep.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredDevDependencies = devDependencies.filter((dep) =>
        dep.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Install New Dependency */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Install New Package</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Package name (e.g., react-router-dom)"
                            value={packageName}
                            onChange={(e) => setPackageName(e.target.value)}
                            className="max-w-md"
                        />
                        <Button
                            onClick={handleInstall}
                            disabled={installing || !packageName.trim()}
                        >
                            {installing ? (
                                "Installing..."
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" /> Install
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Search Bar */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Search dependencies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {/* Dependencies Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Production Dependencies */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="w-4 h-4 text-indigo-500" />
                            Dependencies
                            <Badge variant="secondary" className="ml-auto">
                                {filteredDependencies.length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div>Loading dependencies...</div>
                        ) : filteredDependencies.length > 0 ? (
                            <ul className="space-y-2">
                                {filteredDependencies.map((dep) => (
                                    <li
                                        key={dep.name}
                                        className="flex items-center justify-between p-2 border rounded-lg"
                                    >
                                        <div>
                                            <div className="font-medium">{dep.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {dep.version}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUninstall(dep.name)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-4 text-muted-foreground">
                                No dependencies found
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Development Dependencies */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="w-4 h-4 text-orange-500" />
                            Dev Dependencies
                            <Badge variant="secondary" className="ml-auto">
                                {filteredDevDependencies.length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div>Loading dev dependencies...</div>
                        ) : filteredDevDependencies.length > 0 ? (
                            <ul className="space-y-2">
                                {filteredDevDependencies.map((dep) => (
                                    <li
                                        key={dep.name}
                                        className="flex items-center justify-between p-2 border rounded-lg"
                                    >
                                        <div>
                                            <div className="font-medium">{dep.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {dep.version}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUninstall(dep.name)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-4 text-muted-foreground">
                                No dev dependencies found
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
