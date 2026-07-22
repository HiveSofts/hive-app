import { useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { Package, Play, RotateCcw, Settings, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VueBuildPanelProps {
    projectPath: string;
    projectName: string;
    projectType: string;
    packageManager?: string;
}

export const VueBuildPanel = ({
    projectPath,
    projectName,
    packageManager = "npm",
}: VueBuildPanelProps) => {
    const [buildMode, setBuildMode] = useState<"development" | "production">("production");
    const [buildOutput, setBuildOutput] = useState<string>("");
    const [isBuilding, setIsBuilding] = useState(false);
    const [lastBuildTime, setLastBuildTime] = useState<string | null>(null);

    const handleBuild = async () => {
        setIsBuilding(true);
        setBuildOutput("");

        try {
            const startTime = new Date().toLocaleTimeString();
            setBuildOutput(`Starting ${buildMode} build at ${startTime}\n`);

            // In a real implementation, this would call the backend:
            const result = await invoke<string>("build_vue_project", {
                projectPath,
                buildMode,
                packageManager,
            });

            setBuildOutput((prev) => prev + result);
            setLastBuildTime(new Date().toLocaleString());
        } catch (error) {
            console.error("Build failed:", error);
            setBuildOutput((prev) => prev + `\nError: ${(error as Error).message}`);
        } finally {
            setIsBuilding(false);
        }
    };

    const handlePreview = async () => {
        try {
            await invoke("preview_vue_build", {
                projectPath,
                packageManager,
            });
        } catch (error) {
            console.error("Preview failed:", error);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-orange-600" />
                        <span>Build Configuration</span>
                    </CardTitle>
                    <CardDescription>Configure and run builds for your Vue project</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6">
                        <div>
                            <Label>Build Mode</Label>
                            <RadioGroup
                                value={buildMode}
                                onValueChange={(value: "development" | "production") =>
                                    setBuildMode(value)
                                }
                                className="grid grid-cols-2 gap-4 mt-2"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="development" id="development" />
                                    <Label htmlFor="development">Development</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="production" id="production" />
                                    <Label htmlFor="production">Production</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handleBuild}
                                disabled={isBuilding}
                                className="flex items-center gap-2"
                            >
                                {isBuilding ? (
                                    <>
                                        <RotateCcw className="h-4 w-4 animate-spin" />
                                        Building...
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-4 w-4" />
                                        Build Project
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handlePreview}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <Settings className="h-4 w-4" />
                                Preview Build
                            </Button>
                        </div>

                        {lastBuildTime && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Package className="h-4 w-4" />
                                Last build: {lastBuildTime}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Terminal className="h-5 w-5" />
                        <span>Build Output</span>
                    </CardTitle>
                    <CardDescription>Real-time output from build processes</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96 w-full rounded-md border p-4 font-mono text-sm bg-muted">
                        {buildOutput ? (
                            <pre className="whitespace-pre-wrap break-words">{buildOutput}</pre>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                {isBuilding
                                    ? "Build in progress..."
                                    : "Click 'Build Project' to start building your Vue application"}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};
