import { cn } from "@/core/lib/utils";

import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import axios from "axios";
import {
    AlertCircle,
    Box,
    CheckCircle2,
    ChevronRight,
    Code2,
    Copy,
    Database,
    Eye,
    EyeOff,
    FileCode2,
    Globe,
    HardDrive,
    Layers,
    Loader2,
    Play,
    Plus,
    RefreshCw,
    Search,
    Server,
    Settings,
    Sparkles,
    Terminal,
    Trash2,
    XCircle,
    Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GITHUB_API_URL =
    "https://api.github.com/repos/HiveSofts/hive-docker-containers/contents/container-definitions";

interface EnvVarTemplate {
    key: string;
    label: string;
    required: boolean;
    secret: boolean;
    default: string;
}

interface VolumeTemplate {
    host: string;
    container: string;
}

interface DockerTemplate {
    id: string;
    name: string;
    category: string;
    icon: string;
    description: string;
    image: string;
    defaultTag: string;
    tags: string[];
    defaultPort: number;
    containerPort: number;
    envVars: EnvVarTemplate[];
    volumes: VolumeTemplate[];
    compose: string;
    dockerfile: string;
    color: string;
}

const CATEGORIES: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "database", label: "Database", icon: <Database className="w-3.5 h-3.5" /> },
    { id: "web", label: "Web", icon: <Globe className="w-3.5 h-3.5" /> },
    { id: "cache", label: "Cache", icon: <Zap className="w-3.5 h-3.5" /> },
    { id: "queue", label: "Queue", icon: <Server className="w-3.5 h-3.5" /> },
    { id: "search", label: "Search", icon: <Search className="w-3.5 h-3.5" /> },
    { id: "monitoring", label: "Monitor", icon: <Box className="w-3.5 h-3.5" /> },
    { id: "storage", label: "Storage", icon: <HardDrive className="w-3.5 h-3.5" /> },
    { id: "cms", label: "CMS", icon: <FileCode2 className="w-3.5 h-3.5" /> },
    { id: "automation", label: "Automation", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: "dev-tools", label: "Dev Tools", icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: "custom", label: "Custom", icon: <Settings className="w-3.5 h-3.5" /> },
];

interface EnvEntry {
    key: string;
    value: string;
    secret: boolean;
    showValue: boolean;
}

interface VolumeEntry {
    host: string;
    container: string;
}

interface OutputLine {
    text: string;
    type: "info" | "success" | "error" | "output";
}

type CreationMode = "quick" | "compose" | "dockerfile";

function cleanLine(line: string): string {
    return line
        .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "")
        .trim();
}

async function fetchTemplatesFromGitHub(): Promise<DockerTemplate[]> {
    try {
        const response = await axios.get(GITHUB_API_URL, {
            headers: {
                Accept: "application/vnd.github.v3+json",
            },
            timeout: 15000,
        });

        const files: Array<{ name: string; download_url: string }> = response.data;
        const jsonFiles = files.filter((f) => f.name.endsWith(".json") && f.download_url);

        const results = await Promise.allSettled(
            jsonFiles.map((file) =>
                axios.get(file.download_url, { timeout: 8000 }).then((res) => res.data)
            )
        );

        return results
            .filter((r): r is PromiseFulfilledResult<DockerTemplate> => r.status === "fulfilled")
            .map((r) => r.value);
    } catch (error) {
        console.error("Failed to load templates from GitHub:", error);
        throw error;
    }
}

let cachedTemplates: DockerTemplate[] | null = null;
let templateLoadPromise: Promise<DockerTemplate[]> | null = null;

function useTemplates() {
    const [templates, setTemplates] = useState<DockerTemplate[]>(cachedTemplates || []);
    const [loading, setLoading] = useState(!cachedTemplates);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (force = false) => {
        if (cachedTemplates && !force) {
            setTemplates(cachedTemplates);
            setLoading(false);
            return;
        }

        if (templateLoadPromise && !force) {
            const result = await templateLoadPromise;
            setTemplates(result);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        templateLoadPromise = fetchTemplatesFromGitHub();

        try {
            const result = await templateLoadPromise;
            cachedTemplates = result;
            setTemplates(result);
        } catch (err) {
            setError(String(err));
            setTemplates([]);
        } finally {
            setLoading(false);
            templateLoadPromise = null;
        }
    }, []);

    useEffect(() => {
        if (!cachedTemplates) {
            load(false);
        }
    }, [load]);

    return { templates, loading, error, refresh: () => load(true) };
}

function TerminalLog({
    lines,
    isRunning,
    label,
}: {
    lines: OutputLine[];
    isRunning: boolean;
    label?: string;
}) {
    const bottomRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [lines]);

    return (
        <div className="rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-950 shadow-lg">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">
                        hive — {label ?? "docker"}
                    </span>
                </div>
                {isRunning && (
                    <div className="flex items-center gap-1.5 text-amber-400 text-[11px]">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Running...</span>
                    </div>
                )}
            </div>
            <div className="p-4 font-mono text-xs h-72 overflow-y-auto">
                {lines.map((line, i) => (
                    <div
                        key={i}
                        className={cn(
                            "leading-relaxed whitespace-pre-wrap break-all mb-0.5",
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
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

function CodeEditor({
    value,
    onChange,
    language,
    label,
}: {
    value: string;
    onChange: (v: string) => void;
    language: string;
    label: string;
}) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <div className="rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-950">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
                <div className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[11px] text-zinc-400 font-mono">{label}</span>
                    <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 border-zinc-700 text-zinc-500"
                    >
                        {language}
                    </Badge>
                </div>
                <button
                    onClick={copy}
                    className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    {copied ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                        <Copy className="w-3 h-3" />
                    )}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-transparent text-zinc-300 font-mono text-[11px] p-4 resize-none outline-none h-64 leading-relaxed"
                spellCheck={false}
            />
        </div>
    );
}

function TemplateLoadingGrid() {
    return (
        <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card animate-pulse"
                >
                    <div className="w-9 h-9 rounded-lg bg-muted flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-0.5">
                        <div className="h-3 bg-muted rounded w-2/3" />
                        <div className="h-2 bg-muted rounded w-full" />
                        <div className="h-2 bg-muted rounded w-4/5" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CreateDockerContainer({ onSuccess }: { onSuccess: (result: any) => void }) {
    const {
        templates,
        loading: templatesLoading,
        error: templatesError,
        refresh: refreshTemplates,
    } = useTemplates();

    const [step, setStep] = useState(0);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [selectedTemplate, setSelectedTemplate] = useState<DockerTemplate | null>(null);
    const [mode, setMode] = useState<CreationMode>("quick");

    const [containerName, setContainerName] = useState("");
    const [selectedTag, setSelectedTag] = useState("");
    const [hostPort, setHostPort] = useState(0);
    const [restartPolicy, setRestartPolicy] = useState("unless-stopped");
    const [memoryLimit, setMemoryLimit] = useState("");
    const [envEntries, setEnvEntries] = useState<EnvEntry[]>([]);
    const [volumes, setVolumes] = useState<VolumeEntry[]>([]);
    const [composeContent, setComposeContent] = useState("");
    const [dockerfileContent, setDockerfileContent] = useState("");
    const [customImage, setCustomImage] = useState("");

    const [lines, setLines] = useState<OutputLine[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [result, setResult] = useState<any>(null);

    const filteredTemplates = templates.filter((t) => {
        const matchSearch =
            !search ||
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase());
        const matchCat = category === "all" || t.category === category;
        return matchSearch && matchCat;
    });

    const addLine = (text: string, type: OutputLine["type"] = "output") => {
        const cleaned = cleanLine(text);
        if (!cleaned) return;
        setLines((prev) => [...prev, { text: cleaned, type }]);
    };

    const selectTemplate = (tpl: DockerTemplate) => {
        setSelectedTemplate(tpl);
        setSelectedTag(tpl.defaultTag);
        setHostPort(tpl.defaultPort);
        setContainerName(tpl.id !== "custom" ? `${tpl.id}-1` : "");
        setCustomImage(tpl.image);

        const envs: EnvEntry[] = tpl.envVars.map((e) => ({
            key: e.key,
            value: e.default,
            secret: e.secret,
            showValue: false,
        }));
        setEnvEntries(envs);
        setVolumes(tpl.volumes.map((v) => ({ host: v.host, container: v.container })));
        setComposeContent(
            buildCompose(
                tpl,
                tpl.id !== "custom" ? `${tpl.id}-1` : "my-container",
                tpl.defaultPort,
                tpl.defaultTag,
                envs
            )
        );
        setDockerfileContent(tpl.dockerfile);
        setStep(1);
    };

    const buildCompose = (
        tpl: DockerTemplate,
        name: string,
        port: number,
        tag: string,
        envs: EnvEntry[]
    ) => {
        let content = tpl.compose;
        content = content.replace(/\$\{CONTAINER_NAME\}/g, name || "my-container");
        content = content.replace(/\$\{HOST_PORT\}/g, String(port));
        content = content.replace(/\$\{TAG\}/g, tag);
        content = content.replace(/\$\{IMAGE\}/g, tpl.image || "ubuntu");
        content = content.replace(/\$\{CONTAINER_PORT\}/g, String(tpl.containerPort));
        for (const env of envs) {
            const regex = new RegExp(`\\$\\{${env.key}\\}`, "g");
            content = content.replace(regex, env.value || `<${env.key}>`);
        }
        return content;
    };

    useEffect(() => {
        if (!selectedTemplate || step !== 2) return;
        const updatedCompose = buildCompose(
            selectedTemplate,
            containerName,
            hostPort,
            selectedTag,
            envEntries
        );
        setComposeContent(updatedCompose);
    }, [containerName, hostPort, selectedTag, envEntries, selectedTemplate, step]);

    const updateEnv = (index: number, field: keyof EnvEntry, value: any) => {
        setEnvEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
    };

    const addEnv = () => {
        setEnvEntries((prev) => [...prev, { key: "", value: "", secret: false, showValue: true }]);
    };

    const removeEnv = (i: number) => {
        setEnvEntries((prev) => prev.filter((_, idx) => idx !== i));
    };

    const addVolume = () => {
        setVolumes((prev) => [...prev, { host: "", container: "" }]);
    };

    const removeVolume = (i: number) => {
        setVolumes((prev) => prev.filter((_, idx) => idx !== i));
    };

    const runQuick = async () => {
        if (!selectedTemplate) return;
        setStep(3);
        setIsRunning(true);
        setLines([]);
        setHasError(false);
        setIsDone(false);

        addLine(`🚀 Creating container: ${containerName}`, "info");
        addLine(`📦 Image: ${customImage || selectedTemplate.image}:${selectedTag}`, "info");
        addLine(`🌐 Port: ${hostPort} → ${selectedTemplate.containerPort}`, "info");

        const envMap: Record<string, string> = {};
        for (const e of envEntries) {
            if (e.key) envMap[e.key] = e.value;
        }

        try {
            if (
                ["mysql", "mariadb", "postgres", "postgresql", "mongodb", "redis"].includes(
                    selectedTemplate.id
                )
            ) {
                addLine("⚙️ Pulling image...", "info");
                const res = await invoke<any>("create_database_container", {
                    req: {
                        db_type: selectedTemplate.id,
                        container_name: containerName,
                        version: selectedTag,
                        host_port: hostPort,
                        root_password:
                            envMap["MYSQL_ROOT_PASSWORD"] ||
                            envMap["MONGO_INITDB_ROOT_PASSWORD"] ||
                            envMap["POSTGRES_PASSWORD"] ||
                            "",
                        database_name:
                            envMap["MYSQL_DATABASE"] ||
                            envMap["MONGO_INITDB_DATABASE"] ||
                            envMap["POSTGRES_DB"] ||
                            "app_db",
                        username:
                            envMap["MYSQL_USER"] ||
                            envMap["MONGO_INITDB_ROOT_USERNAME"] ||
                            envMap["POSTGRES_USER"] ||
                            "admin",
                        password:
                            envMap["MYSQL_PASSWORD"] ||
                            envMap["MONGO_INITDB_ROOT_PASSWORD"] ||
                            envMap["POSTGRES_PASSWORD"] ||
                            envMap["REDIS_PASSWORD"] ||
                            "",
                        data_volume: volumes[0]?.host || null,
                        memory_limit: memoryLimit || null,
                        cpu_limit: null,
                        restart_policy: restartPolicy,
                    },
                });
                if (res.success) {
                    addLine(`✅ Container created! ID: ${res.container_id}`, "success");
                    if (res.connection_string) {
                        addLine(`🔗 ${res.connection_string}`, "success");
                    }
                    setResult(res);
                    setIsDone(true);
                } else {
                    addLine(`❌ ${res.error}`, "error");
                    setHasError(true);
                }
            } else {
                addLine("⚙️ Building run command...", "info");
                let runArgs = [
                    "run",
                    "-d",
                    "--name",
                    containerName,
                    "--restart",
                    restartPolicy,
                    "-p",
                    `${hostPort}:${selectedTemplate.containerPort}`,
                ];
                if (memoryLimit) runArgs = [...runArgs, "--memory", memoryLimit];
                for (const e of envEntries) {
                    if (e.key && e.value) runArgs = [...runArgs, "-e", `${e.key}=${e.value}`];
                }
                for (const v of volumes) {
                    if (v.host && v.container)
                        runArgs = [...runArgs, "-v", `${v.host}:${v.container}`];
                }
                runArgs.push(`${customImage || selectedTemplate.image}:${selectedTag}`);

                addLine(`> docker ${runArgs.join(" ")}`, "info");

                const res = await invoke<string>("execute_shell_command", {
                    command: `docker ${runArgs.join(" ")}`,
                });

                const containerId = (res || "").trim().slice(0, 12);
                addLine(`✅ Container started! ID: ${containerId}`, "success");
                addLine(`🌐 Access: http://localhost:${hostPort}`, "success");
                setResult({
                    container_id: containerId,
                    container_name: containerName,
                    port: hostPort,
                });
                setIsDone(true);
            }
        } catch (err: any) {
            addLine(`❌ ${err?.toString?.() ?? String(err)}`, "error");
            setHasError(true);
        } finally {
            setIsRunning(false);
        }
    };

    const runCompose = async () => {
        setStep(3);
        setIsRunning(true);
        setLines([]);
        setHasError(false);
        setIsDone(false);

        addLine(`🚀 Launching compose project: ${containerName}`, "info");

        const unlisten = await listen("compose-log", (e: any) => {
            addLine(e.payload, "output");
        });

        try {
            await invoke("run_docker_compose", {
                projectName: containerName,
                composeContent,
                envVars: {},
                window: undefined,
            });
            addLine("✅ Compose project started successfully!", "success");
            setResult({ container_name: containerName });
            setIsDone(true);
        } catch (err: any) {
            addLine(`❌ ${err?.toString?.() ?? String(err)}`, "error");
            setHasError(true);
        } finally {
            setIsRunning(false);
            unlisten();
        }
    };

    const runDockerfile = async () => {
        setStep(3);
        setIsRunning(true);
        setLines([]);
        setHasError(false);
        setIsDone(false);

        addLine(`🏗️ Building image from Dockerfile...`, "info");
        addLine(`📦 Image name: ${containerName}:local`, "info");

        try {
            const tmpPath = `/tmp/hive_dockerfile_${containerName}`;
            await invoke("execute_shell_command", {
                command: `mkdir -p ${tmpPath} && cat > ${tmpPath}/Dockerfile << 'HIVE_EOF'\n${dockerfileContent}\nHIVE_EOF`,
            });
            addLine("📁 Dockerfile written to temp dir", "info");

            const buildRes = await invoke<string>("execute_shell_command", {
                command: `docker build -t ${containerName}:local ${tmpPath} 2>&1`,
            });
            for (const line of (buildRes || "").split("\n")) {
                if (line.trim()) addLine(line, "output");
            }

            addLine(`✅ Image built: ${containerName}:local`, "success");
            addLine(
                `> docker run -d --name ${containerName} -p ${hostPort}:${selectedTemplate?.containerPort ?? 8080} ${containerName}:local`,
                "info"
            );

            const runRes = await invoke<string>("execute_shell_command", {
                command: `docker run -d --name ${containerName} -p ${hostPort}:${selectedTemplate?.containerPort ?? 8080} ${containerName}:local`,
            });

            addLine(`✅ Container started! ID: ${(runRes || "").trim().slice(0, 12)}`, "success");
            setResult({ container_name: containerName, port: hostPort });
            setIsDone(true);
        } catch (err: any) {
            addLine(`❌ ${err?.toString?.() ?? String(err)}`, "error");
            setHasError(true);
        } finally {
            setIsRunning(false);
        }
    };

    const handleDeploy = () => {
        if (mode === "quick") runQuick();
        else if (mode === "compose") runCompose();
        else runDockerfile();
    };

    const visualStep = step === 3 ? 3 : step;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-1">
                {["Template", "Configure", "Review", "Deploy"].map((label, i) => {
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
                                          ? "bg-blue-500 text-white"
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
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search templates..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 text-sm"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={refreshTemplates}
                            disabled={templatesLoading}
                            className="flex-shrink-0"
                            title="Refresh templates from GitHub"
                        >
                            <RefreshCw
                                className={cn("w-4 h-4", templatesLoading && "animate-spin")}
                            />
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setCategory(cat.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all",
                                    category === cat.id
                                        ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                        : "border-border text-muted-foreground hover:bg-muted/50"
                                )}
                            >
                                {cat.icon}
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {templatesLoading ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Loading templates from GitHub...</span>
                            </div>
                            <TemplateLoadingGrid />
                        </div>
                    ) : templatesError ? (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                            <XCircle className="w-8 h-8 text-red-400" />
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    Failed to load templates
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    {templatesError}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={refreshTemplates}
                                className="gap-2"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Try Again
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground">
                                    {filteredTemplates.length} template
                                    {filteredTemplates.length !== 1 ? "s" : ""}
                                    {category !== "all" || search ? " found" : " available"}
                                </span>
                                <span className="text-[10px] text-muted-foreground/60">
                                    from github.com/HiveSofts
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                                {filteredTemplates.map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        onClick={() => selectTemplate(tpl)}
                                        className="group relative flex items-start gap-3 p-3.5 rounded-xl border border-border hover:border-blue-500/50 bg-card hover:bg-blue-500/5 transition-all text-left"
                                    >
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 transition-transform group-hover:scale-110"
                                            style={{
                                                background: `${tpl.color}18`,
                                                border: `1px solid ${tpl.color}30`,
                                            }}
                                        >
                                            {tpl.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-sm font-semibold text-foreground">
                                                    {tpl.name}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[9px] px-1 py-0 border-zinc-700 text-zinc-500"
                                                >
                                                    {tpl.defaultTag}
                                                </Badge>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                                                {tpl.description}
                                            </p>
                                            <div className="mt-1.5 flex items-center gap-1">
                                                <span
                                                    className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                                    style={{
                                                        background: `${tpl.color}18`,
                                                        color: tpl.color,
                                                        border: `1px solid ${tpl.color}30`,
                                                    }}
                                                >
                                                    {tpl.category}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground">
                                                    :{tpl.defaultPort}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {step === 1 && selectedTemplate && (
                <div className="space-y-4">
                    <div
                        className="flex items-center gap-3 p-3 rounded-xl border"
                        style={{
                            borderColor: `${selectedTemplate.color}40`,
                            background: `${selectedTemplate.color}08`,
                        }}
                    >
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                            style={{ background: `${selectedTemplate.color}20` }}
                        >
                            {selectedTemplate.icon}
                        </div>
                        <div>
                            <div className="font-semibold text-sm">{selectedTemplate.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                                {selectedTemplate.description}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {(["quick", "compose", "dockerfile"] as CreationMode[]).map((m) => {
                            const labels: Record<
                                CreationMode,
                                { label: string; icon: React.ReactNode; desc: string }
                            > = {
                                quick: {
                                    label: "Quick Run",
                                    icon: <Play className="w-3.5 h-3.5" />,
                                    desc: "docker run",
                                },
                                compose: {
                                    label: "Compose",
                                    icon: <Layers className="w-3.5 h-3.5" />,
                                    desc: "docker-compose.yml",
                                },
                                dockerfile: {
                                    label: "Dockerfile",
                                    icon: <FileCode2 className="w-3.5 h-3.5" />,
                                    desc: "Build custom image",
                                },
                            };
                            const info = labels[m];
                            return (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={cn(
                                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                                        mode === m
                                            ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30"
                                            : "border-border hover:bg-muted/40"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center",
                                            mode === m
                                                ? "bg-blue-500 text-white"
                                                : "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {info.icon}
                                    </div>
                                    <span className="text-xs font-semibold">{info.label}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {info.desc}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Container Name</Label>
                            <Input
                                value={containerName}
                                onChange={(e) =>
                                    setContainerName(
                                        e.target.value.replace(/[^a-zA-Z0-9\-_]/g, "").toLowerCase()
                                    )
                                }
                                placeholder="my-container"
                                className="font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Host Port</Label>
                            <Input
                                type="number"
                                value={hostPort}
                                onChange={(e) => setHostPort(parseInt(e.target.value) || 0)}
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>

                    {selectedTemplate.id === "custom" && (
                        <div className="space-y-1.5">
                            <Label className="text-xs">Image</Label>
                            <Input
                                value={customImage}
                                onChange={(e) => setCustomImage(e.target.value)}
                                placeholder="e.g. nginx, ubuntu, myrepo/myapp"
                                className="font-mono text-xs"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-xs">Image Tag</Label>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedTemplate.tags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTag(tag)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all",
                                        selectedTag === tag
                                            ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                            : "border-border text-muted-foreground hover:bg-muted/50"
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Restart Policy</Label>
                            <select
                                value={restartPolicy}
                                onChange={(e) => setRestartPolicy(e.target.value)}
                                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-mono"
                            >
                                <option value="unless-stopped">unless-stopped</option>
                                <option value="always">always</option>
                                <option value="on-failure">on-failure</option>
                                <option value="no">no</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Memory Limit (optional)</Label>
                            <Input
                                value={memoryLimit}
                                onChange={(e) => setMemoryLimit(e.target.value)}
                                placeholder="e.g. 512m, 1g"
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setStep(0)}>
                            Back
                        </Button>
                        <Button
                            onClick={() => setStep(2)}
                            disabled={!containerName}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        >
                            Configure <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && selectedTemplate && (
                <div className="space-y-4">
                    {envEntries.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Environment Variables</Label>
                                <button
                                    onClick={addEnv}
                                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-400 transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {envEntries.map((env, i) => {
                                    const tplEnv = selectedTemplate.envVars.find(
                                        (e) => e.key === env.key
                                    );
                                    return (
                                        <div key={i} className="flex gap-2 items-start">
                                            <div className="flex-1 grid grid-cols-2 gap-2">
                                                <Input
                                                    value={env.key}
                                                    onChange={(e) =>
                                                        updateEnv(i, "key", e.target.value)
                                                    }
                                                    placeholder="KEY"
                                                    className="font-mono text-xs h-8"
                                                    readOnly={!!tplEnv}
                                                />
                                                <div className="relative">
                                                    <Input
                                                        type={
                                                            env.secret && !env.showValue
                                                                ? "password"
                                                                : "text"
                                                        }
                                                        value={env.value}
                                                        onChange={(e) =>
                                                            updateEnv(i, "value", e.target.value)
                                                        }
                                                        placeholder={tplEnv?.label ?? "value"}
                                                        className="font-mono text-xs h-8 pr-8"
                                                    />
                                                    {env.secret && (
                                                        <button
                                                            onClick={() =>
                                                                updateEnv(
                                                                    i,
                                                                    "showValue",
                                                                    !env.showValue
                                                                )
                                                            }
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                        >
                                                            {env.showValue ? (
                                                                <EyeOff className="w-3 h-3" />
                                                            ) : (
                                                                <Eye className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {!tplEnv && (
                                                <button
                                                    onClick={() => removeEnv(i)}
                                                    className="text-red-500 hover:text-red-400 mt-1.5"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {envEntries.length === 0 && (
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Environment Variables</Label>
                            <button
                                onClick={addEnv}
                                className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-400 transition-colors"
                            >
                                <Plus className="w-3 h-3" /> Add Variable
                            </button>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Volumes</Label>
                            <button
                                onClick={addVolume}
                                className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-400 transition-colors"
                            >
                                <Plus className="w-3 h-3" /> Add
                            </button>
                        </div>
                        {volumes.map((v, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input
                                    value={v.host}
                                    onChange={(e) =>
                                        setVolumes((prev) =>
                                            prev.map((vol, idx) =>
                                                idx === i ? { ...vol, host: e.target.value } : vol
                                            )
                                        )
                                    }
                                    placeholder="host path / volume name"
                                    className="font-mono text-xs h-8"
                                />
                                <span className="text-muted-foreground text-xs">:</span>
                                <Input
                                    value={v.container}
                                    onChange={(e) =>
                                        setVolumes((prev) =>
                                            prev.map((vol, idx) =>
                                                idx === i
                                                    ? { ...vol, container: e.target.value }
                                                    : vol
                                            )
                                        )
                                    }
                                    placeholder="/container/path"
                                    className="font-mono text-xs h-8"
                                />
                                <button
                                    onClick={() => removeVolume(i)}
                                    className="text-red-500 hover:text-red-400"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {mode === "compose" && (
                        <CodeEditor
                            value={composeContent}
                            onChange={setComposeContent}
                            language="yaml"
                            label="docker-compose.yml"
                        />
                    )}

                    {mode === "dockerfile" && (
                        <CodeEditor
                            value={dockerfileContent}
                            onChange={setDockerfileContent}
                            language="dockerfile"
                            label="Dockerfile"
                        />
                    )}

                    {mode === "quick" && (
                        <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                            <p className="text-[10px] text-zinc-500 mb-1.5 font-mono uppercase tracking-wider">
                                Generated Command
                            </p>
                            <code className="text-[11px] font-mono text-emerald-400 break-all leading-relaxed">
                                docker run -d --name {containerName} --restart {restartPolicy} -p{" "}
                                {hostPort}:{selectedTemplate.containerPort}{" "}
                                {memoryLimit && `--memory ${memoryLimit} `}
                                {envEntries
                                    .filter((e) => e.key && e.value)
                                    .map((e) => `-e ${e.key}=*** `)
                                    .join("")}
                                {volumes
                                    .filter((v) => v.host && v.container)
                                    .map((v) => `-v ${v.host}:${v.container} `)
                                    .join("")}
                                {customImage || selectedTemplate.image}:{selectedTag}
                            </code>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                            Back
                        </Button>
                        <Button
                            onClick={handleDeploy}
                            disabled={!containerName || hostPort === 0}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <Terminal className="w-4 h-4" />
                            Deploy Container
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4">
                    <TerminalLog
                        lines={lines}
                        isRunning={isRunning}
                        label={`${selectedTemplate?.name ?? "docker"} · ${mode}`}
                    />

                    {isDone && (
                        <Button
                            onClick={() =>
                                onSuccess({
                                    name: containerName,
                                    type: "docker",
                                    template: selectedTemplate?.id,
                                    port: hostPort,
                                    ...result,
                                })
                            }
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Open Container
                        </Button>
                    )}

                    {hasError && (
                        <Button
                            onClick={() => setStep(2)}
                            variant="outline"
                            className="w-full gap-2"
                        >
                            <AlertCircle className="w-4 h-4" />
                            Back & Fix
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
