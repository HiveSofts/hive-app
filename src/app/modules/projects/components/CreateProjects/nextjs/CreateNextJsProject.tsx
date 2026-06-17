import { useState } from "react";

import { CheckCircle2, ChevronRight, Globe } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea.tsx";
import { cn } from "@/core/lib/utils";

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

const PACKAGE_MANAGERS: { id: PackageManager; name: string; icon: string }[] = [
    { id: "npm", name: "npm", icon: "📦" },
    { id: "yarn", name: "Yarn", icon: "🧶" },
    { id: "pnpm", name: "pnpm", icon: "⚡" },
    { id: "bun", name: "Bun", icon: "🍞" },
];

export function CreateNextJsProject({ onSuccess }: { onSuccess: (project: any) => void }) {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        host: "localhost",
        port: 3000,
        packageManager: "pnpm",
        typescript: true,
        tailwind: true,
        reactCompiler: false,
        srcDir: false,
        appRouter: true,
        linter: "eslint",
        importAlias: "@/*",
    });

    const update = (patch: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...patch }));
    const goNext = () => setStep((s) => s + 1);
    const goBack = () => setStep((s) => s - 1);

    const getCreateCommand = () => {
        let cmd = `${formData.packageManager} create next-app@latest ${formData.name}`;
        if (!formData.typescript) cmd += " --js";
        if (!formData.tailwind) cmd += " --no-tailwind";
        if (formData.reactCompiler) cmd += " --react-compiler";
        if (formData.srcDir) cmd += " --src-dir";
        if (!formData.appRouter) cmd += " --no-app";
        if (formData.linter === "biome") cmd += " --biome";
        if (formData.linter === "none") cmd += " --no-linter";
        if (formData.importAlias !== "@/*") cmd += ` --import-alias ${formData.importAlias}`;
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
        onSuccess({
            name: formData.name,
            type: "nextjs",
            path: `~/Projects/${formData.name}`,
            description:
                formData.description ||
                `Next.js project${formData.typescript ? " with TypeScript" : ""}${formData.tailwind ? " + Tailwind" : ""}`,
            config: {
                port: formData.port,
                host: formData.host,
                packageManager: formData.packageManager,
                features: {
                    typescript: formData.typescript,
                    tailwind: formData.tailwind,
                    reactCompiler: formData.reactCompiler,
                    srcDir: formData.srcDir,
                    appRouter: formData.appRouter,
                    linter: formData.linter,
                },
            },
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-1">
                {["Name", "Config", "Features", "Install"].map((label, i) => {
                    const active = i === step;
                    const done = i < step;
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

            {/* Step 0: Project Name & Description */}
            {step === 0 && (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm">Project Name</Label>
                        <Input
                            autoFocus
                            placeholder="my-next-app"
                            value={formData.name}
                            onChange={(e) =>
                                update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                            }
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && formData.name && goNext()}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Will be created at ~/Projects/{formData.name || "my-next-app"}
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

            {/* Step 1: Configuration */}
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

            {/* Step 2: Features Selection */}
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
                            onClick={goNext}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                        >
                            Continue <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Summary & Install */}
            {step === 3 && (
                <div className="space-y-4">
                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4">
                        <p className="text-[10px] text-zinc-500 mb-2 font-mono uppercase tracking-wider">
                            Summary
                        </p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-mono text-foreground">{formData.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">URL:</span>
                                <span className="font-mono text-foreground">
                                    {formData.host}:{formData.port}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Package Manager:</span>
                                <span className="font-mono text-foreground">
                                    {formData.packageManager}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Linter:</span>
                                <span className="font-mono text-foreground">{formData.linter}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">TypeScript:</span>
                                <span
                                    className={
                                        formData.typescript
                                            ? "text-emerald-500"
                                            : "text-muted-foreground"
                                    }
                                >
                                    {formData.typescript ? "Yes" : "No"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tailwind CSS:</span>
                                <span
                                    className={
                                        formData.tailwind
                                            ? "text-emerald-500"
                                            : "text-muted-foreground"
                                    }
                                >
                                    {formData.tailwind ? "Yes" : "No"}
                                </span>
                            </div>
                            {formData.description && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Description:</span>
                                    <span className="text-foreground text-right max-w-[200px]">
                                        {formData.description}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={goBack}>
                            Back
                        </Button>
                        <Button
                            onClick={handleCreate}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <Globe className="w-4 h-4" />
                            Create Next.js App
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
