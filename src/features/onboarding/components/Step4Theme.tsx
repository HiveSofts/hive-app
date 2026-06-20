import { cn } from "@/core/lib/utils";

import { useState } from "react";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Moon, Palette, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Step5ThemeProps {
    onComplete: (data: { theme: "light" | "dark" }) => void;
    onBack: () => void;
}

export function Step4Theme({ onComplete, onBack }: Step5ThemeProps) {
    const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | null>(null);

    const handleThemeSelect = (theme: "light" | "dark") => {
        setSelectedTheme(theme);
        document.documentElement.classList.toggle("dark", theme === "dark");
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
                                <Palette className="w-4 h-4" />
                                Step 4 of 5
                            </span>
                            <span className="flex-1">
                                <Progress value={80} className="h-1" />
                            </span>
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.4 }}
                        >
                            <CardTitle className="text-3xl font-bold tracking-tight">
                                Choose your look
                            </CardTitle>
                            <CardDescription className="text-base mt-1">
                                Pick a theme that suits your style. You can change this anytime.
                            </CardDescription>
                        </motion.div>
                    </CardHeader>

                    <CardContent className="space-y-8 pt-4">
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.4 }}
                            className="grid grid-cols-2 gap-6"
                        >
                            <motion.button
                                whileHover={{ scale: 1.03, y: -4 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleThemeSelect("light")}
                                className={cn(
                                    "group relative flex flex-col items-center gap-4 p-10 rounded-xl border-2 transition-all bg-white dark:bg-white hover:shadow-xl",
                                    selectedTheme === "light"
                                        ? "border-amber-500 ring-4 ring-amber-200/50 ring-offset-2 shadow-lg shadow-amber-500/20"
                                        : "border-gray-200 hover:border-amber-300 hover:shadow-md"
                                )}
                            >
                                <motion.div
                                    whileHover={{ rotate: 20, scale: 1.1 }}
                                    className="p-3 rounded-full bg-amber-50 group-hover:bg-amber-100 transition-colors"
                                >
                                    <Sun className="w-12 h-12 text-amber-500" />
                                </motion.div>
                                <div className="text-center">
                                    <span className="font-semibold text-black text-lg">
                                        Light Mode
                                    </span>
                                    <p className="text-sm text-gray-500">Clean and bright</p>
                                </div>
                                {selectedTheme === "light" && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", bounce: 0.5 }}
                                        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
                                    >
                                        <Check className="w-3.5 h-3.5 text-white" />
                                    </motion.div>
                                )}
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.03, y: -4 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleThemeSelect("dark")}
                                className={cn(
                                    "group relative flex flex-col items-center gap-4 p-10 rounded-xl border-2 transition-all bg-zinc-900 hover:bg-zinc-800 hover:shadow-xl",
                                    selectedTheme === "dark"
                                        ? "border-amber-500 ring-4 ring-amber-200/50 ring-offset-2 ring-offset-zinc-900 shadow-lg shadow-amber-500/20"
                                        : "border-zinc-700 hover:border-amber-600 hover:shadow-md"
                                )}
                            >
                                <motion.div
                                    whileHover={{ rotate: -20, scale: 1.1 }}
                                    className="p-3 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors"
                                >
                                    <Moon className="w-12 h-12 text-amber-500" />
                                </motion.div>
                                <div className="text-center">
                                    <span className="font-semibold text-white text-lg">
                                        Dark Mode
                                    </span>
                                    <p className="text-sm text-gray-400">Easy on the eyes</p>
                                </div>
                                {selectedTheme === "dark" && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", bounce: 0.5 }}
                                        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
                                    >
                                        <Check className="w-3.5 h-3.5 text-white" />
                                    </motion.div>
                                )}
                            </motion.button>
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
                                onClick={() => onComplete({ theme: selectedTheme || "dark" })}
                                disabled={!selectedTheme}
                                className="gap-2 flex-[2] bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Continue to Runtimes
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
