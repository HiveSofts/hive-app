import { useEffect, useRef, useState, useMemo } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
    CheckCircle2,
    ChevronRight,
    Database,
    FolderOpen,
    GitBranch,
    Layers,
    Loader2,
    Terminal,
} from "lucide-react";

import { ReactIcon } from "@/components/icons/ReactIcon";
import { VueIcon } from "@/components/icons/VueIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type StarterKit = "none" | "react" | "svelte" | "vue" | "livewire" | "custom";
type AuthProvider = "laravel" | "workos" | "none";
type DatabaseDriver = "mysql" | "mariadb" | "pgsql" | "sqlite" | "sqlsrv" | "mongodb";

interface FormData {
    name: string;
    starterKit: StarterKit;
    customRepo: string;
    auth: AuthProvider;
    database: DatabaseDriver;
    testing: "pest" | "phpunit";
    boost: boolean;
}

interface CreateLaravelProjectProps {
    onSuccess: (project: any) => void;
}

interface OutputLine {
    text: string;
    type: "info" | "success" | "error" | "output";
}

let activeInstallation: { name: string; status: string } | null = null;
const startedInstalls = new Set<string>();

const STEPS = [
    { label: "Name", icon: Layers },
    { label: "Starter Kit", icon: GitBranch },
    { label: "Auth", icon: FolderOpen },
    { label: "Database", icon: Database },
    { label: "Install", icon: Terminal },
];

const STARTER_KITS: { id: StarterKit; label: string; icon?: React.ReactNode; desc: string }[] = [
    { id: "none", label: "None", desc: "Bare Laravel installation" },
    {
        id: "react",
        label: "React",
        icon: <ReactIcon className="w-5 h-5" />,
        desc: "Inertia.js + React",
    },
    { id: "vue", label: "Vue", icon: <VueIcon className="w-5 h-5" />, desc: "Inertia.js + Vue 3" },
    {
        id: "svelte",
        label: "Svelte",
        icon: <span className="text-base">🧡</span>,
        desc: "Inertia.js + Svelte",
    },
    {
        id: "livewire",
        label: "Livewire",
        icon: <span className="text-base">⚡</span>,
        desc: "Blade + Livewire",
    },
    {
        id: "custom",
        label: "Custom",
        icon: <span className="text-base">🔧</span>,
        desc: "From a GitHub repo",
    },
];

const AUTH_OPTIONS: { id: AuthProvider; label: string; desc: string }[] = [
    { id: "laravel", label: "Laravel Auth", desc: "Built-in authentication scaffolding" },
    { id: "workos", label: "WorkOS", desc: "Enterprise SSO — requires WorkOS account" },
    { id: "none", label: "None", desc: "Skip authentication scaffolding" },
];

const DATABASE_OPTIONS: { id: DatabaseDriver; label: string; emoji: string }[] = [
    { id: "mysql", label: "MySQL", emoji: "🐬" },
    { id: "mariadb", label: "MariaDB", emoji: "🦭" },
    { id: "pgsql", label: "PostgreSQL", emoji: "🐘" },
    { id: "sqlite", label: "SQLite", emoji: "🗄️" },
    { id: "sqlsrv", label: "SQL Server", emoji: "🪟" },
    { id: "mongodb", label: "MongoDB", emoji: "🍃" },
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
    const runId = useMemo(() => crypto.randomUUID(), []);
    const [lines, setLines] = useState<OutputLine[]>([
        { text: `Creating Laravel project: ${data.name}`, type: "info" },
        { text: `Location: ${projectsPath}/${data.name}`, type: "info" },
        { text: "", type: "output" },
    ]);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInstalling, setIsInstalling] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);
    const addedLines = useRef<Set<string>>(new Set());

    const shouldAddLine = (line: string): boolean => {
        const normalized = cleanLine(line);
        if (!normalized) return false;
        if (normalized.startsWith("$") && normalized.includes("composer create-project")) return false;
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

    useEffect(() => {
        const unlistenPromise = listen("laravel-output", (event: any) => {
            const payload = event.payload;
            if (payload.runId && payload.runId !== runId) return;

            if (payload.type === "stdout") {
                payload.data.split("\n").forEach((line: string) => {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith("$")) {
                        if (trimmed.includes("✔") || trimmed.includes("success") || trimmed.includes("done")) {
                            addLine(trimmed, "success");
                        } else if (trimmed.includes("error") || trimmed.includes("failed")) {
                            addLine(trimmed, "error");
                        } else if (!trimmed.includes("───") && !trimmed.startsWith("[") && !trimmed.includes("composer create-project")) {
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
                addLine(`➜ php artisan serve --port=8000`, "info");
                setDone(true);
                setIsInstalling(false);
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
                addLine(`⚠️ Another installation (${activeInstallation.name}) is in progress. Please wait.`, "error");
                setIsInstalling(false);
                startedInstalls.delete(installKey);
                return;
            }

            activeInstallation = { name: data.name, status: "installing" };

            try {
                let args: string[] = [];
                if (data.starterKit !== "none" && data.starterKit !== "custom") args.push(`--${data.starterKit}`);
                if (data.starterKit === "custom" && data.customRepo) args.push(`--using=${data.customRepo}`);
                if (data.auth === "workos") args.push("--workos");
                if (data.auth === "none") args.push("--no-authentication");
                args.push(`--database=${data.database}`, `--${data.testing}`);
                if (!data.boost) args.push("--no-boost");

                addLine(`> laravel new ${data.name} ${args.join(" ")}`, "info");
                await invoke("create_laravel_project", {
                    projectPath: projectsPath,
                    name: data.name,
                    args,
                    runId,
                });
            } catch (err: any) {
                addLine(`Failed to create project: ${err}`, "error");
                setError(err.toString());
                setIsInstalling(false);
                activeInstallation = null;
                startedInstalls.delete(installKey);
            }
        };

        sendCommand();

        return () => {
            unlistenPromise.then((unlisten) => unlisten());
        };
    }, [data.name, data.starterKit, data.customRepo, data.auth, data.database, data.testing, data.boost, projectsPath, runId]);

    return (
        <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-950 shadow-lg">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 sticky top-0">
                    <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="ml-3 text-[11px] text-zinc-500 font-mono">
                        hive — laravel installer
                    </span>
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
                            <span>Installing Laravel...</span>
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
                            type: "laravel",
                            path: `${projectsPath}/${data.name}`,
                            description: `Laravel · ${data.database}${data.starterKit !== "none" ? ` · ${data.starterKit}` : ""}`,
                            port: 8000,
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
                    className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
                >
                    Try Again
                </Button>
            )}
        </div>
    );
}

export function CreateLaravelProject({ onSuccess }: CreateLaravelProjectProps) {
    const [step, setStep] = useState(0);
    const [projectsPath, setProjectsPath] = useState("~/Projects");
    const [existingProjects, setExistingProjects] = useState<string[]>([]);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        starterKit: "none",
        customRepo: "",
        auth: "laravel",
        database: "mysql",
        testing: "pest",
        boost: false,
    });
    const [isInstallingAny, setIsInstallingAny] = useState(!!activeInstallation);

    useEffect(() => {
        loadProjectsPath();
        checkExistingProjects();

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

    const checkExistingProjects = async () => {
        try {
            const projects = await invoke<string[]>("get_existing_projects");
            setExistingProjects(projects);
        } catch (error) {
            console.error("Failed to check existing projects:", error);
        }
    };

    const update = (patch: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...patch }));

    const goNext = () => setStep((s) => s + 1);
    const goBack = () => setStep((s) => s - 1);

    const skipAuthStep = formData.starterKit === "none";

    const handleNext = () => {
        if (step === 0) {
            if (existingProjects.includes(formData.name)) {
                alert(`Project "${formData.name}" already exists. Please choose another name.`);
                return;
            }
            if (!/^[a-z][a-z0-9-]*$/.test(formData.name)) {
                alert(
                    "Project name must start with a letter and can only contain lowercase letters, numbers, and hyphens."
                );
                return;
            }
            goNext();
        } else if (step === 1 && skipAuthStep) {
            setStep(3);
        } else {
            goNext();
        }
    };

    const handleBack = () => {
        if (step === 3 && skipAuthStep) {
            setStep(1);
        } else {
            goBack();
        }
    };

    const handleInstall = () => {
        if (isInstallingAny) {
            alert(
                `Another project "${activeInstallation?.name}" is currently being installed. Please wait for it to complete before creating a new project.`
            );
            return;
        }
        setStep(4);
    };

    const handleDone = (project: any) => {
        onSuccess(project);
    };

    const visualStep = step === 4 ? 4 : step >= 3 ? 3 : step;

    return (
        <div className="space-y-6">
            {isInstallingAny && step !== 4 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                    <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                            Another installation in progress
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Project "{activeInstallation?.name}" is currently being installed.
                            Please wait.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-1">
                {STEPS.map((s, i) => {
                    const active = i === visualStep;
                    const done = i < visualStep;
                    if (i === 2 && skipAuthStep) return null;
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
                                {s.label}
                            </span>
                            {i < STEPS.length - 1 && (
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
                            placeholder="my-awesome-app"
                            value={formData.name}
                            onChange={(e) =>
                                update({
                                    name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                                })
                            }
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && formData.name && handleNext()}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Will be created at {projectsPath}/{formData.name || "project-name"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                            Only lowercase letters, numbers, and hyphens allowed.
                        </p>
                    </div>
                    <Button
                        onClick={handleNext}
                        disabled={!formData.name}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
                    >
                        Continue <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-4">
                    <Label className="text-sm">Starter Kit</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {STARTER_KITS.map((kit) => (
                            <button
                                key={kit.id}
                                onClick={() => update({ starterKit: kit.id })}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                                    formData.starterKit === kit.id
                                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                                        : "border-border hover:border-border/80 hover:bg-muted/50"
                                )}
                            >
                                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                    {kit.icon || <span className="text-base">📦</span>}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium">{kit.label}</div>
                                    <div className="text-[11px] text-muted-foreground truncate">
                                        {kit.desc}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {formData.starterKit === "custom" && (
                        <div className="space-y-1.5">
                            <Label className="text-sm">GitHub Repository URL</Label>
                            <Input
                                autoFocus
                                placeholder="https://github.com/user/starter-kit"
                                value={formData.customRepo}
                                onChange={(e) => update({ customRepo: e.target.value })}
                                className="font-mono text-xs"
                            />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={goBack}>
                            Back
                        </Button>
                        <Button
                            onClick={handleNext}
                            disabled={formData.starterKit === "custom" && !formData.customRepo}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                        >
                            Continue <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <Label className="text-sm">Authentication Provider</Label>
                    <div className="space-y-2">
                        {AUTH_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => update({ auth: opt.id })}
                                className={cn(
                                    "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                                    formData.auth === opt.id
                                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                <div
                                    className={cn(
                                        "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                                        formData.auth === opt.id
                                            ? "border-amber-500"
                                            : "border-muted-foreground/40"
                                    )}
                                >
                                    {formData.auth === opt.id && (
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm font-medium">{opt.label}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                        {opt.desc}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleBack}>
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
                <div className="space-y-4">
                    <Label className="text-sm">Database Driver</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {DATABASE_OPTIONS.map((db) => (
                            <button
                                key={db.id}
                                onClick={() => update({ database: db.id })}
                                className={cn(
                                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all",
                                    formData.database === db.id
                                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                <span className="text-xl">{db.emoji}</span>
                                <span className="text-[11px] font-medium">{db.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-sm">Testing Framework</Label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => update({ testing: "pest" })}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs border transition-all",
                                        formData.testing === "pest"
                                            ? "border-amber-500 bg-amber-500/10 text-amber-500"
                                            : "border-border hover:bg-muted"
                                    )}
                                >
                                    Pest
                                </button>
                                <button
                                    onClick={() => update({ testing: "phpunit" })}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs border transition-all",
                                        formData.testing === "phpunit"
                                            ? "border-amber-500 bg-amber-500/10 text-amber-500"
                                            : "border-border hover:bg-muted"
                                    )}
                                >
                                    PHPUnit
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <div>
                                <div className="text-sm font-medium">Install Laravel Boost</div>
                                <div className="text-[11px] text-muted-foreground">
                                    AI-assisted coding improvements
                                </div>
                            </div>
                            <button
                                onClick={() => update({ boost: !formData.boost })}
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.boost
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.boost && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </button>
                        </div>
                    </div>

                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                        <p className="text-[10px] text-zinc-500 mb-1.5 font-mono uppercase tracking-wider">
                            Command preview
                        </p>
                        <code className="text-[11px] font-mono text-emerald-400 break-all">
                            laravel new {formData.name}{" "}
                            {formData.starterKit !== "none" &&
                                formData.starterKit !== "custom" &&
                                `--${formData.starterKit}`}{" "}
                            {formData.auth === "workos" && "--workos"}{" "}
                            {formData.auth === "none" && "--no-authentication"} --database=
                            {formData.database} --{formData.testing}{" "}
                            {!formData.boost && "--no-boost"}
                        </code>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleBack}>
                            Back
                        </Button>
                        <Button
                            onClick={handleInstall}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <Terminal className="w-4 h-4" />
                            Install Project
                        </Button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <TerminalPanel data={formData} onDone={handleDone} projectsPath={projectsPath} />
            )}
        </div>
    );
}