import { useState } from "react";

import { ArrowLeft, ArrowRight, Check, Home, Moon, Palette, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function Step5Theme({
    onComplete,
    onBack,
}: {
    onComplete: (data: { theme: "light" | "dark" }) => void;
    onBack: () => void;
}) {
    const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | null>(null);

    const handleThemeSelect = (theme: "light" | "dark") => {
        setSelectedTheme(theme);
        document.documentElement.classList.toggle("dark", theme === "dark");
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
            <Card className="w-full max-w-2xl shadow-2xl border-0 dark:border-zinc-800">
                <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Palette className="w-4 h-4" />
                            Step 4 of 5
                        </span>
                        <span className="flex-1">
                            <Progress value={80} className="h-1" />
                        </span>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">
                        Choose your look
                    </CardTitle>
                    <CardDescription className="text-base">
                        Pick a theme that suits your style. You can change this anytime.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-8 pt-4">
                    <div className="grid grid-cols-2 gap-6">
                        <button
                            onClick={() => handleThemeSelect("light")}
                            className={cn(
                                "group relative flex flex-col items-center gap-4 p-10 rounded-xl border-2 transition-all bg-white dark:bg-white hover:shadow-lg",
                                selectedTheme === "light"
                                    ? "border-amber-500 ring-2 ring-amber-200 ring-offset-2"
                                    : "border-gray-200 hover:border-amber-300"
                            )}
                        >
                            <div className="p-3 rounded-full bg-amber-50 group-hover:bg-amber-100 transition-colors">
                                <Sun className="w-12 h-12 text-amber-500" />
                            </div>
                            <div className="text-center">
                                <span className="font-semibold text-black text-lg">Light Mode</span>
                                <p className="text-sm text-gray-500">Clean and bright</p>
                            </div>
                            {selectedTheme === "light" && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </button>

                        <button
                            onClick={() => handleThemeSelect("dark")}
                            className={cn(
                                "group relative flex flex-col items-center gap-4 p-10 rounded-xl border-2 transition-all bg-zinc-900 hover:bg-zinc-800 hover:shadow-lg",
                                selectedTheme === "dark"
                                    ? "border-amber-500 ring-2 ring-amber-200 ring-offset-2 ring-offset-zinc-900"
                                    : "border-zinc-700 hover:border-amber-600"
                            )}
                        >
                            <div className="p-3 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
                                <Moon className="w-12 h-12 text-amber-500" />
                            </div>
                            <div className="text-center">
                                <span className="font-semibold text-white text-lg">Dark Mode</span>
                                <p className="text-sm text-gray-400">Easy on the eyes</p>
                            </div>
                            {selectedTheme === "dark" && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </button>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={onBack} className="gap-2 flex-1">
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </Button>
                        <Button
                            onClick={() => onComplete({ theme: selectedTheme || "dark" })}
                            disabled={!selectedTheme}
                            className="gap-2 flex-[2] bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
                        >
                            Continue to Runtimes
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
