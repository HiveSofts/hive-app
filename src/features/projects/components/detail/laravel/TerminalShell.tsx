import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface Line {
    type: "cmd" | "out" | "err" | "info" | "prompt";
    text: string;
}

interface InteractivePrompt {
    type: "input" | "choice" | "confirm";
    question: string;
    choices?: string[];
    searchable?: boolean;
}

interface TerminalShellProps {
    projectPath: string;
    projectName: string;
    projectType?: string;
    version?: string;
    quickGroups?: { label: string; items: string[] }[];
    shellLabel?: string;
    packageManager?: string;
}

function parseInteractivePrompt(lines: string[]): InteractivePrompt | null {
    const last = lines[lines.length - 1] ?? "";
    const joined = lines.slice(-20).join("\n");

    const choiceMatch = joined.match(/┌[─\s]*(.*?)[─\s]*┐([\s\S]*?)└[─\s]*┘/);
    if (choiceMatch) {
        const title = choiceMatch[1].trim();
        const body = choiceMatch[2];
        const hasSearch = body.includes("Search...");
        const choices = body
            .split("\n")
            .map((l) => l.replace(/^[│\s▸►>\s]+/, "").trim())
            .filter((l) => l && !l.includes("Search...") && !l.startsWith("─"));
        return { type: "choice", question: title, choices, searchable: hasSearch };
    }

    if (/\?\s/.test(last) && /\[yes\/no\]/i.test(last)) {
        return { type: "confirm", question: last.replace(/^\?\s*/, "") };
    }

    if (/\?\s/.test(last) && !last.endsWith(":")) {
        return { type: "input", question: last.replace(/^\?\s*/, "") };
    }

    if (last.trim().endsWith(":") && !last.includes("artisan")) {
        return { type: "input", question: last };
    }

    return null;
}

export function TerminalShell({
    projectPath,
    projectName,
    projectType = "Laravel",
    version = "11",
    quickGroups,
    shellLabel = "bash",
}: TerminalShellProps) {
    const [lines, setLines] = useState<Line[]>([
        {
            type: "info",
            text: `Hive Shell · ${projectName} · ${projectType} ${version}\nType a command or use the shortcuts above.\n`,
        },
    ]);
    const [input, setInput] = useState("");
    const [histIdx, setHistIdx] = useState(-1);
    const [currentDir, setCurrentDir] = useState(projectPath);
    const [running, setRunning] = useState(false);
    const [prompt, setPrompt] = useState<InteractivePrompt | null>(null);
    const [promptInput, setPromptInput] = useState("");
    const [choiceSearch, setChoiceSearch] = useState("");
    const [selectedChoice, setSelectedChoice] = useState(0);
    const [sessionId, setSessionId] = useState("");

    const cmdHistory = useRef<string[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const promptInputRef = useRef<HTMLInputElement>(null);
    const pendingRef = useRef<string[]>([]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [lines, prompt]);

    useEffect(() => {
        if (prompt) promptInputRef.current?.focus();
    }, [prompt]);

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
            setPrompt(null);
            pendingRef.current = [];

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
            setSessionId(sid);

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
                    setPrompt(null);
                    pendingRef.current = [];
                    if (event.payload.exit_code !== 0 && event.payload.exit_code !== null) {
                        appendLine({
                            type: "err",
                            text: `Process exited with code ${event.payload.exit_code}`,
                        });
                    }
                    return;
                }

                const newLine = event.payload.line;
                pendingRef.current = [...pendingRef.current, newLine];

                appendLine({
                    type: event.payload.is_stderr ? "err" : "out",
                    text: newLine,
                });

                const detected = parseInteractivePrompt(pendingRef.current);
                if (detected) {
                    setPrompt(detected);
                    setPromptInput("");
                    setChoiceSearch("");
                    setSelectedChoice(0);
                }
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

    const submitPrompt = useCallback(
        async (value: string) => {
            appendLine({ type: "cmd", text: value });
            setPrompt(null);
            setPromptInput("");
            setChoiceSearch("");
            try {
                await invoke("send_shell_input", { sessionId, input: value + "\n" });
            } catch {}
        },
        [sessionId, appendLine]
    );

    const filteredChoices =
        prompt?.choices?.filter((c) => c.toLowerCase().includes(choiceSearch.toLowerCase())) ?? [];

    const quickGroupsResolved = quickGroups ?? [
        {
            label: "Cache",
            items: [
                "php artisan cache:clear",
                "php artisan optimize:clear",
                "php artisan config:clear",
            ],
        },
        { label: "DB", items: ["php artisan migrate", "php artisan migrate:fresh --seed"] },
        { label: "Optimize", items: ["php artisan optimize", "php artisan route:list"] },
        {
            label: "Deps",
            items: ["composer install", "composer update", "npm run dev", "npm run build"],
        },
        { label: "Queue", items: ["php artisan queue:restart"] },
        {
            label: "Make",
            items: [
                "php artisan make:model",
                "php artisan make:controller",
                "php artisan vendor:publish",
            ],
        },
    ];

    return (
        <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
                {quickGroupsResolved.map((group) =>
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
                onClick={() => !prompt && inputRef.current?.focus()}
            >
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80 select-none">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-3 text-[11px] text-zinc-500 font-mono">
                        hive — {projectName} — {shellLabel}
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
                                    <span className="text-emerald-400 select-none">❯</span>
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

                    {prompt && (
                        <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
                            <div className="px-3 py-2 border-b border-zinc-800 text-zinc-300 text-[11px]">
                                {prompt.question}
                            </div>

                            {prompt.type === "choice" && (
                                <>
                                    {prompt.searchable && (
                                        <div className="px-3 py-1.5 border-b border-zinc-800">
                                            <input
                                                ref={promptInputRef}
                                                value={choiceSearch}
                                                onChange={(e) => {
                                                    setChoiceSearch(e.target.value);
                                                    setSelectedChoice(0);
                                                }}
                                                placeholder="Search..."
                                                className="w-full bg-transparent text-zinc-100 outline-none text-[11px] placeholder:text-zinc-600"
                                            />
                                        </div>
                                    )}
                                    <div className="max-h-48 overflow-y-auto">
                                        {filteredChoices.map((c, i) => (
                                            <button
                                                key={c}
                                                onClick={() => submitPrompt(c)}
                                                onMouseEnter={() => setSelectedChoice(i)}
                                                className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                                                    i === selectedChoice
                                                        ? "bg-zinc-700 text-zinc-100"
                                                        : "text-zinc-400 hover:bg-zinc-800"
                                                }`}
                                            >
                                                {i === selectedChoice && (
                                                    <span className="text-emerald-400 mr-2">▸</span>
                                                )}
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            {prompt.type === "confirm" && (
                                <div className="flex gap-2 px-3 py-2">
                                    <button
                                        onClick={() => submitPrompt("yes")}
                                        className="px-3 py-1 text-[11px] rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-200 transition-colors"
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => submitPrompt("no")}
                                        className="px-3 py-1 text-[11px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                                    >
                                        No
                                    </button>
                                </div>
                            )}

                            {prompt.type === "input" && (
                                <div className="flex items-center px-3 py-2 gap-2">
                                    <span className="text-emerald-400">❯</span>
                                    <input
                                        ref={promptInputRef}
                                        value={promptInput}
                                        onChange={(e) => setPromptInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") submitPrompt(promptInput);
                                        }}
                                        className="flex-1 bg-transparent text-zinc-100 outline-none text-[11px] caret-emerald-400"
                                        placeholder="Enter value..."
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {!prompt && (
                        <div className="flex gap-2 items-center mt-1">
                            <span className="text-emerald-400 select-none">❯</span>
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
                                className="flex-1 bg-transparent text-zinc-100 outline-none caret-emerald-400 disabled:opacity-50"
                                placeholder={running ? "waiting..." : "type a command..."}
                                autoFocus
                                spellCheck={false}
                            />
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}
