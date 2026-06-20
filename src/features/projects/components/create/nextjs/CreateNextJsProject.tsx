import { cn } from "@/core/lib/utils";

import { useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CheckCircle2, ChevronRight, Loader2, Terminal, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
type Linter = "eslint" | "biome" | "none";

interface FormData {
    name: string;
    description: string;
    host: string;
    port: number;
    packageManager: PackageManager;
    typescript: boolean;
    tailwind: boolean;
    reactCompiler: boolean;
    srcDir: boolean;
    appRouter: boolean;
    linter: Linter;
    importAlias: string;
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
        { text: `Creating Next.js project: ${data.name}`, type: "info" },
        { text: `Location: ${projectsPath}/${data.name}`, type: "info" },
        { text: `Package Manager: ${data.packageManager}`, type: "info" },
        { text: "", type: "output" },
    ]);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInstalling, setIsInstalling] = useState(true);
    const [isKilling, setIsKilling] = useState(false);
    const [checkingPM, setCheckingPM] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const addedLines = useRef<Set<string>>(new Set());
    const childProcessRef = useRef<any>(null);

    const shouldAddLine = (line: string): boolean => {
        const normalized = cleanLine(line);
        if (!normalized) return false;
        if (normalized.startsWith("$") && normalized.includes("create next-app")) return false;
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

        const unlistenPromise = listen("nextjs-output", (event: any) => {
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
                            !trimmed.includes("create next-app")
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
                    setCheckingPM(false);
                }

                activeInstallation = null;
                startedInstalls.delete(`${projectsPath}/${data.name}`);
            } else if (payload.type === "error") {
                setError(payload.data);
                addLine(`Error: ${payload.data}`, "error");
                setIsInstalling(false);
                setCheckingPM(false);
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
                setCheckingPM(true);
                addLine(`🔍 Checking for ${data.packageManager}...`, "info");

                const pmCheck = await invoke<any>("check_package_manager", {
                    manager: data.packageManager,
                });

                if (!pmCheck.installed) {
                    addLine(
                        `⚠️ ${data.packageManager} not found. Installing ${data.packageManager} globally...`,
                        "info"
                    );
                    await invoke("install_package_manager", {
                        manager: data.packageManager,
                    });
                    addLine(`✅ ${data.packageManager} installed successfully!`, "success");
                } else {
                    addLine(`✅ ${data.packageManager} found (${pmCheck.version})`, "success");
                }

                let args: string[] = [];
                if (data.typescript) args.push("--typescript");
                else args.push("--js");

                if (data.tailwind) args.push("--tailwind");
                else args.push("--no-tailwind");

                if (data.reactCompiler) args.push("--react-compiler");
                if (data.srcDir) args.push("--src-dir");
                if (!data.appRouter) args.push("--no-app");
                if (data.linter === "biome") args.push("--biome");
                if (data.linter === "none") args.push("--no-linter");
                if (data.importAlias !== "@/*") {
                    args.push("--import-alias", data.importAlias);
                }
                args.push("--yes");

                const cmd = `${data.packageManager} create next-app@latest ${data.name} ${args.join(" ")}`;
                addLine(`> ${cmd}`, "info");

                await invoke("create_nextjs_project", {
                    projectPath: projectsPath,
                    name: data.name,
                    packageManager: data.packageManager,
                    args,
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
            } finally {
                if (isMounted) {
                    setCheckingPM(false);
                }
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
                            hive — next.js installer
                        </span>
                    </div>
                    {isInstalling && !done && !error && (
                        <button
                            onClick={killProcess}
                            disabled={isKilling || checkingPM}
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
                            <span>
                                {checkingPM
                                    ? `Checking ${data.packageManager}...`
                                    : "Setting up Next.js project..."}
                            </span>
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
                            type: "nextjs",
                            path: `${projectsPath}/${data.name}`,
                            description:
                                data.description ||
                                `Next.js${data.typescript ? " + TypeScript" : ""}${
                                    data.tailwind ? " + Tailwind" : ""
                                }`,
                            config: {
                                port: data.port,
                                host: data.host,
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

export function CreateNextJsProject({ onSuccess }: { onSuccess: (project: any) => void }) {
    const [step, setStep] = useState(0);
    const [projectsPath, setProjectsPath] = useState("~/Projects");
    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        host: "localhost",
        port: 3000,
        packageManager: "bun",
        typescript: true,
        tailwind: true,
        reactCompiler: false,
        srcDir: false,
        appRouter: true,
        linter: "eslint",
        importAlias: "@/*",
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
        let cmd = `${formData.packageManager} create next-app@latest ${formData.name}`;
        if (formData.typescript) cmd += " --typescript";
        else cmd += " --js";
        if (formData.tailwind) cmd += " --tailwind";
        else cmd += " --no-tailwind";
        if (formData.reactCompiler) cmd += " --react-compiler";
        if (formData.srcDir) cmd += " --src-dir";
        if (!formData.appRouter) cmd += " --no-app";
        if (formData.linter === "biome") cmd += " --biome";
        if (formData.linter === "none") cmd += " --no-linter";
        if (formData.importAlias !== "@/*") cmd += ` --import-alias ${formData.importAlias}`;
        cmd += " --yes";
        return cmd;
    };

    const selectedFeaturesCount = [
        formData.typescript,
        formData.tailwind,
        formData.reactCompiler,
        formData.srcDir,
        formData.appRouter,
    ].filter(Boolean).length;

    const handleCreate = () => {
        if (isInstallingAny) {
            alert(
                `Another project "${activeInstallation?.name}" is currently being installed. Please wait.`
            );
            return;
        }
        setStep(3);
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
                {["Name", "Config", "Features", "Install"].map((label, i) => {
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
                            placeholder="my-next-app"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && formData.name && goNext()}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Will be created at {projectsPath}/{formData.name || "my-next-app"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                            Only letters, numbers, and hyphens allowed
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm">Description (optional)</Label>
                        <Textarea
                            placeholder="A brief description of your Next.js project"
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
                                placeholder="3000"
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Package Manager</Label>
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
                    <div className="space-y-1.5">
                        <Label className="text-xs">Linter</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: "eslint", name: "ESLint", icon: "📝" },
                                { id: "biome", name: "Biome", icon: "🌿" },
                                { id: "none", name: "None", icon: "❌" },
                            ].map((linter) => (
                                <button
                                    key={linter.id}
                                    onClick={() => update({ linter: linter.id as Linter })}
                                    className={cn(
                                        "flex items-center justify-center gap-2 p-2 rounded-lg border text-sm transition-all",
                                        formData.linter === linter.id
                                            ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                                            : "border-border hover:bg-muted/50"
                                    )}
                                >
                                    <span className="text-base">{linter.icon}</span>
                                    <span className="text-xs font-medium">{linter.name}</span>
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
                    <div className="space-y-3">
                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ typescript: !formData.typescript })}
                        >
                            <div>
                                <div className="text-sm font-medium">TypeScript</div>
                                <div className="text-[11px] text-muted-foreground">
                                    TypeScript for type safety (recommended)
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.typescript
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.typescript && (
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                )}
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ tailwind: !formData.tailwind })}
                        >
                            <div>
                                <div className="text-sm font-medium">Tailwind CSS</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Tailwind CSS for styling (recommended)
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.tailwind
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.tailwind && (
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                )}
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ reactCompiler: !formData.reactCompiler })}
                        >
                            <div>
                                <div className="text-sm font-medium">React Compiler</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Enable React Compiler for optimizations
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.reactCompiler
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.reactCompiler && (
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                )}
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ srcDir: !formData.srcDir })}
                        >
                            <div>
                                <div className="text-sm font-medium">src/ Directory</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Place code inside a src/ directory
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.srcDir
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.srcDir && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ appRouter: !formData.appRouter })}
                        >
                            <div>
                                <div className="text-sm font-medium">App Router</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Use App Router (recommended)
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.appRouter
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.appRouter && (
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                            <Label className="text-xs">Import Alias</Label>
                            <Input
                                value={formData.importAlias}
                                onChange={(e) => update({ importAlias: e.target.value })}
                                placeholder="@/*"
                                className="font-mono text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground">e.g., @/*, ~/*</p>
                        </div>
                    </div>

                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                        <p className="text-[10px] text-zinc-500 mb-1.5 font-mono uppercase tracking-wider">
                            Features selected: {selectedFeaturesCount}
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
                            onClick={handleCreate}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <Terminal className="w-4 h-4" />
                            Install Project
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
