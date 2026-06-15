import { useState } from "react";

import { CheckCircle2, ChevronRight, Globe } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";

type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
type Template = "javascript" | "typescript" | "cra-template" | "cra-template-pwa" | "custom";

interface FormData {
    name: string;
    description: string;
    host: string;
    port: number;
    packageManager: PackageManager;
    template: Template;
    customTemplate: string;
}

const PACKAGE_MANAGERS: { id: PackageManager; name: string; icon: string }[] = [
    { id: "npm", name: "npm", icon: "📦" },
    { id: "yarn", name: "Yarn", icon: "🧶" },
    { id: "pnpm", name: "pnpm", icon: "⚡" },
    { id: "bun", name: "Bun", icon: "🍞" },
];

const TEMPLATES: { id: Template; name: string; description: string }[] = [
    { id: "javascript", name: "JavaScript", description: "Standard JavaScript template" },
    { id: "typescript", name: "TypeScript", description: "TypeScript template with type safety" },
    { id: "cra-template", name: "Custom CRA Template", description: "Use a custom cra-template" },
    { id: "cra-template-pwa", name: "PWA Template", description: "Progressive Web App template" },
    { id: "custom", name: "Custom", description: "Use a custom template from npm/GitHub" },
];

export function CreateReactProject({ onSuccess }: { onSuccess: (project: any) => void }) {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        host: "localhost",
        port: 3000,
        packageManager: "npm",
        template: "javascript",
        customTemplate: "",
    });

    const update = (patch: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...patch }));
    const goNext = () => setStep((s) => s + 1);
    const goBack = () => setStep((s) => s - 1);

    const getCreateCommand = () => {
        const base =
            formData.packageManager === "npm"
                ? `npx create-react-app@latest ${formData.name}`
                : formData.packageManager === "yarn"
                  ? `yarn create react-app ${formData.name}`
                  : formData.packageManager === "pnpm"
                    ? `pnpm create react-app ${formData.name}`
                    : `bun create react-app ${formData.name}`;

        let template = "";
        if (formData.template === "typescript") {
            template = " --template typescript";
        } else if (formData.template === "cra-template-pwa") {
            template = " --template cra-template-pwa";
        } else if (formData.template === "cra-template" && formData.customTemplate) {
            template = ` --template ${formData.customTemplate}`;
        } else if (formData.template === "custom" && formData.customTemplate) {
            template = ` --template ${formData.customTemplate}`;
        }

        return base + template;
    };

    const handleCreate = () => {
        onSuccess({
            name: formData.name,
            type: "react",
            path: `~/Projects/${formData.name}`,
            description:
                formData.description ||
                `React app with ${formData.template === "typescript" ? "TypeScript" : "JavaScript"}`,
            config: {
                port: formData.port,
                host: formData.host,
                packageManager: formData.packageManager,
            },
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-1">
                {["Name", "Config", "Template", "Install"].map((label, i) => {
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
                            placeholder="my-react-app"
                            value={formData.name}
                            onChange={(e) =>
                                update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                            }
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && formData.name && goNext()}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Will be created at ~/Projects/{formData.name || "my-react-app"}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm">Description (optional)</Label>
                        <Textarea
                            placeholder="A brief description of your React project"
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

            {/* Step 1: Configuration (Host & Port & Package Manager) */}
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

            {/* Step 2: Template Selection */}
            {step === 2 && (
                <div className="space-y-4">
                    <Label className="text-sm">Template</Label>
                    <div className="space-y-2">
                        {TEMPLATES.map((tmpl) => (
                            <button
                                key={tmpl.id}
                                onClick={() =>
                                    update({
                                        template: tmpl.id,
                                        customTemplate:
                                            tmpl.id === "custom" ? "" : formData.customTemplate,
                                    })
                                }
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                                    formData.template === tmpl.id
                                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted">
                                    {tmpl.id === "typescript"
                                        ? "📘"
                                        : tmpl.id === "cra-template-pwa"
                                          ? "📱"
                                          : "📄"}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium">{tmpl.name}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                        {tmpl.description}
                                    </div>
                                </div>
                                {formData.template === tmpl.id && (
                                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    {(formData.template === "cra-template" || formData.template === "custom") && (
                        <div className="space-y-1.5">
                            <Label className="text-xs">Template Package Name</Label>
                            <Input
                                value={formData.customTemplate}
                                onChange={(e) => update({ customTemplate: e.target.value })}
                                placeholder="cra-template-my-template or user/repo"
                                className="font-mono text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Enter an npm package name or GitHub repository
                            </p>
                        </div>
                    )}

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
                            disabled={
                                (formData.template === "cra-template" ||
                                    formData.template === "custom") &&
                                !formData.customTemplate
                            }
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
                                <span className="text-muted-foreground">Template:</span>
                                <span className="font-mono text-foreground">
                                    {formData.template === "typescript"
                                        ? "TypeScript"
                                        : formData.template === "cra-template-pwa"
                                          ? "PWA"
                                          : formData.template === "custom"
                                            ? formData.customTemplate
                                            : "JavaScript"}
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
                            Create React App
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
