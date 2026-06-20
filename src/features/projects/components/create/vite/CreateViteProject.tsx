import { cn } from "@/core/lib/utils";

import { useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CheckCircle2, ChevronRight, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

type Framework =
    | "vanilla"
    | "vanilla-ts"
    | "vue"
    | "vue-ts"
    | "react"
    | "react-ts"
    | "preact"
    | "preact-ts"
    | "lit"
    | "lit-ts"
    | "svelte"
    | "svelte-ts"
    | "solid"
    | "solid-ts"
    | "qwik"
    | "qwik-ts";
type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

interface FormData {
    name: string;
    description: string;
    host: string;
    port: number;
    packageManager: PackageManager;
    framework: Framework;
    installDeps: boolean;
}

interface OutputLine {
    text: string;
    type: "info" | "success" | "error" | "output";
}

let activeInstallation: { name: string; status: string; processId?: number } | null = null;
const startedInstalls = new Set<string>();

const PACKAGE_MANAGERS: { id: PackageManager; name: string; icon: string }[] = [
    { id: "npm", name: "npm", icon: "📦" },
    { id: "yarn", name: "Yarn", icon: "🧶" },
    { id: "pnpm", name: "pnpm", icon: "⚡" },
    { id: "bun", name: "Bun", icon: "🍞" },
];

const FRAMEWORKS: { id: Framework; name: string; icon: string; template: string }[] = [
    { id: "vanilla", name: "Vanilla JS", icon: "📄", template: "vanilla" },
    { id: "vanilla-ts", name: "Vanilla TS", icon: "📘", template: "vanilla-ts" },
    { id: "vue", name: "Vue", icon: "🟢", template: "vue" },
    { id: "vue-ts", name: "Vue + TS", icon: "🟢📘", template: "vue-ts" },
    { id: "react", name: "React", icon: "⚛️", template: "react" },
    { id: "react-ts", name: "React + TS", icon: "⚛️📘", template: "react-ts" },
    { id: "preact", name: "Preact", icon: "⚡", template: "preact" },
    { id: "preact-ts", name: "Preact + TS", icon: "⚡📘", template: "preact-ts" },
    { id: "lit", name: "Lit", icon: "🧪", template: "lit" },
    { id: "lit-ts", name: "Lit + TS", icon: "🧪📘", template: "lit-ts" },
    { id: "svelte", name: "Svelte", icon: "🔥", template: "svelte" },
    { id: "svelte-ts", name: "Svelte + TS", icon: "🔥📘", template: "svelte-ts" },
    { id: "solid", name: "Solid", icon: "🌿", template: "solid" },
    { id: "solid-ts", name: "Solid + TS", icon: "🌿📘", template: "solid-ts" },
    { id: "qwik", name: "Qwik", icon: "⚡", template: "qwik" },
    { id: "qwik-ts", name: "Qwik + TS", icon: "⚡📘", template: "qwik-ts" },
];

const cleanLine = (line: string) =>
    line
        .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "")
        .trim();

function TerminalPanel({
    data,
    onDone,
    projectsPath,
}: {
    data: FormData;
    onDone: (project: any) => void;
    projectsPath: string;
}) {
    const runIdRef = useRef(crypto.randomUUID());
    const runId = runIdRef.current;
    const [lines, setLines] = useState<OutputLine[]>([
        { text: `Creating Vite project: ${data.name}`, type: "info" },
        { text: `Location: ${projectsPath}/${data.name}`, type: "info" },
        {
            text: `Framework: ${FRAMEWORKS.find((f) => f.id === data.framework)?.name}`,
            type: "info",
        },
        { text: `Package Manager: ${data.packageManager}`, type: "info" },
        { text: "", type: "output" },
    ]);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInstalling, setIsInstalling] = useState(true);
    const [isKilling, setIsKilling] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const addedLines = useRef<Set<string>>(new Set());
    const childProcessRef = useRef<any>(null);

    const shouldAddLine = (line: string): boolean => {
        const normalized = cleanLine(line);
        if (!normalized) return false;
        if (normalized.startsWith("$") && normalized.includes("create vite")) return false;
        if (normalized.includes("───")) return false;
        if (normalized.startsWith("[") && normalized.includes("m")) return false;
        if (addedLines.current.has(normalized)) return false;
        addedLines.current.add(normalized);
        return true;
    };

    const addLine = (text: string, type: OutputLine["type"] = "output") => {
        const normalized = cleanLine(text);
        if (!shouldAddLine(normalized)) return;
        setLines((prev) => [...prev, { text: normalized, type }]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };

    const killProcess = async () => {
        if (!childProcessRef.current) return;
        setIsKilling(true);
        try {
            await invoke("kill_process", { pid: childProcessRef.current });
            addLine("⚠️ Installation cancelled by user", "error");
            setError("Installation cancelled");
            setIsInstalling(false);
            activeInstallation = null;
            startedInstalls.delete(`${projectsPath}/${data.name}`);
        } catch (err: any) {
            addLine(`Failed to kill process: ${err}`, "error");
        } finally {
            setIsKilling(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const unlistenPromise = listen("vite-output", (event: any) => {
            const payload = event.payload;
            if (payload.runId && payload.runId !== runId) return;

            if (payload.type === "started" && payload.pid) {
                childProcessRef.current = payload.pid;
                if (activeInstallation) {
                    activeInstallation.processId = payload.pid;
                }
            } else if (payload.type === "stdout") {
                payload.data.split("\n").forEach((line: string) => {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith("$")) {
                        if (
                            trimmed.includes("✔") ||
                            trimmed.includes("success") ||
                            trimmed.includes("done") ||
                            trimmed.includes("ready")
                        ) {
                            addLine(trimmed, "success");
                        } else if (trimmed.includes("error") || trimmed.includes("failed")) {
                            addLine(trimmed, "error");
                        } else if (
                            !trimmed.includes("───") &&
                            !trimmed.startsWith("[") &&
                            !trimmed.includes("create vite")
                        ) {
                            addLine(trimmed, "output");
                        }
                    }
                });
            } else if (payload.type === "stderr") {
                payload.data.split("\n").forEach((line: string) => {
                    const trimmed = line.trim();
                    if (trimmed) addLine(trimmed, "error");
                });
            } else if (payload.type === "complete") {
                addLine("✓ Project created successfully!", "success");
                addLine(`➜ cd ${projectsPath}/${data.name}`, "info");
                addLine(`➜ ${data.packageManager} run dev`, "info");
                addLine(`➜ http://${data.host}:${data.port}`, "info");

                if (isMounted) {
                    setDone(true);
                    setIsInstalling(false);
                }

                activeInstallation = null;
                startedInstalls.delete(`${projectsPath}/${data.name}`);
            } else if (payload.type === "error") {
                setError(payload.data);
                addLine(`Error: ${payload.data}`, "error");
                setIsInstalling(false);
                activeInstallation = null;
                startedInstalls.delete(`${projectsPath}/${data.name}`);
            }
        });

        const sendCommand = async () => {
            const installKey = `${projectsPath}/${data.name}`;
            if (startedInstalls.has(installKey)) return;
            startedInstalls.add(installKey);

            if (activeInstallation) {
                addLine(
                    `⚠️ Another installation (${activeInstallation.name}) is in progress. Please wait.`,
                    "error"
                );
                setIsInstalling(false);
                startedInstalls.delete(installKey);
                return;
            }

            activeInstallation = { name: data.name, status: "installing" };

            try {
                const framework = FRAMEWORKS.find((f) => f.id === data.framework);
                if (!framework) {
                    throw new Error(`Unknown framework: ${data.framework}`);
                }

                addLine(
                    `> Creating Vite project: ${data.name} with template ${framework.template}`,
                    "info"
                );

                await invoke("create_vite_project", {
                    projectPath: projectsPath,
                    name: data.name,
                    packageManager: data.packageManager,
                    template: framework.template,
                    installDeps: data.installDeps,
                    runId,
                });
            } catch (err: any) {
                const message = typeof err === "string" ? err : (err?.toString?.() ?? String(err));

                if (message.includes("cancelled") || message.includes("killed")) {
                    addLine("Installation cancelled", "error");
                } else if (message.includes("already exists")) {
                    addLine(`⚠️ ${message}`, "error");
                    setError(message);
                } else {
                    addLine(`Failed to create project: ${message}`, "error");
                    setError(message);
                }
                setIsInstalling(false);
                activeInstallation = null;
                startedInstalls.delete(installKey);
            }
        };

        sendCommand();

        return () => {
            isMounted = false;
            unlistenPromise.then((unlisten) => unlisten());
        };
    }, [data, projectsPath, runId]);

    return (
        <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-950 shadow-lg">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 sticky top-0">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        </div>
                        <span className="text-[11px] text-zinc-500 font-mono">
                            hive — vite installer
                        </span>
                    </div>
                    {isInstalling && !done && !error && (
                        <button
                            onClick={killProcess}
                            disabled={isKilling}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors disabled:opacity-50"
                        >
                            <XCircle className="w-3.5 h-3.5" />
                            {isKilling ? "Killing..." : "Cancel"}
                        </button>
                    )}
                </div>
                <div className="p-4 font-mono text-xs h-96 overflow-y-auto">
                    {lines.map((line, i) => (
                        <div
                            key={i}
                            className={cn(
                                "leading-relaxed whitespace-pre-wrap break-all mb-0.5 font-mono",
                                line.type === "success" && "text-emerald-400",
                                line.type === "error" && "text-red-400",
                                line.type === "info" && "text-amber-400",
                                line.type === "output" && "text-zinc-300"
                            )}
                        >
                            {line.type === "output" && line.text && (
                                <span className="text-zinc-600 mr-2">$</span>
                            )}
                            {line.text || "\u00A0"}
                        </div>
                    ))}
                    {isInstalling && !error && !done && (
                        <div className="flex items-center gap-2 mt-2 text-zinc-400">
                            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                            <span>Setting up Vite project...</span>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>
            {done && (
                <Button
                    onClick={() =>
                        onDone({
                            name: data.name,
                            type: "vite",
                            path: `${projectsPath}/${data.name}`,
                            description:
                                data.description ||
                                `Vite + ${FRAMEWORKS.find((f) => f.id === data.framework)?.name}`,
                            config: {
                                port: data.port,
                                host: data.host,
                                framework: data.framework,
                                packageManager: data.packageManager,
                            },
                        })
                    }
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    Open Project
                </Button>
            )}
            {error && (
                <Button
                    onClick={() => window.location.reload()}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
                >
                    <Loader2 className="w-4 h-4" />
                    Try Again
                </Button>
            )}
        </div>
    );
}

export function CreateViteProject({ onSuccess }: { onSuccess: (project: any) => void }) {
    const [step, setStep] = useState(0);
    const [projectsPath, setProjectsPath] = useState("~/Projects");
    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        host: "localhost",
        port: 5173,
        packageManager: "bun",
        framework: "react",
        installDeps: true,
    });
    const [isInstallingAny, setIsInstallingAny] = useState(!!activeInstallation);

    useEffect(() => {
        loadProjectsPath();
        const interval = setInterval(() => {
            setIsInstallingAny(!!activeInstallation);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const loadProjectsPath = async () => {
        try {
            const config = await invoke<any>("get_user_config");
            if (config && config.defaultProjectsPath) {
                setProjectsPath(config.defaultProjectsPath);
            }
        } catch (error) {
            console.error("Failed to load projects path:", error);
        }
    };

    const update = (patch: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...patch }));
    const goNext = () => setStep((s) => s + 1);
    const goBack = () => setStep((s) => s - 1);

    const getCreateCommand = () => {
        const framework = FRAMEWORKS.find((f) => f.id === formData.framework);
        return `${formData.packageManager} create vite@latest ${formData.name} --template ${framework?.template}`;
    };

    const handleDone = (project: any) => {
        onSuccess(project);
    };

    const visualStep = step === 3 ? 3 : step;

    const handleNameChange = (value: string) => {
        const cleaned = value
            .replace(/[^a-zA-Z0-9\-]/g, "")
            .toLowerCase()
            .replace(/\s+/g, "-");
        update({ name: cleaned });
    };

    return (
        <div className="space-y-6">
            {isInstallingAny && step !== 3 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                    <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                            Another installation in progress
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Project "{activeInstallation?.name}" is currently being installed.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-1">
                {["Name", "Framework", "Config", "Install"].map((label, i) => {
                    const active = i === visualStep;
                    const done = i < visualStep;
                    return (
                        <div key={i} className="flex items-center gap-1 flex-1 last:flex-none">
                            <div
                                className={cn(
                                    "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all",
                                    done
                                        ? "bg-emerald-500 text-white"
                                        : active
                                          ? "bg-amber-500 text-white"
                                          : "bg-muted text-muted-foreground"
                                )}
                            >
                                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                            </div>
                            <span
                                className={cn(
                                    "text-[11px] font-medium hidden sm:block",
                                    active ? "text-foreground" : "text-muted-foreground"
                                )}
                            >
                                {label}
                            </span>
                            {i < 3 && (
                                <div
                                    className={cn(
                                        "flex-1 h-px",
                                        done ? "bg-emerald-500/50" : "bg-border"
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {step === 0 && (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm">Project Name</Label>
                        <Input
                            autoFocus
                            placeholder="my-vite-app"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && formData.name && goNext()}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Will be created at {projectsPath}/{formData.name || "my-vite-app"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                            Only letters, numbers, and hyphens allowed
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm">Description (optional)</Label>
                        <Textarea
                            placeholder="A brief description of your Vite project"
                            value={formData.description}
                            onChange={(e) => update({ description: e.target.value })}
                            className="text-xs resize-none h-20"
                        />
                    </div>
                    <Button
                        onClick={goNext}
                        disabled={!formData.name}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
                    >
                        Continue <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-4">
                    <Label className="text-sm">Framework</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {FRAMEWORKS.map((fw) => (
                            <button
                                key={fw.id}
                                onClick={() => update({ framework: fw.id })}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                                    formData.framework === fw.id
                                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                <div className="text-xl">{fw.icon}</div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium">{fw.name}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm">Package Manager</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {PACKAGE_MANAGERS.map((pm) => (
                                <button
                                    key={pm.id}
                                    onClick={() => update({ packageManager: pm.id })}
                                    className={cn(
                                        "flex items-center justify-center gap-2 p-2 rounded-lg border text-sm transition-all",
                                        formData.packageManager === pm.id
                                            ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                                            : "border-border hover:bg-muted/50"
                                    )}
                                >
                                    <span className="text-base">{pm.icon}</span>
                                    <span className="text-xs font-medium">{pm.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={goBack}>
                            Back
                        </Button>
                        <Button
                            onClick={goNext}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                        >
                            Continue <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Host</Label>
                            <Input
                                value={formData.host}
                                onChange={(e) => update({ host: e.target.value })}
                                placeholder="localhost"
                                className="font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Port</Label>
                            <Input
                                type="number"
                                value={formData.port}
                                onChange={(e) => update({ port: parseInt(e.target.value) })}
                                placeholder="5173"
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                            <div className="text-sm font-medium">Install Dependencies</div>
                            <div className="text-[11px] text-muted-foreground">
                                Automatically install dependencies after creation
                            </div>
                        </div>
                        <div
                            className={cn(
                                "w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer",
                                formData.installDeps
                                    ? "bg-amber-500 border-amber-500"
                                    : "border-muted-foreground"
                            )}
                            onClick={() => update({ installDeps: !formData.installDeps })}
                        >
                            {formData.installDeps && (
                                <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                        </div>
                    </div>

                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                        <p className="text-[10px] text-zinc-500 mb-1.5 font-mono uppercase tracking-wider">
                            Command preview
                        </p>
                        <code className="text-[11px] font-mono text-emerald-400 break-all">
                            {getCreateCommand()}
                        </code>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={goBack}>
                            Back
                        </Button>
                        <Button
                            onClick={goNext}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                        >
                            Continue <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <TerminalPanel data={formData} onDone={handleDone} projectsPath={projectsPath} />
            )}
        </div>
    );
}
