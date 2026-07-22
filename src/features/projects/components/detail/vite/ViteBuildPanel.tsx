import { memo, useState } from "react";

import { Cpu, HardDrive, HardHat, Package, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface ViteBuildPanelProps {
    projectPath: string;
    packageManager?: string;
}

export const ViteBuildPanel = memo(function ViteBuildPanel({
    projectPath,
    packageManager = "npm",
}: ViteBuildPanelProps) {
    const [buildCommand, setBuildCommand] = useState<string>("build");
    const [buildOutputDir, setBuildOutputDir] = useState<string>("dist");
    const [buildEnvironment, setBuildEnvironment] = useState<string>("production");

    const handleBuild = () => {
        // In a real implementation, this would trigger the build process
        console.log(`Building Vite project with command: ${packageManager} run ${buildCommand}`);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HardHat className="w-4 h-4" />
                        Build Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="build-command">Build Command</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                    {packageManager} run
                                </span>
                                <Input
                                    id="build-command"
                                    value={buildCommand}
                                    onChange={(e) => setBuildCommand(e.target.value)}
                                    placeholder="build"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="output-dir">Output Directory</Label>
                            <Input
                                id="output-dir"
                                value={buildOutputDir}
                                onChange={(e) => setBuildOutputDir(e.target.value)}
                                placeholder="dist"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Environment</Label>
                        <div className="flex gap-2 flex-wrap">
                            {["development", "production", "test"].map((env) => (
                                <Badge
                                    key={env}
                                    variant={buildEnvironment === env ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => setBuildEnvironment(env)}
                                >
                                    {env.charAt(0).toUpperCase() + env.slice(1)}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button onClick={handleBuild} className="w-full md:w-auto">
                            <Play className="w-4 h-4 mr-2" />
                            Run Build
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Separator />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        Build Scripts
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-muted-foreground" />
                                <span className="font-mono">dev</span>
                            </div>
                            <span className="text-sm text-muted-foreground font-mono">
                                {packageManager} run dev
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                                <HardHat className="w-4 h-4 text-muted-foreground" />
                                <span className="font-mono">build</span>
                            </div>
                            <span className="text-sm text-muted-foreground font-mono">
                                {packageManager} run build
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                                <HardDrive className="w-4 h-4 text-muted-foreground" />
                                <span className="font-mono">preview</span>
                            </div>
                            <span className="text-sm text-muted-foreground font-mono">
                                {packageManager} run preview
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});
