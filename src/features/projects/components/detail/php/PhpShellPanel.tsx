import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface Line {
    type: "cmd" | "out" | "err" | "info" | "prompt";
    text: string;
}

interface PhpShellPanelProps {
    projectPath: string;
    projectName: string;
    projectType?: string;
    version?: string;
}

const QUICK_GROUPS = [
    {
        label: "PHP",
        items: ["php -v", "php -m", "php -l public/index.php"],
    },
    {
        label: "Composer",
        items: ["composer install", "composer update", "composer dump-autoload"],
    },
    {
        label: "Server",
        items: ["php -S localhost:8000 public/index.php"],
    },
];

export function PhpShellPanel({
    projectPath,
    projectName,
    projectType = "PHP",
    version,
}: PhpShellPanelProps) {
    const [lines, setLines] = useState<Line[]>([
        {
            type: "info",
            text: `Hive Shell · ${projectName} · ${projectType}${version ? ` ${version}` : ""}\nType a command or use the shortcuts above.\n`,
        },
    ]);
    const [input, setInput] = useState("");
    const [histIdx, setHistIdx] = useState(-1);
    const [currentDir, setCurrentDir] = useState(projectPath);
    const [running, setRunning] = useState(false);

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
            setHistIdx(-1);
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

    return (
        <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
                {QUICK_GROUPS.map((group) =>
                    group.items.map((c) => (
                        <button
                            key={c}
                            onClick={() => run(c)}
                            disabled={running}
                            className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 border border-zinc-700 transition-colors"
                        >
                            {c}
                        </button>
                    ))
                )}
            </div>

            <div
                className="rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-950 shadow-xl"
                onClick={() => inputRef.current?.focus()}
            >
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80 select-none">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-3 text-[11px] text-zinc-500 font-mono">
                        hive — {projectName} — bash
                    </span>
                    {running && (
                        <span className="ml-auto text-[10px] text-amber-400 font-mono animate-pulse">
                            ● running
                        </span>
                    )}
                </div>

                <div className="p-4 font-mono text-xs min-h-[300px] max-h-[460px] overflow-y-auto space-y-1 cursor-text">
                    {lines.map((l, i) => (
                        <div key={i}>
                            {l.type === "cmd" && (
                                <div className="flex gap-2 items-start">
                                    <span className="text-indigo-400 select-none">❯</span>
                                    <span className="text-zinc-100">{l.text}</span>
                                </div>
                            )}
                            {l.type === "out" && (
                                <pre className="whitespace-pre-wrap leading-relaxed text-zinc-300 pl-4">
                                    {l.text}
                                </pre>
                            )}
                            {l.type === "err" && (
                                <pre className="whitespace-pre-wrap leading-relaxed text-red-400 pl-4">
                                    {l.text}
                                </pre>
                            )}
                            {l.type === "info" && (
                                <pre className="whitespace-pre-wrap leading-relaxed text-amber-400/80">
                                    {l.text}
                                </pre>
                            )}
                        </div>
                    ))}

                    <div className="flex gap-2 items-center mt-1">
                        <span className="text-indigo-400 select-none">❯</span>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") run(input);
                                if (e.key === "ArrowUp") {
                                    const idx = Math.min(
                                        histIdx + 1,
                                        cmdHistory.current.length - 1
                                    );
                                    setHistIdx(idx);
                                    setInput(cmdHistory.current[idx] ?? "");
                                }
                                if (e.key === "ArrowDown") {
                                    const idx = Math.max(histIdx - 1, -1);
                                    setHistIdx(idx);
                                    setInput(idx === -1 ? "" : cmdHistory.current[idx]);
                                }
                                if (e.key === "Tab") {
                                    e.preventDefault();
                                }
                            }}
                            disabled={running}
                            className="flex-1 bg-transparent text-zinc-100 outline-none caret-indigo-400 disabled:opacity-50"
                            placeholder={running ? "waiting..." : "type a command..."}
                            autoFocus
                            spellCheck={false}
                        />
                    </div>
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}
