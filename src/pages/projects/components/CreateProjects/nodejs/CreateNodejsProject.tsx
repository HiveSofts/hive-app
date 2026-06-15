import { useState } from "react";

import { FaNodeJs } from "@react-icons/all-files/fa/FaNodeJs";
import { FaNpm } from "@react-icons/all-files/fa/FaNpm";
import { FaYarn } from "@react-icons/all-files/fa/FaYarn";
import { ExpressionlessCircle } from "@solar-icons/react";
import { open } from "@tauri-apps/plugin-dialog";
import { CheckCircle2, ChevronRight, FolderOpen, Globe } from "lucide-react";

import { FastApiIcon } from "@/components/icons";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";

type Framework = "express" | "fastify" | "koa" | "nestjs" | "nuxt" | "next" | "plain";
type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
type License = "MIT" | "Apache-2.0" | "GPL-3.0" | "ISC" | "BSD-3-Clause" | "UNLICENSED";

interface FormData {
    name: string;
    description: string;
    host: string;
    port: number;
    framework: Framework;
    packageManager: PackageManager;
    authorName: string;
    authorEmail: string;
    license: License;
    gitInit: boolean;
    entryPoint: string;
    installDeps: boolean;
}

const FRAMEWORKS: { id: Framework; name: string; icon: React.ReactNode; defaultPort: number }[] = [
    {
        id: "express",
        name: "Express.js",
        icon: <ExpressionlessCircle className="w-5 h-5" />,
        defaultPort: 3000,
    },
    {
        id: "fastify",
        name: "Fastify",
        icon: <FastApiIcon className="w-5 h-5 text-teal-500" />,
        defaultPort: 3000,
    },
    {
        id: "koa",
        name: "Koa",
        icon: <ExpressionlessCircle className="w-5 h-5 text-green-500" />,
        defaultPort: 3000,
    },
    {
        id: "plain",
        name: "Plain Node.js",
        icon: <FaNodeJs className="w-5 h-5 text-green-600" />,
        defaultPort: 3000,
    },
];

const PACKAGE_MANAGERS: { id: PackageManager; name: string; icon: React.ReactNode }[] = [
    { id: "npm", name: "npm", icon: <FaNpm className="w-4 h-4 text-red-500" /> },
    { id: "yarn", name: "Yarn", icon: <FaYarn className="w-4 h-4 text-blue-500" /> },
    { id: "pnpm", name: "pnpm", icon: <span className="text-sm">⚡</span> },
    { id: "bun", name: "Bun", icon: <span className="text-sm">🍞</span> },
];

const LICENSES: { id: License; name: string }[] = [
    { id: "MIT", name: "MIT" },
    { id: "Apache-2.0", name: "Apache 2.0" },
    { id: "GPL-3.0", name: "GPL 3.0" },
    { id: "ISC", name: "ISC" },
    { id: "BSD-3-Clause", name: "BSD 3-Clause" },
    { id: "UNLICENSED", name: "UNLICENSED" },
];

const selectFolder = async (setPath: (path: string) => void) => {
    const selected = await open({ directory: true, multiple: false, title: "Select Folder" });
    if (selected) setPath(selected as string);
};

export function CreateNodejsProject({ onSuccess }: { onSuccess: (project: any) => void }) {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        host: "localhost",
        port: 3000,
        framework: "express",
        packageManager: "npm",
        authorName: "",
        authorEmail: "",
        license: "MIT",
        gitInit: true,
        entryPoint: "index.js",
        installDeps: true,
    });

    const update = (patch: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...patch }));
    const goNext = () => setStep((s) => s + 1);
    const goBack = () => setStep((s) => s - 1);

    const getCreateCommand = () => {
        const pm = formData.packageManager;
        const name = formData.name;

        if (formData.framework === "express") {
            return `${pm} init -y && ${pm} install express`;
        } else if (formData.framework === "fastify") {
            return `${pm} init -y && ${pm} install fastify`;
        } else if (formData.framework === "koa") {
            return `${pm} init -y && ${pm} install koa koa-router`;
        } else if (formData.framework === "next") {
            return `${pm} create next-app@latest ${name}`;
        }
        return `${pm} init -y`;
    };

    const getPackageJson = () => {
        return `{
  "name": "${formData.name}",
  "version": "1.0.0",
  "description": "${formData.description || "A Node.js project"}",
  "main": "${formData.entryPoint}",
  "scripts": {
    "start": "node ${formData.entryPoint}",
    "dev": "nodemon ${formData.entryPoint}"
  },
  "keywords": [],
  "author": "${formData.authorName} <${formData.authorEmail}>",
  "license": "${formData.license}",
  "dependencies": {
    ${formData.framework !== "plain" ? `"${formData.framework}": "^latest"` : ""}
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}`;
    };

    const handleCreate = () => {
        onSuccess({
            name: formData.name,
            type: "nodejs",
            path: `~/Projects/${formData.name}`,
            description:
                formData.description ||
                `${FRAMEWORKS.find((f) => f.id === formData.framework)?.name} project`,
            config: {
                port: formData.port,
                host: formData.host,
                framework: formData.framework,
                packageManager: formData.packageManager,
                entryPoint: formData.entryPoint,
            },
        });
    };

    const selectedFramework = FRAMEWORKS.find((f) => f.id === formData.framework);

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

            {/* Step 0: Project Name & Description */}
            {step === 0 && (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm">Project Name</Label>
                        <Input
                            autoFocus
                            placeholder="my-node-app"
                            value={formData.name}
                            onChange={(e) =>
                                update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                            }
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && formData.name && goNext()}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Will be created at ~/Projects/{formData.name || "my-node-app"}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm">Description (optional)</Label>
                        <Textarea
                            placeholder="A brief description of your Node.js project"
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

            {/* Step 1: Framework Selection */}
            {step === 1 && (
                <div className="space-y-4">
                    <Label className="text-sm">Framework</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {FRAMEWORKS.map((fw) => (
                            <button
                                key={fw.id}
                                onClick={() => {
                                    update({ framework: fw.id, port: fw.defaultPort });
                                }}
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
                                        "flex items-center justify-center gap-2 p-2 rounded-lg border transition-all",
                                        formData.packageManager === pm.id
                                            ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                                            : "border-border hover:bg-muted/50"
                                    )}
                                >
                                    {pm.icon}
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

            {/* Step 2: Configuration */}
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
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Entry Point</Label>
                        <div className="flex gap-2">
                            <Input
                                value={formData.entryPoint}
                                onChange={(e) => update({ entryPoint: e.target.value })}
                                placeholder="index.js"
                                className="font-mono text-xs"
                            />
                            <Button
                                variant="outline"
                                onClick={() =>
                                    selectFolder((path: string) =>
                                        update({ entryPoint: path + "/index.js" })
                                    )
                                }
                            >
                                <FolderOpen className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Author Name</Label>
                            <Input
                                value={formData.authorName}
                                onChange={(e) => update({ authorName: e.target.value })}
                                placeholder="Your Name"
                                className="text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Author Email</Label>
                            <Input
                                value={formData.authorEmail}
                                onChange={(e) => update({ authorEmail: e.target.value })}
                                placeholder="you@example.com"
                                className="text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">License</Label>
                        <div className="grid grid-cols-3 gap-1">
                            {LICENSES.map((lic) => (
                                <button
                                    key={lic.id}
                                    onClick={() => update({ license: lic.id })}
                                    className={cn(
                                        "px-2 py-1 rounded text-xs transition-all",
                                        formData.license === lic.id
                                            ? "bg-amber-500 text-white"
                                            : "bg-muted hover:bg-muted/80"
                                    )}
                                >
                                    {lic.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                            <div className="text-sm font-medium">Initialize Git Repository</div>
                            <div className="text-[11px] text-muted-foreground">
                                Create a git repo and initial commit
                            </div>
                        </div>
                        <div
                            className={cn(
                                "w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer",
                                formData.gitInit
                                    ? "bg-amber-500 border-amber-500"
                                    : "border-muted-foreground"
                            )}
                            onClick={() => update({ gitInit: !formData.gitInit })}
                        >
                            {formData.gitInit && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                    </div>

                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                        <p className="text-[10px] text-zinc-500 mb-1.5 font-mono uppercase tracking-wider">
                            package.json preview
                        </p>
                        <pre className="text-[10px] font-mono text-emerald-400 break-all whitespace-pre-wrap">
                            {getPackageJson()}
                        </pre>
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
                                <span className="text-muted-foreground">Framework:</span>
                                <span className="font-mono text-foreground">
                                    {selectedFramework?.name}
                                </span>
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
                                <span className="text-muted-foreground">Entry Point:</span>
                                <span className="font-mono text-foreground truncate max-w-[200px]">
                                    {formData.entryPoint}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">License:</span>
                                <span className="font-mono text-foreground">
                                    {formData.license}
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
                            onClick={handleCreate}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <Globe className="w-4 h-4" />
                            Create Node.js Project
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
