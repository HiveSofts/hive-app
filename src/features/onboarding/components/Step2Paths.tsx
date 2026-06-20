import { useState } from "react";

import { open } from "@tauri-apps/plugin-dialog";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, FolderOpen, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface Step2PathsProps {
    onNext: (data: { defaultProjectsPath: string }) => void;
    onBack: () => void;
}

export function Step2Paths({ onNext, onBack }: Step2PathsProps) {
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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex min-h-screen items-center justify-center p-4"
        >
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-full max-w-2xl"
            >
                <Card className="w-full shadow-2xl border-0 dark:border-zinc-800 backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90">
                    <CardHeader className="space-y-1">
                        <motion.div
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                            <span className="flex items-center gap-1">
                                <Home className="w-4 h-4" />
                                Step 2 of 5
                            </span>
                            <span className="flex-1">
                                <Progress value={40} className="h-1" />
                            </span>
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.4 }}
                        >
                            <CardTitle className="text-3xl font-bold tracking-tight">
                                Where should we keep your projects?
                            </CardTitle>
                            <CardDescription className="text-base mt-1">
                                Choose a directory where Hive will store all your development
                                projects.
                            </CardDescription>
                        </motion.div>
                    </CardHeader>

                    <CardContent className="space-y-8 pt-4">
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.4 }}
                            className="space-y-2"
                        >
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
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6, duration: 0.4 }}
                            className="space-y-3"
                        >
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
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", bounce: 0.5 }}
                                        >
                                            <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                                        </motion.div>
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
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.4 }}
                            className="flex gap-3 pt-4"
                        >
                            <Button
                                variant="outline"
                                onClick={onBack}
                                className="gap-2 flex-1 transition-all duration-300 hover:shadow-md"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <Button
                                onClick={() => onNext({ defaultProjectsPath: projectsPath })}
                                className="gap-2 flex-[2] bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                disabled={!isValid}
                            >
                                Continue
                                <motion.span
                                    animate={{ x: [0, 4, 0] }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 1.5,
                                        ease: "easeInOut",
                                    }}
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </motion.span>
                            </Button>
                        </motion.div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
