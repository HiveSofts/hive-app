import { useState } from "react";

import { Moon, Sun } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Card } from "@solar-icons/react";
import { Button } from "@/app/components/ui/button";

export function Step5Theme({
    onComplete,
}: {
    onComplete: (data: { theme: "light" | "dark" }) => void;
}) {
    const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | null>(null);

    const handleThemeSelect = (theme: "light" | "dark") => {
        setSelectedTheme(theme);
        document.documentElement.classList.toggle("dark", theme === "dark");
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-white dark:from-zinc-950 dark:to-zinc-900">
            <Card className="w-full max-w-2xl shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Choose Your Theme</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <button
                            onClick={() => handleThemeSelect("light")}
                            className={`flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all bg-white dark:bg-white ${
                                selectedTheme === "light"
                                    ? "border-amber-500 ring-2 ring-amber-200"
                                    : "border-gray-200"
                            }`}
                        >
                            <Sun className="w-16 h-16 text-amber-500" />
                            <span className="font-medium text-black">Light Mode</span>
                        </button>
                        <button
                            onClick={() => handleThemeSelect("dark")}
                            className={`flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all bg-zinc-900 ${
                                selectedTheme === "dark"
                                    ? "border-amber-500 ring-2 ring-amber-200"
                                    : "border-zinc-700"
                            }`}
                        >
                            <Moon className="w-16 h-16 text-amber-500" />
                            <span className="font-medium text-white">Dark Mode</span>
                        </button>
                    </div>

                    <Button
                        onClick={() => onComplete({ theme: selectedTheme || "dark" })}
                        disabled={!selectedTheme}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        Complete Setup →
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
