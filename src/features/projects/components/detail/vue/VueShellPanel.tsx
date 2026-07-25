import { useEffect, useRef, useState } from "react";

import { Monitor, Package, Play, RotateCcw, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CommandHistory {
    command: string;
    output: string;
    timestamp: Date;
}

interface VueShellPanelProps {
    projectPath: string;
    projectName: string;
    projectType: string;
    packageManager?: string;
    [key: string]: any;
}

export const VueShellPanel = ({
    packageManager = "npm",
}: VueShellPanelProps) => {
    const [inputCommand, setInputCommand] = useState("");
    const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when command history updates
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector(
                "[data-radix-scroll-area-viewport]"
            );
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [commandHistory]);

    const executeCommand = async (cmd: string) => {
        if (!cmd.trim()) return;

        setIsExecuting(true);
        try {
            // In a real implementation, this would call the backend to execute the command
            // For now, we'll simulate the response
            const simulatedOutput = `> ${cmd}\n${
                cmd.includes("npm run") || cmd.includes("yarn") || cmd.includes("pnpm")
                    ? `Simulated execution of: ${cmd}\n\nReady in 1234 ms`
                    : `Command executed: ${cmd}\n`
            }`;

            const newCommand: CommandHistory = {
                command: cmd,
                output: simulatedOutput,
                timestamp: new Date(),
            };

            setCommandHistory((prev) => [...prev, newCommand]);
        } catch (error) {
            const errorCommand: CommandHistory = {
                command: cmd,
                output: `Error executing command: ${(error as Error).message}`,
                timestamp: new Date(),
            };
            setCommandHistory((prev) => [...prev, errorCommand]);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleRunCommand = () => {
        if (inputCommand.trim()) {
            executeCommand(inputCommand);
            setInputCommand("");
        }
    };

    const handleRunDevServer = async () => {
        const devCommand =
            packageManager === "yarn"
                ? "yarn dev"
                : packageManager === "pnpm"
                  ? "pnpm dev"
                  : "npm run dev";

        await executeCommand(devCommand);
    };

    const handleRunBuild = async () => {
        const buildCommand =
            packageManager === "yarn"
                ? "yarn build"
                : packageManager === "pnpm"
                  ? "pnpm build"
                  : "npm run build";

        await executeCommand(buildCommand);
    };

    const handleInstallDeps = async () => {
        const installCommand =
            packageManager === "yarn"
                ? "yarn install"
                : packageManager === "pnpm"
                  ? "pnpm install"
                  : "npm install";

        await executeCommand(installCommand);
    };

    const handleRunLint = async () => {
        const lintCommand =
            packageManager === "yarn"
                ? "yarn lint"
                : packageManager === "pnpm"
                  ? "pnpm lint"
                  : "npm run lint";

        await executeCommand(lintCommand);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Terminal className="h-6 w-6 text-green-600" />
                        <span>Terminal Shell</span>
                    </CardTitle>
                    <CardDescription>
                        Execute commands in your Vue project directory
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3 mb-4">
                        <Button onClick={handleRunDevServer} className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            Run Dev Server
                        </Button>
                        <Button
                            onClick={handleRunBuild}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Package className="h-4 w-4" />
                            Build Project
                        </Button>
                        <Button
                            onClick={handleInstallDeps}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Install Dependencies
                        </Button>
                        <Button
                            onClick={handleRunLint}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Lint Project
                        </Button>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <Input
                            placeholder={`Enter command to execute with ${packageManager}...`}
                            value={inputCommand}
                            onChange={(e) => setInputCommand(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleRunCommand()}
                            disabled={isExecuting}
                        />
                        <Button
                            onClick={handleRunCommand}
                            disabled={isExecuting}
                            className="flex items-center gap-2"
                        >
                            {isExecuting ? (
                                <RotateCcw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                            Run
                        </Button>
                    </div>

                    <ScrollArea
                        className="h-[300px] w-full rounded-md border p-4 font-mono text-sm bg-muted"
                        ref={scrollAreaRef}
                    >
                        {commandHistory.length > 0 ? (
                            <div className="space-y-4">
                                {commandHistory.map((item, index) => (
                                    <div key={index}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Terminal className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                                {item.timestamp.toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="text-green-700">$ {item.command}</div>
                                        <pre className="mt-2 text-sm whitespace-pre-wrap break-words">
                                            {item.output}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                No commands executed yet. Try running "npm run dev" or other Vue
                                commands.
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};
