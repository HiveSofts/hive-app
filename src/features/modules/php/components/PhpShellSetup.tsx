import { useState } from "react";

import {
    Check,
    ChevronRight,
    Copy,
    Terminal,
    Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
    generateBashConfig,
    generateFishConfig,
    generateZshConfig,
} from "../services/phpService";
import { PhpVersion, ShellAlias } from "../types";

const SHELL_TABS = [
    { id: "bash", label: "bash", file: "~/.bashrc" },
    { id: "zsh", label: "zsh", file: "~/.zshrc" },
    { id: "fish", label: "fish", file: "~/.config/fish/config.fish" },
] as const;

type ShellType = (typeof SHELL_TABS)[number]["id"];

const versionColor: Record<string, string> = {
    "8.4": "text-violet-400 border-violet-500/40 bg-violet-500/10",
    "8.3": "text-amber-400 border-amber-500/40 bg-amber-500/10",
    "8.2": "text-blue-400 border-blue-500/40 bg-blue-500/10",
    "8.1": "text-zinc-400 border-zinc-500/40 bg-zinc-500/10",
};

interface CopyBtnProps {
    text: string;
}

function CopyBtn({ text }: CopyBtnProps) {
    const [copied, setCopied] = useState(false);
    const handle = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handle}
            className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-100 transition-colors px-2 py-1 rounded-md hover:bg-white/5"
        >
            {copied ? (
                <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
            ) : (
                <><Copy className="w-3 h-3" />Copy</>
            )}
        </button>
    );
}

interface PhpShellSetupProps {
    versions: PhpVersion[];
    aliases: ShellAlias[];
}

export function PhpShellSetup({ versions, aliases }: PhpShellSetupProps) {
    const [shell, setShell] = useState<ShellType>("bash");
    const [step, setStep] = useState<1 | 2>(1);

    const installed = versions.filter((v) => v.state === "installed");

    const configs: Record<ShellType, string> = {
        bash: generateBashConfig(versions),
        zsh: generateZshConfig(versions),
        fish: generateFishConfig(versions),
    };

    const activeShell = SHELL_TABS.find((s) => s.id === shell)!;
    const config = configs[shell];

    const addToShellCmd =
        shell === "fish"
            ? `cat >> ${activeShell.file} << 'EOF'\n${config}\nEOF`
            : `cat >> ${activeShell.file} << 'EOF'\n${config}\nEOF\nsource ${activeShell.file}`;

    return (
        <div className="space-y-6">
            {/* alias preview cards */}
            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Terminal commands after setup
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {installed.map((v) => {
                        const alias = `php${v.minor.replace(".", "")}`;
                        const composerAlias = `composer${v.minor.replace(".", "")}`;
                        return (
                            <div
                                key={v.id}
                                className="rounded-xl border bg-zinc-950 overflow-hidden group"
                            >
                                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-zinc-900/60">
                                    <span className={`w-1.5 h-1.5 rounded-full ${v.isDefault ? "bg-amber-500" : "bg-zinc-600"}`} />
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] font-mono px-1.5 py-0 ${versionColor[v.minor] ?? ""}`}
                                    >
                                        PHP {v.minor}
                                    </Badge>
                                    {v.isDefault && (
                                        <span className="text-[10px] text-amber-500 font-semibold ml-auto">default</span>
                                    )}
                                </div>
                                <div className="p-4 space-y-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-zinc-600 font-mono text-[11px] select-none">$</span>
                                        <code className="font-mono text-[13px] text-emerald-400 flex-1">{alias}</code>
                                        <CopyBtn text={alias} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-zinc-600 font-mono text-[11px] select-none">$</span>
                                        <code className="font-mono text-[13px] text-blue-400 flex-1">{composerAlias}</code>
                                        <CopyBtn text={composerAlias} />
                                    </div>
                                    <div className="pt-1 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-zinc-600 font-mono text-[11px] select-none">$</span>
                                            <code className="font-mono text-[11px] text-zinc-500 flex-1">
                                                hive-php-use {v.minor}
                                            </code>
                                            <CopyBtn text={`hive-php-use ${v.minor}`} />
                                        </div>
                                        <p className="text-[10px] text-zinc-600 mt-1 pl-4">
                                            Switch global default to {v.minor}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {installed.length === 0 && (
                        <div className="col-span-2 rounded-xl border border-dashed border-border/50 py-10 text-center">
                            <Terminal className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                            <p className="text-sm text-muted-foreground">Install a PHP version first</p>
                        </div>
                    )}
                </div>
            </div>

            {installed.length > 0 && (
                <>
                    {/* step indicator */}
                    <div className="flex items-center gap-3">
                        {([1, 2] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setStep(s)}
                                className={`flex items-center gap-2 text-xs font-medium transition-colors ${step === s ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <span
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${step === s ? "bg-foreground text-background border-foreground" : "border-border"}`}
                                >
                                    {s}
                                </span>
                                {s === 1 ? "Choose shell" : "Add to config"}
                            </button>
                        ))}
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    {step === 1 && (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Which shell are you using?</p>
                            <div className="flex gap-2">
                                {SHELL_TABS.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setShell(s.id)}
                                        className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-mono font-semibold transition-colors ${shell === s.id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                                    >
                                        {s.label}
                                        <span className={`text-[10px] font-sans font-normal ${shell === s.id ? "text-background/60" : "text-muted-foreground/60"}`}>
                                            {s.file}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <Button
                                onClick={() => setStep(2)}
                                className="w-full gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                Continue with {shell}
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="rounded-xl overflow-hidden border border-zinc-700/50">
                                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                                        <span className="ml-2 text-[11px] text-zinc-500 font-mono">{activeShell.file}</span>
                                    </div>
                                    <CopyBtn text={config} />
                                </div>
                                <pre className="p-4 text-[11px] font-mono text-zinc-300 leading-relaxed overflow-x-auto max-h-72 bg-zinc-950">
                                    {config}
                                </pre>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[11px] text-muted-foreground font-medium">
                                    Or run this one-liner in your terminal:
                                </p>
                                <div className="rounded-xl border border-zinc-700/50 bg-zinc-950 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900">
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-[11px] text-zinc-400">One-liner install</span>
                                        </div>
                                        <CopyBtn text={addToShellCmd} />
                                    </div>
                                    <pre className="p-4 text-[11px] font-mono text-amber-400 leading-relaxed overflow-x-auto bg-zinc-950 whitespace-pre-wrap">
                                        {addToShellCmd}
                                    </pre>
                                </div>
                            </div>

                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                                <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5" />
                                    After adding, reload your shell
                                </p>
                                <div className="flex items-center gap-2 font-mono text-[11px]">
                                    <span className="text-zinc-600">$</span>
                                    <code className="text-zinc-300">
                                        {shell === "fish" ? "source ~/.config/fish/config.fish" : `source ${activeShell.file}`}
                                    </code>
                                    <CopyBtn text={shell === "fish" ? "source ~/.config/fish/config.fish" : `source ${activeShell.file}`} />
                                </div>
                                <p className="text-[10px] text-emerald-600">
                                    Then test with:{" "}
                                    {installed.map((v) => (
                                        <code key={v.id} className="font-mono mr-1.5">
                                            php{v.minor.replace(".", "")} -v
                                        </code>
                                    ))}
                                </p>
                            </div>

                            <button
                                onClick={() => setStep(1)}
                                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                                ← Change shell
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}