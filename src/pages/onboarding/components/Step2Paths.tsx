import { useState } from "react";

import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Step2Paths({
    onNext,
}: {
    onNext: (data: { defaultProjectsPath: string }) => void;
}) {
    const [projectsPath, setProjectsPath] = useState("");

    const selectFolder = async (setPath: (path: string) => void) => {
        const selected = await open({
            directory: true,
            multiple: false,
            title: "Select Folder",
        });
        if (selected) setPath(selected as string);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-white dark:from-zinc-950 dark:to-zinc-900">
            <Card className="w-full max-w-2xl shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Configure Paths</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Hive Installation Path</Label>
                        <Input value="~/.hive" disabled className="bg-muted cursor-not-allowed" />
                        <p className="text-xs text-muted-foreground">
                            Hive will be installed in ~/.hive (auto-configured)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Default Projects Directory</Label>
                        <div className="flex gap-2">
                            <Input
                                value={projectsPath}
                                onChange={(e) => setProjectsPath(e.target.value)}
                                placeholder="~/Projects"
                            />
                            <Button variant="outline" onClick={() => selectFolder(setProjectsPath)}>
                                <FolderOpen className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <Button
                        onClick={() => onNext({ defaultProjectsPath: projectsPath })}
                        className="w-full bg-amber-500 hover:bg-amber-600"
                        disabled={!projectsPath}
                    >
                        Next →
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
