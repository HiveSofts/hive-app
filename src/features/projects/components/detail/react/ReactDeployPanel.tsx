import { useState } from "react";

import { CheckCircle, Clock, Cloud, Package, Upload, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ReactDeployPanel() {
    const [deploymentTarget, setDeploymentTarget] = useState("vercel");
    const [deploymentStatus, setDeploymentStatus] = useState<
        "idle" | "building" | "uploading" | "deploying" | "success" | "error"
    >("idle");
    const [buildLog, setBuildLog] = useState<string[]>([]);
    const [environmentVariables, setEnvironmentVariables] = useState([
        { key: "NODE_ENV", value: "production", enabled: true },
        { key: "PUBLIC_URL", value: "", enabled: true },
    ]);

    const deploymentTargets = [
        { id: "vercel", name: "Vercel", icon: Cloud },
        { id: "netlify", name: "Netlify", icon: Cloud },
        { id: "aws", name: "AWS Amplify", icon: Cloud },
        { id: "github", name: "GitHub Pages", icon: Cloud },
    ];

    const handleDeploy = async () => {
        setDeploymentStatus("building");
        setBuildLog(["Starting deployment process...", "Detecting project configuration..."]);

        // Simulate deployment process
        setTimeout(() => {
            setBuildLog((prev) => [...prev, "Installing dependencies...", "Building project..."]);
            setDeploymentStatus("uploading");
        }, 1500);

        setTimeout(() => {
            setBuildLog((prev) => [...prev, "Upload complete", "Deploying to production..."]);
            setDeploymentStatus("deploying");
        }, 3000);

        setTimeout(() => {
            setDeploymentStatus("success");
            setBuildLog((prev) => [...prev, "Deployment successful!", "Application is now live"]);
        }, 5000);
    };

    const addEnvironmentVariable = () => {
        setEnvironmentVariables([...environmentVariables, { key: "", value: "", enabled: true }]);
    };

    const updateEnvironmentVariable = (
        index: number,
        field: "key" | "value" | "enabled",
        value: string | boolean
    ) => {
        const newEnvVars = [...environmentVariables];
        (newEnvVars[index] as any)[field] = value;
        setEnvironmentVariables(newEnvVars);
    };

    const removeEnvironmentVariable = (index: number) => {
        setEnvironmentVariables(environmentVariables.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Cloud className="w-4 h-4" />
                        Deployment Configuration
                    </CardTitle>
                    <CardDescription>
                        Configure and deploy your React application to various platforms
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="config" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="config">Configuration</TabsTrigger>
                            <TabsTrigger value="env">Environment</TabsTrigger>
                            <TabsTrigger value="deploy">Deploy</TabsTrigger>
                        </TabsList>

                        <TabsContent value="config" className="space-y-4">
                            <div className="space-y-4">
                                <div>
                                    <Label>Deployment Target</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                        {deploymentTargets.map((target) => {
                                            const IconComponent = target.icon;
                                            return (
                                                <Button
                                                    key={target.id}
                                                    variant={
                                                        deploymentTarget === target.id
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    className="flex flex-col items-center justify-center h-20"
                                                    onClick={() => setDeploymentTarget(target.id)}
                                                >
                                                    <IconComponent className="w-6 h-6 mb-2" />
                                                    <span>{target.name}</span>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="build-script">Build Script</Label>
                                        <Input id="build-script" defaultValue="build" />
                                    </div>
                                    <div>
                                        <Label htmlFor="publish-dir">Publish Directory</Label>
                                        <Input id="publish-dir" defaultValue="build" />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="env" className="space-y-4">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-medium">Environment Variables</h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addEnvironmentVariable}
                                    >
                                        <Package className="w-4 h-4 mr-2" />
                                        Add Variable
                                    </Button>
                                </div>

                                {environmentVariables.map((envVar, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 p-3 border rounded-lg"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={envVar.enabled}
                                            onChange={(e) =>
                                                updateEnvironmentVariable(
                                                    index,
                                                    "enabled",
                                                    e.target.checked
                                                )
                                            }
                                            className="h-4 w-4"
                                        />
                                        <Input
                                            placeholder="KEY"
                                            value={envVar.key}
                                            onChange={(e) =>
                                                updateEnvironmentVariable(
                                                    index,
                                                    "key",
                                                    e.target.value
                                                )
                                            }
                                            className="flex-1"
                                        />
                                        <Input
                                            placeholder="Value"
                                            value={envVar.value}
                                            onChange={(e) =>
                                                updateEnvironmentVariable(
                                                    index,
                                                    "value",
                                                    e.target.value
                                                )
                                            }
                                            className="flex-1"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeEnvironmentVariable(index)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="deploy" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">
                                        Deploy to{" "}
                                        {
                                            deploymentTargets.find((t) => t.id === deploymentTarget)
                                                ?.name
                                        }
                                    </CardTitle>
                                    <CardDescription>
                                        Prepare and deploy your application
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <Button
                                                onClick={handleDeploy}
                                                disabled={deploymentStatus !== "idle"}
                                                className="flex-1"
                                            >
                                                {deploymentStatus === "idle" ? (
                                                    <>
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        Deploy Now
                                                    </>
                                                ) : (
                                                    <>
                                                        {deploymentStatus === "building" &&
                                                            "Building..."}
                                                        {deploymentStatus === "uploading" &&
                                                            "Uploading..."}
                                                        {deploymentStatus === "deploying" &&
                                                            "Deploying..."}
                                                        {deploymentStatus === "success" &&
                                                            "Success!"}
                                                    </>
                                                )}
                                            </Button>

                                            {deploymentStatus !== "idle" && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setDeploymentStatus("idle")}
                                                    disabled={deploymentStatus !== "success"}
                                                >
                                                    Reset
                                                </Button>
                                            )}
                                        </div>

                                        {deploymentStatus !== "idle" && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="capitalize">
                                                        {deploymentStatus}
                                                    </Badge>
                                                    {deploymentStatus === "success" && (
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    )}
                                                    {deploymentStatus === "error" && (
                                                        <XCircle className="w-5 h-5 text-red-500" />
                                                    )}
                                                    {(deploymentStatus === "building" ||
                                                        deploymentStatus === "uploading" ||
                                                        deploymentStatus === "deploying") && (
                                                        <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
                                                    )}
                                                </div>

                                                <div className="border rounded-lg p-4 font-mono text-sm h-40 overflow-y-auto">
                                                    {buildLog.map((log, index) => (
                                                        <div
                                                            key={index}
                                                            className="py-1 border-b border-transparent last:border-0"
                                                        >
                                                            {log}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
