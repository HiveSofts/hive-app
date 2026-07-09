import { cn } from "@/core/lib/utils";

import React, { useCallback, useEffect, useRef, useState } from "react";

import {
    Activity,
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    Database,
    Eye,
    EyeOff,
    HardDrive,
    Info,
    Layers,
    Loader2,
    Monitor,
    Play,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Server,
    Square,
    Terminal,
    Trash2,
    WifiOff,
    X,
    Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useDocker } from "./hooks/useDocker";
import { DB_CATEGORY_LABELS, DB_PRESETS } from "./services/config/dbPresets";
import * as dockerService from "./services/docker.service";
import {
    ContainerInfo,
    CreateContainerResult,
    CreateDatabaseContainerRequest,
    DBPreset,
} from "./services/types";

function generatePassword(len = 18) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join(
        ""
    );
}

function getPresetForImage(image: string): DBPreset | null {
    const lower = image.toLowerCase();
    return (
        DB_PRESETS.find((p) => lower.includes(p.id) || lower.includes(p.label.toLowerCase())) ??
        null
    );
}

function stateColors(state: string) {
    switch (state) {
        case "running":
            return {
                border: "border-emerald-500/20",
                dot: "bg-emerald-500 animate-pulse",
                badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
            };
        case "exited":
            return {
                border: "border-zinc-500/15",
                dot: "bg-zinc-400",
                badge: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
            };
        default:
            return {
                border: "border-amber-500/15",
                dot: "bg-amber-500",
                badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
            };
    }
}

// ──────────────────────────────────────────────
// Password field
// ──────────────────────────────────────────────
function PasswordInput({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <Input
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-8 text-xs pr-8 font-mono"
            />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
                {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
        </div>
    );
}

function FieldRow({
    label,
    children,
    hint,
}: {
    label: string;
    children: React.ReactNode;
    hint?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium">{label}</label>
            {children}
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
    );
}

// ──────────────────────────────────────────────
// Create Database Wizard
// ──────────────────────────────────────────────
type WizardStep = "type" | "config" | "advanced" | "result";

interface WizardProps {
    onClose: () => void;
    onCreate: (req: CreateDatabaseContainerRequest) => Promise<CreateContainerResult>;
}

function CreateDatabaseWizard({ onClose, onCreate }: WizardProps) {
    const [step, setStep] = useState<WizardStep>("type");
    const [preset, setPreset] = useState<DBPreset | null>(null);
    const [creating, setCreating] = useState(false);
    const [result, setResult] = useState<CreateContainerResult | null>(null);
    const [copied, setCopied] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    const [form, setForm] = useState({
        version: "",
        containerName: "",
        hostPort: 0,
        rootPassword: generatePassword(),
        databaseName: "hive_db",
        username: "hive_user",
        password: generatePassword(),
        memoryLimit: "512m",
        restartPolicy: "unless-stopped",
        customVolume: "",
    });

    const set = useCallback(
        (k: keyof typeof form, v: string | number) => setForm((prev) => ({ ...prev, [k]: v })),
        []
    );

    const selectPreset = (p: DBPreset) => {
        setPreset(p);
        setForm((prev) => ({
            ...prev,
            version: p.defaultVersion,
            hostPort: p.defaultPort,
            containerName: `hive-${p.id}`,
        }));
        setStep("config");
    };

    const handleCreate = async () => {
        if (!preset) return;
        setCreating(true);
        setLogs([`Pulling image ${preset.id}:${form.version}...`]);
        try {
            const req: CreateDatabaseContainerRequest = {
                db_type: preset.id,
                container_name: form.containerName,
                version: form.version,
                host_port: Number(form.hostPort),
                root_password: form.rootPassword,
                database_name: form.databaseName,
                username: form.username,
                password: form.password,
                data_volume: form.customVolume || null,
                memory_limit: form.memoryLimit || null,
                cpu_limit: null,
                restart_policy: form.restartPolicy,
            };
            setLogs((l) => [...l, "Creating container..."]);
            const res = await onCreate(req);
            setLogs((l) => [
                ...l,
                res.success ? "✓ Container created successfully" : `✗ ${res.error}`,
            ]);
            setResult(res);
            setStep("result");
        } finally {
            setCreating(false);
        }
    };

    const copy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const steps: { key: WizardStep; label: string }[] = [
        { key: "type", label: "Database" },
        { key: "config", label: "Configure" },
        { key: "advanced", label: "Advanced" },
        { key: "result", label: "Done" },
    ];

    const stepIndex = steps.findIndex((s) => s.key === step);

    const categories = ["all", ...Array.from(new Set(DB_PRESETS.map((p) => p.category)))];
    const filteredPresets =
        categoryFilter === "all"
            ? DB_PRESETS
            : DB_PRESETS.filter((p) => p.category === categoryFilter);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
                className="bg-background border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
                style={{ maxHeight: "90vh" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
                    <div className="flex items-center gap-2.5">
                        {preset ? (
                            <span className="text-2xl">{preset.icon}</span>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <Database className="w-4 h-4 text-blue-500" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-sm font-semibold">New database container</h2>
                            {preset && (
                                <p className="text-[11px] text-muted-foreground">{preset.label}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="px-5 py-3 border-b shrink-0 flex items-center gap-0">
                    {steps.map((s, i) => {
                        const active = s.key === step;
                        const done = i < stepIndex;
                        return (
                            <React.Fragment key={s.key}>
                                <div
                                    className={cn(
                                        "flex items-center gap-1.5 text-[11px] font-medium",
                                        active
                                            ? "text-blue-600"
                                            : done
                                              ? "text-emerald-600"
                                              : "text-muted-foreground"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                            active
                                                ? "bg-blue-500 text-white"
                                                : done
                                                  ? "bg-emerald-500 text-white"
                                                  : "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {done ? <Check className="w-3 h-3" /> : i + 1}
                                    </span>
                                    {s.label}
                                </div>
                                {i < steps.length - 1 && (
                                    <ChevronRight className="w-3 h-3 text-muted-foreground/40 mx-1.5 shrink-0" />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {/* Step 1: Select type */}
                    {step === "type" && (
                        <div className="space-y-3">
                            {/* Category filter */}
                            <div className="flex gap-1.5 flex-wrap">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setCategoryFilter(cat)}
                                        className={cn(
                                            "px-2.5 py-1 text-[11px] rounded-full border transition-colors capitalize",
                                            categoryFilter === cat
                                                ? "bg-blue-500 text-white border-blue-500"
                                                : "border-border text-muted-foreground hover:border-blue-500/50 hover:text-blue-600"
                                        )}
                                    >
                                        {cat === "all" ? "All" : (DB_CATEGORY_LABELS[cat] ?? cat)}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {filteredPresets.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => selectPreset(p)}
                                        className="flex items-center gap-3 p-3.5 rounded-xl border hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-left group"
                                    >
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                                            style={{
                                                backgroundColor: p.color + "18",
                                                border: `1px solid ${p.color}30`,
                                            }}
                                        >
                                            {p.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">
                                                    {p.label}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground border rounded px-1 font-mono">
                                                    v{p.defaultVersion}
                                                </span>
                                                <span
                                                    className={cn(
                                                        "text-[10px] px-1.5 py-px rounded-full border ml-auto",
                                                        p.category === "relational"
                                                            ? "border-blue-500/30 text-blue-600 bg-blue-500/10"
                                                            : p.category === "cache"
                                                              ? "border-red-500/30 text-red-600 bg-red-500/10"
                                                              : p.category === "nosql"
                                                                ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                                                                : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                                                    )}
                                                >
                                                    {DB_CATEGORY_LABELS[p.category] ?? p.category}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {p.description}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Config */}
                    {step === "config" && preset && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <FieldRow label="Container name">
                                    <Input
                                        value={form.containerName}
                                        onChange={(e) => set("containerName", e.target.value)}
                                        className="h-8 text-xs font-mono"
                                        placeholder="hive-mysql"
                                    />
                                </FieldRow>
                                <FieldRow label="Version">
                                    <select
                                        value={form.version}
                                        onChange={(e) => set("version", e.target.value)}
                                        className="w-full h-8 text-xs border rounded-md bg-background px-2 font-mono"
                                    >
                                        {preset.versions.map((v) => (
                                            <option key={v} value={v}>
                                                {v}
                                            </option>
                                        ))}
                                    </select>
                                </FieldRow>
                            </div>

                            <FieldRow
                                label="Host port"
                                hint={`Default for ${preset.label}: ${preset.defaultPort}`}
                            >
                                <Input
                                    type="number"
                                    value={form.hostPort}
                                    onChange={(e) => set("hostPort", e.target.value)}
                                    className="h-8 text-xs font-mono"
                                />
                            </FieldRow>

                            {preset.hasDatabase && (
                                <FieldRow label="Database name">
                                    <Input
                                        value={form.databaseName}
                                        onChange={(e) => set("databaseName", e.target.value)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </FieldRow>
                            )}

                            {preset.hasUser && (
                                <FieldRow label="Username">
                                    <Input
                                        value={form.username}
                                        onChange={(e) => set("username", e.target.value)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </FieldRow>
                            )}

                            {preset.hasPassword && (
                                <FieldRow label="User password">
                                    <div className="flex gap-2">
                                        <PasswordInput
                                            value={form.password}
                                            onChange={(v) => set("password", v)}
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs shrink-0"
                                            onClick={() => set("password", generatePassword())}
                                        >
                                            Generate
                                        </Button>
                                    </div>
                                </FieldRow>
                            )}

                            {preset.hasRootPassword && (
                                <FieldRow label="Root password">
                                    <div className="flex gap-2">
                                        <PasswordInput
                                            value={form.rootPassword}
                                            onChange={(v) => set("rootPassword", v)}
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs shrink-0"
                                            onClick={() => set("rootPassword", generatePassword())}
                                        >
                                            Generate
                                        </Button>
                                    </div>
                                </FieldRow>
                            )}
                        </div>
                    )}

                    {/* Step 3: Advanced */}
                    {step === "advanced" && (
                        <div className="space-y-4">
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-600">
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                Optional — defaults work fine for local development.
                            </div>

                            <FieldRow label="Memory limit" hint="e.g. 512m, 1g, 2g">
                                <Input
                                    value={form.memoryLimit}
                                    onChange={(e) => set("memoryLimit", e.target.value)}
                                    className="h-8 text-xs font-mono"
                                    placeholder="512m"
                                />
                            </FieldRow>

                            <FieldRow label="Restart policy">
                                <select
                                    value={form.restartPolicy}
                                    onChange={(e) => set("restartPolicy", e.target.value)}
                                    className="w-full h-8 text-xs border rounded-md bg-background px-2"
                                >
                                    <option value="unless-stopped">
                                        unless-stopped (recommended)
                                    </option>
                                    <option value="always">always</option>
                                    <option value="on-failure">on-failure</option>
                                    <option value="no">no</option>
                                </select>
                            </FieldRow>

                            <FieldRow
                                label="Custom volume name"
                                hint="Leave empty to auto-generate"
                            >
                                <Input
                                    value={form.customVolume}
                                    onChange={(e) => set("customVolume", e.target.value)}
                                    className="h-8 text-xs font-mono"
                                    placeholder={`hive_${form.containerName}_data`}
                                />
                            </FieldRow>

                            <div className="p-3 rounded-xl border bg-muted/20">
                                <p className="text-[11px] font-medium mb-1">Auto-created volume</p>
                                <code className="text-[11px] font-mono text-muted-foreground">
                                    {form.customVolume || `hive_${form.containerName}_data`}
                                </code>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Data persists across container restarts.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Result */}
                    {step === "result" && result && (
                        <div className="space-y-4">
                            {creating && (
                                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20 font-mono text-[11px]">
                                    {logs.map((l, i) => (
                                        <div
                                            key={i}
                                            className={
                                                l.startsWith("✓")
                                                    ? "text-emerald-600"
                                                    : l.startsWith("✗")
                                                      ? "text-red-500"
                                                      : "text-muted-foreground"
                                            }
                                        >
                                            {l}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Creating...
                                    </div>
                                </div>
                            )}

                            {!creating && result.success && (
                                <>
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                                        <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-emerald-700">
                                                Container created!
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {result.container_name} is running on port{" "}
                                                {result.port}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                            Connection details
                                        </p>
                                        {[
                                            { label: "Host", value: "localhost" },
                                            { label: "Port", value: String(result.port) },
                                            ...(result.database
                                                ? [{ label: "Database", value: result.database }]
                                                : []),
                                            ...(result.username
                                                ? [{ label: "Username", value: result.username }]
                                                : []),
                                        ].map(({ label, value }) => (
                                            <div
                                                key={label}
                                                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border"
                                            >
                                                <span className="text-[11px] text-muted-foreground">
                                                    {label}
                                                </span>
                                                <span className="text-xs font-mono font-medium">
                                                    {value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {result.connection_string && (
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                                Connection string
                                            </p>
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-950 border font-mono text-[11px]">
                                                <span className="flex-1 text-emerald-400 break-all">
                                                    {result.connection_string}
                                                </span>
                                                <button
                                                    onClick={() => copy(result.connection_string!)}
                                                    className="p-1 rounded hover:bg-zinc-800 transition-colors shrink-0"
                                                >
                                                    {copied ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Logs */}
                                    {logs.length > 0 && (
                                        <div className="p-3 rounded-xl border bg-muted/10 font-mono text-[11px] space-y-1 max-h-32 overflow-y-auto">
                                            {logs.map((l, i) => (
                                                <div
                                                    key={i}
                                                    className={
                                                        l.startsWith("✓")
                                                            ? "text-emerald-600"
                                                            : "text-muted-foreground"
                                                    }
                                                >
                                                    {l}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {!creating && !result.success && (
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25">
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-600">
                                            Failed to create container
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                                            {result.error}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t bg-muted/10 shrink-0">
                    <div>
                        {step !== "type" && step !== "result" && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1.5 text-xs"
                                onClick={() => setStep(step === "config" ? "type" : "config")}
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                Back
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {step === "result" ? (
                            <Button size="sm" onClick={onClose} className="text-xs">
                                Done
                            </Button>
                        ) : step === "type" ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onClose}
                                className="text-xs"
                            >
                                Cancel
                            </Button>
                        ) : step === "config" ? (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() => setStep("advanced")}
                                >
                                    Advanced <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                                <Button
                                    size="sm"
                                    className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={handleCreate}
                                    disabled={creating || !form.containerName}
                                >
                                    {creating ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Zap className="w-3.5 h-3.5" />
                                    )}
                                    {creating ? "Creating..." : "Create"}
                                </Button>
                            </>
                        ) : step === "advanced" ? (
                            <Button
                                size="sm"
                                className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={handleCreate}
                                disabled={creating || !form.containerName}
                            >
                                {creating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Zap className="w-3.5 h-3.5" />
                                )}
                                {creating ? "Creating..." : "Create"}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Logs modal
// ──────────────────────────────────────────────
function LogsModal({ containerName, onClose }: { containerName: string; onClose: () => void }) {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    const fetch = async () => {
        setLoading(true);
        try {
            const l = await dockerService.getContainerLogs(containerName, 300);
            setLogs(l);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetch();
    }, [containerName]);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const colorLine = (line: string) => {
        const l = line.toLowerCase();
        if (l.includes("error") || l.includes("fatal")) return "text-red-400";
        if (l.includes("warn")) return "text-amber-400";
        if (l.includes("ready") || l.includes("started") || l.includes("success"))
            return "text-emerald-400";
        return "text-zinc-400";
    };

    const filtered = filter
        ? logs.filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
        : logs;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-zinc-950 border border-zinc-800 rounded-t-2xl w-full max-w-4xl shadow-2xl flex flex-col"
                style={{ height: "65vh" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <span
                                className="w-3 h-3 rounded-full bg-red-500/80 cursor-pointer"
                                onClick={onClose}
                            />
                            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                        </div>
                        <Terminal className="w-3.5 h-3.5 text-zinc-500 ml-2" />
                        <span className="font-mono text-sm text-zinc-300">{containerName}</span>
                        <span className="text-xs text-zinc-600">logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Filter..."
                            className="h-6 text-xs bg-zinc-800 border border-zinc-700 rounded px-2 text-zinc-300 placeholder:text-zinc-600 w-32 focus:outline-none"
                        />
                        <button
                            onClick={fetch}
                            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-px">
                    {loading ? (
                        <div className="flex items-center justify-center h-24 text-zinc-600">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Loading...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center text-zinc-600 py-12">No logs</div>
                    ) : (
                        filtered.map((line, i) => (
                            <div
                                key={i}
                                className={`flex gap-3 hover:bg-zinc-900/60 px-1 rounded ${colorLine(line)}`}
                            >
                                <span className="text-zinc-700 select-none w-7 text-right shrink-0">
                                    {i + 1}
                                </span>
                                <span className="break-all">{line}</span>
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Shell modal
// ──────────────────────────────────────────────
function ShellModal({ container, onClose }: { container: ContainerInfo; onClose: () => void }) {
    const [history, setHistory] = useState<Array<{ cmd: string; out: string; err: boolean }>>([]);
    const [input, setInput] = useState("");
    const [running, setRunning] = useState(false);
    const [cmdHist, setCmdHist] = useState<string[]>([]);
    const [histIdx, setHistIdx] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history]);
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const run = async () => {
        if (!input.trim() || running) return;
        const cmd = input.trim();
        setInput("");
        setRunning(true);
        setCmdHist((h) => [cmd, ...h.slice(0, 49)]);
        setHistIdx(-1);
        try {
            const out = await dockerService.execInContainer(container.name, cmd);
            setHistory((h) => [...h, { cmd, out, err: false }]);
        } catch (e: unknown) {
            setHistory((h) => [...h, { cmd, out: String(e), err: true }]);
        } finally {
            setRunning(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            run();
            return;
        }
        if (e.key === "ArrowUp") {
            const i = Math.min(histIdx + 1, cmdHist.length - 1);
            setHistIdx(i);
            setInput(cmdHist[i] ?? "");
            e.preventDefault();
        }
        if (e.key === "ArrowDown") {
            const i = Math.max(histIdx - 1, -1);
            setHistIdx(i);
            setInput(i === -1 ? "" : (cmdHist[i] ?? ""));
            e.preventDefault();
        }
    };

    const preset = getPresetForImage(container.image);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-zinc-950 border border-zinc-800 rounded-t-2xl w-full max-w-4xl shadow-2xl flex flex-col"
                style={{ height: "65vh" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <span
                                className="w-3 h-3 rounded-full bg-red-500/80 cursor-pointer"
                                onClick={onClose}
                            />
                            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                        </div>
                        {preset && <span className="ml-2 text-base">{preset.icon}</span>}
                        <Monitor className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-mono text-sm text-zinc-300">{container.name}</span>
                        <Badge
                            variant="outline"
                            className="text-[10px] border-emerald-500/30 text-emerald-500"
                        >
                            exec
                        </Badge>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-[12px]">
                    <div className="text-zinc-600 mb-4 text-[11px]">
                        Connected to <span className="text-emerald-400">{container.name}</span> (
                        {container.image}) — ↑↓ for history
                    </div>
                    {history.map((h, i) => (
                        <div key={i} className="mb-3">
                            <div className="flex gap-2">
                                <span className="text-emerald-400 shrink-0">❯</span>
                                <span className="text-zinc-200">{h.cmd}</span>
                            </div>
                            {h.out && (
                                <pre
                                    className={`pl-5 mt-0.5 text-[11px] whitespace-pre-wrap break-all ${h.err ? "text-red-400" : "text-zinc-400"}`}
                                >
                                    {h.out}
                                </pre>
                            )}
                        </div>
                    ))}
                    <div ref={endRef} />
                </div>
                <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-900/50 flex items-center gap-2">
                    <span className="text-emerald-400 font-mono text-sm shrink-0">❯</span>
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKey}
                        placeholder="Type a command..."
                        className="flex-1 bg-transparent font-mono text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none"
                        disabled={running}
                    />
                    {running && <Loader2 className="w-3.5 h-3.5 text-zinc-600 animate-spin" />}
                </div>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Database Card
// ──────────────────────────────────────────────
interface DBCardProps {
    container: ContainerInfo;
    onStart: (n: string) => Promise<void>;
    onStop: (n: string) => Promise<void>;
    onRestart: (n: string) => Promise<void>;
    onRemove: (n: string, v: boolean) => Promise<void>;
    onLogs: (n: string) => void;
    onShell: (c: ContainerInfo) => void;
}

function DatabaseCard({
    container,
    onStart,
    onStop,
    onRestart,
    onRemove,
    onLogs,
    onShell,
}: DBCardProps) {
    const [busy, setBusy] = useState<string | null>(null);
    const [showRemove, setShowRemove] = useState(false);
    const [copied, setCopied] = useState(false);

    const preset = getPresetForImage(container.image);
    const colors = stateColors(container.state);
    const isRunning = container.state === "running";
    const port = container.ports[0]?.host_port;

    const act = async (label: string, fn: () => Promise<unknown>) => {
        setBusy(label);
        try {
            await fn();
        } finally {
            setBusy(null);
        }
    };

    const copyPort = () => {
        if (!port) return;
        navigator.clipboard.writeText(String(port));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div
            className={cn(
                "rounded-2xl border bg-card p-4 flex flex-col gap-3 transition-shadow hover:shadow-md",
                colors.border
            )}
        >
            {/* Top row */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={
                            preset
                                ? {
                                      backgroundColor: preset.color + "18",
                                      border: `1px solid ${preset.color}28`,
                                  }
                                : {}
                        }
                    >
                        {preset?.icon ?? "🗄️"}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm leading-tight">
                                {container.name}
                            </span>
                            <span
                                className={cn(
                                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                                    colors.badge
                                )}
                            >
                                <span
                                    className={cn(
                                        "inline-block w-1.5 h-1.5 rounded-full mr-1",
                                        colors.dot
                                    )}
                                />
                                {container.state}
                            </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                            {container.image}
                        </span>
                    </div>
                </div>
            </div>

            {/* Port */}
            {port && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/40 border text-[11px]">
                    <Server className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">localhost:</span>
                    <span className="font-mono font-semibold">{port}</span>
                    <button onClick={copyPort} className="ml-auto p-0.5 rounded hover:bg-muted">
                        {copied ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                            <Copy className="w-3 h-3 text-muted-foreground" />
                        )}
                    </button>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-1">
                {isRunning ? (
                    <button
                        onClick={() => act("stop", () => onStop(container.name))}
                        disabled={!!busy}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 text-muted-foreground text-[11px] transition-colors disabled:opacity-40"
                    >
                        {busy === "stop" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Square className="w-3.5 h-3.5" />
                        )}
                        Stop
                    </button>
                ) : (
                    <button
                        onClick={() => act("start", () => onStart(container.name))}
                        disabled={!!busy}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 text-muted-foreground text-[11px] transition-colors disabled:opacity-40"
                    >
                        {busy === "start" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Play className="w-3.5 h-3.5" />
                        )}
                        Start
                    </button>
                )}
                <button
                    onClick={() => act("restart", () => onRestart(container.name))}
                    disabled={!!busy}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 text-muted-foreground text-[11px] transition-colors disabled:opacity-40"
                >
                    {busy === "restart" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Restart
                </button>
            </div>

            <div className="flex gap-1">
                <button
                    onClick={() => onLogs(container.name)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30 text-muted-foreground text-[11px] transition-colors"
                >
                    <Terminal className="w-3.5 h-3.5" />
                    Logs
                </button>
                {isRunning && (
                    <button
                        onClick={() => onShell(container)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border hover:bg-purple-500/10 hover:text-purple-600 hover:border-purple-500/30 text-muted-foreground text-[11px] transition-colors"
                    >
                        <Monitor className="w-3.5 h-3.5" />
                        Shell
                    </button>
                )}
                <button
                    onClick={() => setShowRemove((r) => !r)}
                    className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 text-muted-foreground text-[11px] transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {showRemove && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
                    <p className="text-xs font-medium text-red-600">Remove container?</p>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => {
                                setShowRemove(false);
                                act("remove", () => onRemove(container.name, false));
                            }}
                            className="flex-1 text-[11px] py-1.5 rounded-lg bg-red-500/20 text-red-600 hover:bg-red-500/30 transition-colors"
                        >
                            Keep data
                        </button>
                        <button
                            onClick={() => {
                                setShowRemove(false);
                                act("remove", () => onRemove(container.name, true));
                            }}
                            className="flex-1 text-[11px] py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                            Delete all
                        </button>
                    </div>
                    <button
                        onClick={() => setShowRemove(false)}
                        className="w-full text-[11px] text-muted-foreground"
                    >
                        Cancel
                    </button>
                </div>
            )}

            <div className="text-[10px] text-muted-foreground font-mono">
                {container.id.slice(0, 12)}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────
export default function DockerDatabaseManagerPage() {
    const {
        dockerInfo,
        containers,
        refreshing,
        refresh,
        createContainer,
        startContainer,
        stopContainer,
        restartContainer,
        removeContainer,
    } = useDocker();

    const [showWizard, setShowWizard] = useState(false);
    const [logsName, setLogsName] = useState<string | null>(null);
    const [shellContainer, setShellContainer] = useState<ContainerInfo | null>(null);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    if (!dockerInfo) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!dockerInfo.installed || !dockerInfo.daemon_running) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <WifiOff className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h2 className="text-lg font-semibold mb-2">Docker not available</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    {!dockerInfo.installed
                        ? "Docker is not installed."
                        : "Docker daemon is not running."}
                </p>
                <Button size="sm" onClick={refresh} className="gap-2">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                </Button>
            </div>
        );
    }

    const dbCategories = Array.from(
        new Set(containers.map((c) => getPresetForImage(c.image)?.category).filter(Boolean))
    );

    const filtered = containers.filter((c) => {
        const matchSearch =
            !search ||
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.image.toLowerCase().includes(search.toLowerCase());
        if (!matchSearch) return false;
        if (categoryFilter !== "all") {
            const p = getPresetForImage(c.image);
            return p?.category === categoryFilter;
        }
        return true;
    });

    const dbRunning = containers.filter((c) => c.state === "running").length;

    return (
        <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Database className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Database containers</h1>
                        <p className="text-[12px] text-muted-foreground">
                            {dbRunning} running · {containers.length - dbRunning} stopped · Docker{" "}
                            {dockerInfo.version}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8"
                        onClick={refresh}
                        disabled={refreshing}
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        className="gap-1.5 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setShowWizard(true)}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New database
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    {
                        icon: <Activity className="w-4 h-4 text-emerald-500" />,
                        label: "Running",
                        value: dbRunning,
                        color: "border-emerald-500/20 bg-emerald-500/5",
                    },
                    {
                        icon: <Database className="w-4 h-4 text-blue-500" />,
                        label: "Total",
                        value: containers.length,
                        color: "border-blue-500/20 bg-blue-500/5",
                    },
                    {
                        icon: <HardDrive className="w-4 h-4 text-purple-500" />,
                        label: "Volumes",
                        value: containers.length,
                        color: "border-purple-500/20 bg-purple-500/5",
                    },
                    {
                        icon: <Layers className="w-4 h-4 text-amber-500" />,
                        label: "Compose",
                        value: dockerInfo.compose_available ? "Ready" : "N/A",
                        color: "border-amber-500/20 bg-amber-500/5",
                    },
                ].map((s, i) => (
                    <div key={i} className={cn("rounded-xl border p-4", s.color)}>
                        <div className="flex items-center gap-2 mb-2">
                            {s.icon}
                            <span className="text-xs text-muted-foreground">{s.label}</span>
                        </div>
                        <div className="text-xl font-bold font-mono">{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search containers..."
                        className="pl-8 h-8 text-xs"
                    />
                </div>
                {containers.length > 0 && (
                    <div className="flex gap-1.5">
                        {["all", ...dbCategories].map((cat) => (
                            <button
                                key={cat ?? "all"}
                                onClick={() => setCategoryFilter(cat ?? "all")}
                                className={cn(
                                    "px-2.5 py-1 text-[11px] rounded-full border transition-colors",
                                    categoryFilter === (cat ?? "all")
                                        ? "bg-foreground text-background border-foreground"
                                        : "border-border text-muted-foreground hover:border-foreground/40"
                                )}
                            >
                                {cat === "all" ? "All" : (DB_CATEGORY_LABELS[cat ?? ""] ?? cat)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed">
                    <Database className="w-12 h-12 text-muted-foreground/20 mb-4" />
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                        {containers.length === 0
                            ? "No database containers"
                            : "No matching containers"}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mb-6 max-w-xs text-center">
                        {containers.length === 0
                            ? "Create your first database container — MySQL, PostgreSQL, MongoDB, Redis and more."
                            : "Try a different search or filter."}
                    </p>
                    {containers.length === 0 && (
                        <Button
                            size="sm"
                            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => setShowWizard(true)}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Create first database
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((c) => (
                        <DatabaseCard
                            key={c.id}
                            container={c}
                            onStart={startContainer}
                            onStop={stopContainer}
                            onRestart={restartContainer}
                            onRemove={removeContainer}
                            onLogs={setLogsName}
                            onShell={setShellContainer}
                        />
                    ))}
                </div>
            )}

            {showWizard && (
                <CreateDatabaseWizard
                    onClose={() => setShowWizard(false)}
                    onCreate={async (req) => {
                        const result = await createContainer(req);
                        if (result.success) setTimeout(() => setShowWizard(false), 2000);
                        return result;
                    }}
                />
            )}
            {logsName && <LogsModal containerName={logsName} onClose={() => setLogsName(null)} />}
            {shellContainer && (
                <ShellModal container={shellContainer} onClose={() => setShellContainer(null)} />
            )}
        </div>
    );
}
