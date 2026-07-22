import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Line {
    type: "cmd" | "out" | "err" | "info";
    text: string;
}

interface StaticShellPanelProps {
    projectPath: string;
    projectName?: string;
    package_manager?: string;
}

export const StaticShellPanel = function StaticShellPanel({
    projectPath,
    projectName,
}: StaticShellPanelProps) {
    const [lines, setLines] = useState<Line[]>([
        {
            type: "info",
            text: `Hive Shell · ${projectName || "Static"}\nType a command or use the shortcuts above.\n`,
        },
    ]);
    const [input, setInput] = useState("");
    const [running, setRunning] = useState(false);
    const [currentDir, setCurrentDir] = useState(projectPath);

    const cmdHistory = useRef<string[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [lines]);

    const appendLine = useCallback((line: Line) => {
        setLines((prev) => [...prev, line]);
    }, []);

    const run = useCallback(
        async (cmd: string) => {
            const trimmed = cmd.trim();
            if (!trimmed || running) return;

            cmdHistory.current = [trimmed, ...cmdHistory.current];
            setInput("");

            if (trimmed === "clear") {
                setLines([]);
                return;
            }

            appendLine({ type: "cmd", text: trimmed });

            if (trimmed === "pwd") {
                appendLine({ type: "out", text: currentDir });
                return;
            }

            if (trimmed.startsWith("cd ")) {
                const newPath = trimmed.slice(3).trim();
                setCurrentDir(newPath);
                appendLine({ type: "out", text: `→ ${newPath}` });
                return;
            }

            setRunning(true);
            const sid = `${Date.now()}-${Math.random()}`;

            const unlisten = await listen<{
                session_id: string;
                line: string;
                is_stderr: boolean;
                is_done: boolean;
                exit_code: number | null;
            }>("shell-output", (event) => {
                if (event.payload.session_id !== sid) return;

                if (event.payload.is_done) {
                    unlisten();
                    setRunning(false);
                    if (event.payload.exit_code !== 0 && event.payload.exit_code !== null) {
                        appendLine({
                            type: "err",
                            text: `Process exited with code ${event.payload.exit_code}`,
                        });
                    }
                    return;
                }

                appendLine({
                    type: event.payload.is_stderr ? "err" : "out",
                    text: event.payload.line,
                });
            });

            try {
                await invoke("execute_shell_streaming", {
                    sessionId: sid,
                    command: trimmed,
                    cwd: currentDir,
                });
            } catch (e: any) {
                appendLine({ type: "err", text: String(e) });
                setRunning(false);
                unlisten();
            }
        },
        [running, currentDir, appendLine]
    );

    const handlePresetCommand = (command: string) => {
        run(command);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">Shell</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePresetCommand("ls -la")}
                    >
                        List Files
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handlePresetCommand("pwd")}>
                        Current Directory
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePresetCommand("npm run dev")}
                    >
                        Start Live Server
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePresetCommand("npm install live-server -g")}
                    >
                        Install Live Server
                    </Button>
                </div>

                <div
                    className="rounded-lg overflow-hidden border bg-muted"
                    onClick={() => inputRef.current?.focus()}
                >
                    <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/70 select-none">
                        <span className="w-3 h-3 rounded-full bg-red-500/80" />
                        <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                        <span className="ml-3 text-[11px] text-muted-foreground font-mono">
                            hive — {projectName || "static"} — bash
                        </span>
                        {running && (
                            <span className="ml-auto text-[10px] text-amber-400 font-mono animate-pulse">
                                ● running
                            </span>
                        )}
                    </div>

                    <div className="p-3 font-mono text-sm min-h-[300px] max-h-[460px] overflow-y-auto space-y-1 cursor-text">
                        {lines.map((l, i) => (
                            <div key={i}>
                                {l.type === "cmd" && (
                                    <div className="flex gap-2 items-start">
                                        <span className="text-emerald-500 select-none">❯</span>
                                        <span className="text-foreground">{l.text}</span>
                                    </div>
                                )}
                                {l.type === "out" && (
                                    <pre className="whitespace-pre-wrap leading-relaxed text-muted-foreground pl-4">
                                        {l.text}
                                    </pre>
                                )}
                                {l.type === "err" && (
                                    <pre className="whitespace-pre-wrap leading-relaxed text-red-500 pl-4">
                                        {l.text}
                                    </pre>
                                )}
                                {l.type === "info" && (
                                    <pre className="whitespace-pre-wrap leading-relaxed text-emerald-500/80">
                                        {l.text}
                                    </pre>
                                )}
                            </div>
                        ))}

                        <div className="flex gap-2 items-center mt-1">
                            <span className="text-emerald-500 select-none">❯</span>
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") run(input);
                                    if (e.key === "Tab") {
                                        e.preventDefault();
                                    }
                                }}
                                disabled={running}
                                className="flex-1 bg-transparent text-foreground outline-none caret-emerald-500 disabled:opacity-50 w-full"
                                placeholder={running ? "waiting..." : "type a command..."}
                                autoFocus
                                spellCheck={false}
                            />
                        </div>
                        <div ref={bottomRef} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
