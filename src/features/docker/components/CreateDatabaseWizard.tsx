import { Check, ChevronLeft, ChevronRight, Copy, Database, Eye, EyeOff, Info, Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateContainerResult, CreateDatabaseContainerRequest, DBPreset } from "../services/types";
import { DB_PRESETS } from "../services/config/dbPresets";

interface Props {
    onClose: () => void;
    onCreate: (req: CreateDatabaseContainerRequest) => Promise<CreateContainerResult>;
}

type Step = "type" | "config" | "advanced" | "result";

function generatePassword(len = 16) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">{label}</label>
            {children}
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
    );
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
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
                onClick={() => setShow(!show)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
                {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
        </div>
    );
}

export function CreateDatabaseWizard({ onClose, onCreate }: Props) {
    const [step, setStep] = useState<Step>("type");
    const [selectedPreset, setSelectedPreset] = useState<DBPreset | null>(null);
    const [creating, setCreating] = useState(false);
    const [result, setResult] = useState<CreateContainerResult | null>(null);
    const [copied, setCopied] = useState(false);

    const [form, setForm] = useState({
        version: "",
        containerName: "",
        hostPort: 0,
        rootPassword: generatePassword(),
        databaseName: "",
        username: "",
        password: generatePassword(),
        memoryLimit: "512m",
        restartPolicy: "unless-stopped",
    });

    const set = useCallback((k: keyof typeof form, v: string | number) =>
        setForm((prev) => ({ ...prev, [k]: v })), []);

    const selectPreset = (preset: DBPreset) => {
        setSelectedPreset(preset);
        setForm((prev) => ({
            ...prev,
            version: preset.defaultVersion,
            hostPort: preset.defaultPort,
            containerName: `hive-${preset.id}`,
            databaseName: `hive_db`,
            username: `hive_user`,
        }));
        setStep("config");
    };

    const handleCreate = async () => {
        if (!selectedPreset) return;
        setCreating(true);
        try {
            const req: CreateDatabaseContainerRequest = {
                db_type: selectedPreset.id,
                container_name: form.containerName,
                version: form.version,
                host_port: Number(form.hostPort),
                root_password: form.rootPassword,
                database_name: form.databaseName,
                username: form.username,
                password: form.password,
                data_volume: null,
                memory_limit: form.memoryLimit || null,
                cpu_limit: null,
                restart_policy: form.restartPolicy,
            };
            const res = await onCreate(req);
            setResult(res);
            setStep("result");
        } finally {
            setCreating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold text-sm">New Database Container</span>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-1 px-5 py-3 border-b bg-muted/10">
                    {(["type", "config", "advanced", "result"] as Step[]).map((s, i) => {
                        const labels = ["Select Type", "Configure", "Advanced", "Done"];
                        const active = s === step;
                        const done = (["type","config","config","advanced","result"].indexOf(step) ?? 0) > i;
                        return (
                            <div key={s} className="flex items-center gap-1 flex-1">
                                <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors ${active ? "bg-blue-500/15 text-blue-500" : done ? "text-emerald-500" : "text-muted-foreground"}`}>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? "bg-blue-500 text-white" : done ? "bg-emerald-500 text-white" : "bg-muted"}`}>
                                        {done ? <Check className="w-2.5 h-2.5" /> : i + 1}
                                    </span>
                                    {labels[i]}
                                </div>
                                {i < 3 && <div className="flex-1 h-px bg-border" />}
                            </div>
                        );
                    })}
                </div>

                <div className="p-5 max-h-[60vh] overflow-y-auto">
                    {step === "type" && (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground mb-4">Choose which database engine to run in Docker.</p>
                            <div className="grid grid-cols-1 gap-2">
                                {DB_PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => selectPreset(preset)}
                                        className="flex items-center gap-3 p-3.5 rounded-xl border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left group"
                                    >
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                                            style={{ backgroundColor: preset.color + "20", border: `1px solid ${preset.color}30` }}
                                        >
                                            {preset.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">{preset.label}</span>
                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                    v{preset.defaultVersion}
                                                </Badge>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                                Default port: {preset.defaultPort}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === "config" && selectedPreset && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border text-xs">
                                <span className="text-xl">{selectedPreset.icon}</span>
                                <span className="font-medium">{selectedPreset.label}</span>
                                <span className="text-muted-foreground ml-auto">Docker container</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Container Name">
                                    <Input
                                        value={form.containerName}
                                        onChange={(e) => set("containerName", e.target.value)}
                                        className="h-8 text-xs font-mono"
                                        placeholder="hive-mysql"
                                    />
                                </Field>
                                <Field label="Version">
                                    <select
                                        value={form.version}
                                        onChange={(e) => set("version", e.target.value)}
                                        className="w-full h-8 text-xs border rounded-md bg-background px-2 font-mono"
                                    >
                                        {selectedPreset.versions.map((v) => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            <Field label="Host Port" hint={`Default for ${selectedPreset.label}: ${selectedPreset.defaultPort}`}>
                                <Input
                                    type="number"
                                    value={form.hostPort}
                                    onChange={(e) => set("hostPort", e.target.value)}
                                    className="h-8 text-xs font-mono"
                                />
                            </Field>

                            {selectedPreset.hasDatabase && (
                                <Field label="Database Name">
                                    <Input
                                        value={form.databaseName}
                                        onChange={(e) => set("databaseName", e.target.value)}
                                        className="h-8 text-xs font-mono"
                                        placeholder="my_database"
                                    />
                                </Field>
                            )}

                            {selectedPreset.hasUser && (
                                <Field label="Username">
                                    <Input
                                        value={form.username}
                                        onChange={(e) => set("username", e.target.value)}
                                        className="h-8 text-xs font-mono"
                                        placeholder="db_user"
                                    />
                                </Field>
                            )}

                            {selectedPreset.hasPassword && (
                                <Field
                                    label={selectedPreset.hasUser ? "User Password" : "Password"}
                                >
                                    <div className="flex gap-2">
                                        <PasswordInput
                                            value={form.password}
                                            onChange={(v) => set("password", v)}
                                            placeholder="••••••••"
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
                                </Field>
                            )}

                            {selectedPreset.hasRootPassword && (
                                <Field label="Root Password">
                                    <div className="flex gap-2">
                                        <PasswordInput
                                            value={form.rootPassword}
                                            onChange={(v) => set("rootPassword", v)}
                                            placeholder="••••••••"
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
                                </Field>
                            )}
                        </div>
                    )}

                    {step === "advanced" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-600">
                                <Info className="w-4 h-4 shrink-0" />
                                These settings are optional. Defaults work fine for most use cases.
                            </div>

                            <Field label="Memory Limit" hint="e.g. 512m, 1g, 2g">
                                <Input
                                    value={form.memoryLimit}
                                    onChange={(e) => set("memoryLimit", e.target.value)}
                                    className="h-8 text-xs font-mono"
                                    placeholder="512m"
                                />
                            </Field>

                            <Field label="Restart Policy">
                                <select
                                    value={form.restartPolicy}
                                    onChange={(e) => set("restartPolicy", e.target.value)}
                                    className="w-full h-8 text-xs border rounded-md bg-background px-2"
                                >
                                    <option value="unless-stopped">unless-stopped (recommended)</option>
                                    <option value="always">always</option>
                                    <option value="on-failure">on-failure</option>
                                    <option value="no">no</option>
                                </select>
                            </Field>

                            <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
                                <p className="text-xs font-medium">Data Volume</p>
                                <p className="text-[11px] text-muted-foreground">
                                    A named volume <code className="font-mono bg-muted px-1 rounded">hive_{form.containerName}_data</code> will be created automatically to persist your data.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === "result" && result && (
                        <div className="space-y-4">
                            {result.success ? (
                                <>
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-emerald-600">Container Created!</p>
                                            <p className="text-[11px] text-muted-foreground">{result.container_name} is running</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Connection Details</p>
                                        {[
                                            { label: "Host", value: "localhost" },
                                            { label: "Port", value: String(result.port) },
                                            ...(result.database ? [{ label: "Database", value: result.database }] : []),
                                            ...(result.username ? [{ label: "Username", value: result.username }] : []),
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                                                <span className="text-[11px] text-muted-foreground">{label}</span>
                                                <span className="text-xs font-mono font-medium">{value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {result.connection_string && (
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Connection String</p>
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-black/30 border font-mono text-[11px] break-all">
                                                <span className="flex-1 text-emerald-400">{result.connection_string}</span>
                                                <button
                                                    onClick={() => copyToClipboard(result.connection_string!)}
                                                    className="p-1 rounded hover:bg-muted transition-colors shrink-0"
                                                >
                                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-500">Failed to create container</p>
                                        <p className="text-[11px] text-muted-foreground mt-1 font-mono">{result.error}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between px-5 py-4 border-t bg-muted/10">
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
                            <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
                                Cancel
                            </Button>
                        ) : step === "config" ? (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => setStep("advanced")}
                            >
                                Advanced
                                <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                        ) : null}

                        {(step === "config" || step === "advanced") && (
                            <Button
                                size="sm"
                                className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={handleCreate}
                                disabled={creating || !form.containerName}
                            >
                                {creating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Database className="w-3.5 h-3.5" />
                                )}
                                {creating ? "Creating..." : "Create Container"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}