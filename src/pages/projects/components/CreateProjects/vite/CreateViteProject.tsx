import { useState } from "react";

import { FaJs } from "@react-icons/all-files/fa/FaJs";
import { FaReact } from "@react-icons/all-files/fa/FaReact";
import { FaVuejs } from "@react-icons/all-files/fa/FaVuejs";
import { GiSolidLeaf } from "@react-icons/all-files/gi/GiSolidLeaf";
import { IoLogoReact } from "@react-icons/all-files/io5/IoLogoReact";
import { SiLitecoin } from "@react-icons/all-files/si/SiLitecoin";
import { SiQwiklabs } from "@react-icons/all-files/si/SiQwiklabs";
import { SiSvelte } from "@react-icons/all-files/si/SiSvelte";
import { IconBrandTypescript } from "@tabler/icons-react";
import { CheckCircle2, ChevronRight, Globe } from "lucide-react";

import { ViteIcon } from "@/components/icons";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";

type Framework = "vanilla" | "vue" | "react" | "preact" | "lit" | "svelte" | "solid" | "qwik";
type Variant = "typescript" | "javascript";

interface FormData {
    name: string;
    description: string;
    host: string;
    port: number;
    framework: Framework;
    variant: Variant;
    installNow: boolean;
}

const FRAMEWORKS: { id: Framework; name: string; icon: React.ReactNode }[] = [
    { id: "react", name: "React", icon: <FaReact className="w-5 h-5 text-cyan-500" /> },
    { id: "vue", name: "Vue", icon: <FaVuejs className="w-5 h-5 text-emerald-500" /> },
    { id: "vanilla", name: "Vanilla", icon: <ViteIcon className="w-5 h-5 text-purple-500" /> },
    { id: "svelte", name: "Svelte", icon: <SiSvelte className="w-5 h-5 text-orange-500" /> },
    { id: "preact", name: "Preact", icon: <IoLogoReact className="w-5 h-5 text-cyan-400" /> },
    { id: "lit", name: "Lit", icon: <SiLitecoin className="w-5 h-5 text-blue-500" /> },
    { id: "solid", name: "Solid", icon: <GiSolidLeaf className="w-5 h-5 text-blue-600" /> },
    { id: "qwik", name: "Qwik", icon: <SiQwiklabs className="w-5 h-5 text-amber-500" /> },
];

export function CreateViteProject({ onSuccess }: { onSuccess: (project: any) => void }) {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        host: "localhost",
        port: 5173,
        framework: "react",
        variant: "typescript",
        installNow: true,
    });

    const update = (patch: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...patch }));
    const goNext = () => setStep((s) => s + 1);
    const goBack = () => setStep((s) => s - 1);

    const getCreateCommand = () => {
        const template =
            `${formData.framework}-${formData.variant === "typescript" ? "ts" : ""}`.replace(
                /-$/,
                ""
            );
        return `bun create vite@latest ${formData.name} --template ${template}`;
    };

    const handleCreate = () => {
        onSuccess({
            name: formData.name,
            type: "vite",
            path: `~/Projects/${formData.name}`,
            description:
                formData.description ||
                `Vite + ${FRAMEWORKS.find((f) => f.id === formData.framework)?.name}${formData.variant === "typescript" ? " + TypeScript" : ""}`,
            config: {
                port: formData.port,
                host: formData.host,
                framework: formData.framework,
                variant: formData.variant,
            },
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-1">
                {["Name", "Framework", "Config", "Install"].map((label, i) => {
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

            {step === 0 && (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm">Project Name</Label>
                        <Input
                            autoFocus
                            placeholder="my-vite-app"
                            value={formData.name}
                            onChange={(e) =>
                                update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                            }
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && formData.name && goNext()}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Will be created at ~/Projects/{formData.name || "my-vite-app"}
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
                        <Label className="text-sm">Variant</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => update({ variant: "typescript" })}
                                className={cn(
                                    "flex items-center justify-center gap-2 p-2 rounded-lg border transition-all",
                                    formData.variant === "typescript"
                                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                <IconBrandTypescript className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium">TypeScript</span>
                            </button>
                            <button
                                onClick={() => update({ variant: "javascript" })}
                                className={cn(
                                    "flex items-center justify-center gap-2 p-2 rounded-lg border transition-all",
                                    formData.variant === "javascript"
                                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                <FaJs className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-medium">JavaScript</span>
                            </button>
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
                                <span className="text-muted-foreground">Framework:</span>
                                <span className="font-mono text-foreground">
                                    {FRAMEWORKS.find((f) => f.id === formData.framework)?.name}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Variant:</span>
                                <span className="font-mono text-foreground">
                                    {formData.variant === "typescript"
                                        ? "TypeScript"
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
                            Create Vite App
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
