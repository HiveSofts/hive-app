import { useEffect, useRef, useState } from "react";

const QUICK = [
    "php artisan cache:clear",
    "php artisan migrate",
    "php artisan optimize",
    "composer install",
    "php artisan queue:restart",
];

const fakeOutput: Record<string, string> = {
    "php artisan cache:clear": "Application cache cleared successfully.",
    "php artisan config:cache": "Configuration cached successfully.",
    "php artisan optimize":
        "INFO  Caching framework bootstrap, configuration, and metadata.\n   routes ........................................................ DONE\n   config ........................................................ DONE",
    "php artisan migrate": "  INFO  Nothing to migrate.",
    "php artisan queue:restart": "Broadcasting queue restart signal.",
    "composer install":
        "Installing dependencies from lock file\nNothing to install, update or remove\nGenerating optimized autoload files",
    ls: "app  bootstrap  config  database  public  resources  routes  storage  tests  vendor  .env  artisan",
    pwd: "/Users/user/Projects/my-blog",
    clear: "__CLEAR__",
};

export function TerminalShell() {
    const [history, setHistory] = useState<{ cmd: string; out: string; type?: string }[]>([
        {
            cmd: "",
            out: "Welcome to Hive Shell · my-blog · Laravel 11\nType a command or use the shortcuts above.\n",
            type: "info",
        },
    ]);
    const [input, setInput] = useState("");
    const [histIdx, setHistIdx] = useState(-1);
    const cmdHistory = useRef<string[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const run = (cmd: string) => {
        const trimmed = cmd.trim();
        if (!trimmed) return;
        cmdHistory.current = [trimmed, ...cmdHistory.current];
        setHistIdx(-1);
        if (trimmed === "clear") {
            setHistory([]);
            setInput("");
            return;
        }
        const out = fakeOutput[trimmed] ?? `bash: ${trimmed.split(" ")[0]}: command not found`;
        setHistory((h) => [...h, { cmd: trimmed, out }]);
        setInput("");
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history]);

    return (
        <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
                {QUICK.map((c) => (
                    <button
                        key={c}
                        onClick={() => run(c)}
                        className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                    >
                        {c}
                    </button>
                ))}
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
                        hive — my-blog — bash
                    </span>
                </div>
                <div className="p-4 font-mono text-xs min-h-[300px] max-h-[420px] overflow-y-auto space-y-2 cursor-text">
                    {history.map((h, i) => (
                        <div key={i}>
                            {h.cmd && (
                                <div className="flex gap-2 items-start">
                                    <span className="text-emerald-400 select-none">❯</span>
                                    <span className="text-zinc-100">{h.cmd}</span>
                                </div>
                            )}
                            {h.out && (
                                <pre
                                    className={`whitespace-pre-wrap leading-relaxed mt-0.5 ${h.type === "info" ? "text-amber-400/80" : "text-zinc-400"}`}
                                >
                                    {h.out}
                                </pre>
                            )}
                        </div>
                    ))}
                    <div className="flex gap-2 items-center">
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
                            }}
                            className="flex-1 bg-transparent text-zinc-100 outline-none caret-emerald-400"
                            placeholder="type a command..."
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
