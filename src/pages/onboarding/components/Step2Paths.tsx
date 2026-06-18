import { useState } from "react";

import { open } from "@tauri-apps/plugin-dialog";
import { ArrowLeft, ArrowRight, Check, FolderOpen, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export function Step2Paths({
    onNext,
    onBack,
}: {
    onNext: (data: { defaultProjectsPath: string }) => void;
    onBack: () => void;
}) {
    const [projectsPath, setProjectsPath] = useState("");
    const [isValid, setIsValid] = useState(false);

    const selectFolder = async () => {
        const selected = await open({
            directory: true,
            multiple: false,
            title: "Select Projects Directory",
        });
        if (selected) {
            const path = selected as string;
            setProjectsPath(path);
            setIsValid(true);
        }
    };

    const handleInputChange = (value: string) => {
        setProjectsPath(value);
        setIsValid(value.trim().length > 0);
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
            <Card className="w-full max-w-2xl shadow-2xl border-0 dark:border-zinc-800">
                <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Home className="w-4 h-4" />
                            Step 2 of 5
                        </span>
                        <span className="flex-1">
                            <Progress value={40} className="h-1" />
                        </span>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">
                        Where should we keep your projects?
                    </CardTitle>
                    <CardDescription className="text-base">
                        Choose a directory where Hive will store all your development projects.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-8 pt-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Hive Installation Path</Label>
                        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                            <Home className="w-4 h-4 text-muted-foreground" />
                            <code className="text-sm font-mono text-foreground">~/.hive</code>
                            <span className="ml-auto text-xs text-muted-foreground">
                                (auto-configured)
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            All Hive runtimes, configurations, and binaries will live here.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            Projects Directory
                            {isValid && <Check className="w-4 h-4 text-green-500" />}
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    value={projectsPath}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    placeholder="~/Projects or /path/to/your/projects"
                                    className={`pr-10 ${isValid ? "border-green-500 focus-visible:ring-green-500" : ""}`}
                                />
                                {isValid && (
                                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                                )}
                            </div>
                            <Button
                                variant="outline"
                                onClick={selectFolder}
                                className="gap-2 shrink-0"
                            >
                                <FolderOpen className="w-4 h-4" />
                                Browse
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            All new projects will be created inside this directory.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={onBack} className="gap-2 flex-1">
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </Button>
                        <Button
                            onClick={() => onNext({ defaultProjectsPath: projectsPath })}
                            className="gap-2 flex-[2] bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
                            disabled={!isValid}
                        >
                            Continue
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
