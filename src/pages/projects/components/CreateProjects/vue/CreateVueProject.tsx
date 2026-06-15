import { useState } from "react";

import { CheckCircle2, ChevronRight, Globe } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";

type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

interface FormData {
    name: string;
    description: string;
    host: string;
    port: number;
    packageManager: PackageManager;
    typescript: boolean;
    jsx: boolean;
    vueRouter: boolean;
    pinia: boolean;
    vitest: boolean;
    eslint: boolean;
    prettier: boolean;
    vueDevTools: boolean;
}

const PACKAGE_MANAGERS: { id: PackageManager; name: string; icon: string }[] = [
    { id: "npm", name: "npm", icon: "📦" },
    { id: "yarn", name: "Yarn", icon: "🧶" },
    { id: "pnpm", name: "pnpm", icon: "⚡" },
    { id: "bun", name: "Bun", icon: "🍞" },
];

export function CreateVueProject({ onSuccess }: { onSuccess: (project: any) => void }) {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        host: "localhost",
        port: 5173,
        packageManager: "npm",
        typescript: false,
        jsx: false,
        vueRouter: false,
        pinia: false,
        vitest: false,
        eslint: false,
        prettier: false,
        vueDevTools: false,
    });

    const update = (patch: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...patch }));
    const goNext = () => setStep((s) => s + 1);
    const goBack = () => setStep((s) => s - 1);

    const getCreateCommand = () => {
        let cmd = `${formData.packageManager} create vue@latest ${formData.name} --`;
        if (formData.typescript) cmd += " --typescript";
        if (formData.jsx) cmd += " --jsx";
        if (formData.vueRouter) cmd += " --router";
        if (formData.pinia) cmd += " --pinia";
        if (formData.vitest) cmd += " --vitest";
        if (formData.eslint) cmd += " --eslint";
        if (formData.prettier) cmd += " --prettier";
        if (formData.vueDevTools) cmd += " --devtools";
        return cmd;
    };

    const selectedFeaturesCount = [
        formData.typescript,
        formData.jsx,
        formData.vueRouter,
        formData.pinia,
        formData.vitest,
        formData.eslint,
        formData.prettier,
        formData.vueDevTools,
    ].filter(Boolean).length;

    const handleCreate = () => {
        onSuccess({
            name: formData.name,
            type: "vue",
            path: `~/Projects/${formData.name}`,
            description:
                formData.description ||
                `Vue 3 project${formData.typescript ? " with TypeScript" : ""}`,
            config: {
                port: formData.port,
                host: formData.host,
                packageManager: formData.packageManager,
                features: {
                    typescript: formData.typescript,
                    jsx: formData.jsx,
                    router: formData.vueRouter,
                    pinia: formData.pinia,
                    vitest: formData.vitest,
                    eslint: formData.eslint,
                    prettier: formData.prettier,
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
                            placeholder="my-vue-app"
                            value={formData.name}
                            onChange={(e) =>
                                update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                            }
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && formData.name && goNext()}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Will be created at ~/Projects/{formData.name || "my-vue-app"}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm">Description (optional)</Label>
                        <Textarea
                            placeholder="A brief description of your Vue project"
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
                                placeholder="5173"
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
                                    Add TypeScript support
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
                            onClick={() => update({ jsx: !formData.jsx })}
                        >
                            <div>
                                <div className="text-sm font-medium">JSX Support</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Add JSX support
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.jsx
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.jsx && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ vueRouter: !formData.vueRouter })}
                        >
                            <div>
                                <div className="text-sm font-medium">Vue Router</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Add Vue Router for SPA development
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.vueRouter
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.vueRouter && (
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                )}
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ pinia: !formData.pinia })}
                        >
                            <div>
                                <div className="text-sm font-medium">Pinia</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Add Pinia for state management
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.pinia
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.pinia && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ vitest: !formData.vitest })}
                        >
                            <div>
                                <div className="text-sm font-medium">Vitest</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Add Vitest for unit testing
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.vitest
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.vitest && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ eslint: !formData.eslint })}
                        >
                            <div>
                                <div className="text-sm font-medium">ESLint</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Add ESLint for code quality
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.eslint
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.eslint && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ prettier: !formData.prettier })}
                        >
                            <div>
                                <div className="text-sm font-medium">Prettier</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Add Prettier for code formatting
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.prettier
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.prettier && (
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                )}
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ vueDevTools: !formData.vueDevTools })}
                        >
                            <div>
                                <div className="text-sm font-medium">Vue DevTools</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Add Vue DevTools 7 extension for debugging
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                                    formData.vueDevTools
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.vueDevTools && (
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                )}
                            </div>
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
                            Create Vue App
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
