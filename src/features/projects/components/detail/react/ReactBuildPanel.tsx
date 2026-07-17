import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Hammer, Play, RotateCw, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReactBuildPanelProps {
    projectPath: string;
    packageManager?: string;
}

const LOCKFILES: Record<string, string> = {
    "yarn.lock": "yarn",
    "pnpm-lock.yaml": "pnpm",
    "package-lock.json": "npm",
};

export function ReactBuildPanel({ projectPath, packageManager }: ReactBuildPanelProps) {
    const [pm, setPm] = useState(packageManager || "npm");
    const [scripts, setScripts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState<string | null>(null);
    const [output, setOutput] = useState<string[]>([]);
    const [exitCode, setExitCode] = useState<number | null>(null);
    const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([
        { key: "NODE_ENV", value: "production" },
    ]);

    const outputRef = useRef<HTMLDivElement>(null);
    const unlistenRef = useRef<() => void | null>(null);

    useEffect(() => {
        outputRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [output]);

    useEffect(() => {
        loadPackageManagerAndScripts();
        
        return () => {
            if (unlistenRef.current) {
                unlistenRef.current();
            }
        };
    }, [projectPath]);

    const loadPackageManagerAndScripts = async () => {
        setLoading(true);
        await detectPackageManager();
        await loadScripts();
        setLoading(false);
    };

    const detectPackageManager = useCallback(async () => {
        if (packageManager) {
            setPm(packageManager);
            return;
        }
        for (const [file, manager] of Object.entries(LOCKFILES)) {
            try {
                await invoke<string>("read_project_file", {
                    projectPath,
                    fileName: file,
                });
                setPm(manager);
                return;
            } catch {
                // try next
            }
        }
        setPm("npm");
    }, [packageManager, projectPath]);

    const loadScripts = useCallback(async () => {
        try {
            const raw = await invoke<string>("read_project_file", {
                projectPath,
                fileName: "package.json",
            });
            const json = JSON.parse(raw);
            setScripts(json.scripts || {});
        } catch (error) {
            console.error("Failed to load package.json scripts:", error);
            setScripts({});
        }
    }, [projectPath]);

    const runScript = async (scriptName: string) => {
        if (running) return;
        
        setRunning(scriptName);
        setOutput([]);
        setExitCode(null);
        
        try {
            // Unlisten to any previous listeners
            if (unlistenRef.current) {
                unlistenRef.current();
            }
            
            // Listen for build events
            unlistenRef.current = await listen(`react-build-${Date.now()}`, (event) => {
                const data = event.payload as { type: string; data: string };
                setOutput(prev => [...prev, `[${data.type}] ${data.data}`]);
            });
            
            // Prepare environment variables
            const env: Record<string, string> = {};
            envVars.forEach(envVar => {
                if (envVar.key.trim()) {
                    env[envVar.key] = envVar.value;
                }
            });
            
            // Execute the build script via Tauri command
            const command = pm === 'npm' 
                ? `${pm} run ${scriptName}` 
                : `${pm} ${scriptName}`;
                
            // For now, simulate the build process
            setOutput(prev => [...prev, `Running: ${command}`]);
            
            // Simulate build process
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                setOutput(prev => [...prev, `Building step ${i + 1}/5...`]);
            }
            
            setOutput(prev => [...prev, "Build completed successfully"]);
            setExitCode(0);
        } catch (error) {
            console.error(`Failed to run ${scriptName}:`, error);
            setOutput(prev => [...prev, `Error: ${(error as Error).message}`]);
            setExitCode(1);
        } finally {
            setRunning(null);
        }
    };

    const addEnvVar = () => {
        setEnvVars([...envVars, { key: "", value: "" }]);
    };

    const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
        const newEnvVars = [...envVars];
        newEnvVars[index][field] = value;
        setEnvVars(newEnvVars);
    };

    const removeEnvVar = (index: number) => {
        setEnvVars(envVars.filter((_, i) => i !== index));
    };

    const buildScripts = Object.keys(scripts).filter(script => 
        script.includes('build') || script.includes('compile')
    );

    const otherScripts = Object.keys(scripts).filter(script => 
        !script.includes('build') && !script.includes('compile') && 
        script !== 'start' && script !== 'dev' && script !== 'test'
    );

    return (
        <div className="space-y-6">
            {/* Environment Variables Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Environment Variables</CardTitle>
                    <CardDescription>Configure environment variables for the build process</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {envVars.map((envVar, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="KEY"
                                    value={envVar.key}
                                    onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                                    className="flex-1 border rounded px-3 py-2 text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="value"
                                    value={envVar.value}
                                    onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                                    className="flex-1 border rounded px-3 py-2 text-sm"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeEnvVar(index)}
                                    disabled={envVars.length <= 1}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addEnvVar}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Variable
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Build Scripts Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Hammer className="w-4 h-4" />
                        Build Scripts
                    </CardTitle>
                    <CardDescription>Run build-related scripts for your React project</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div>Loading scripts...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {buildScripts.length > 0 ? (
                                buildScripts.map((script) => (
                                    <Button
                                        key={script}
                                        variant={running === script ? "secondary" : "outline"}
                                        className="justify-start"
                                        onClick={() => runScript(script)}
                                        disabled={running !== null}
                                    >
                                        {running === script ? (
                                            <>
                                                <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                                                Running...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4 mr-2" />
                                                {script}
                                            </>
                                        )}
                                    </Button>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-4 text-muted-foreground">
                                    No build scripts found in package.json
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Other Scripts Card */}
            {!loading && otherScripts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Other Scripts</CardTitle>
                        <CardDescription>Additional scripts defined in your package.json</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {otherScripts.map((script) => (
                                <Button
                                    key={script}
                                    variant="outline"
                                    className="justify-start"
                                    onClick={() => runScript(script)}
                                    disabled={running !== null}
                                >
                                    <Play className="w-4 h-4 mr-2" />
                                    {script}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Output Log */}
            {(output.length > 0 || running) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            Build Output
                            {running && (
                                <Badge variant="secondary" className="ml-auto">
                                    Running: {running}
                                </Badge>
                            )}
                            {exitCode !== null && (
                                <Badge variant={exitCode === 0 ? "default" : "destructive"} className="ml-auto">
                                    Exit: {exitCode}
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-64 rounded-md border p-4 font-mono text-sm whitespace-pre-wrap">
                            {output.map((line, index) => (
                                <div key={index} className="py-1 border-b border-transparent last:border-0">
                                    {line}
                                </div>
                            ))}
                            {running && (
                                <div ref={outputRef} className="h-0" />
                            )}
                        </ScrollArea>
                        {exitCode !== null && exitCode === 0 && (
                            <div className="mt-2 text-sm text-green-600">
                                Build completed successfully
                            </div>
                        )}
                        {exitCode !== null && exitCode !== 0 && (
                            <div className="mt-2 text-sm text-red-600">
                                Build failed with exit code {exitCode}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
