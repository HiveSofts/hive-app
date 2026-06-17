import { useState } from "react";

import { FaGithub } from "@react-icons/all-files/fa/FaGithub";
import { open } from "@tauri-apps/plugin-dialog";
import { CheckCircle2, ChevronRight, FolderOpen, Globe } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea.tsx";

import { cn } from "@/core/lib/utils";
import { Switch } from "@/app/components/ui/switch";

interface FormData {
    name: string;
    description: string;
    host: string;
    port: number;
    useGitHub: boolean;
    githubRepo: string;
    indexPath: string;
    createCss: boolean;
    createJs: boolean;
    useNpm: boolean;
    installLiveServer: boolean;
}

export function CreateStaticProject({ onSuccess }: { onSuccess: (project: any) => void }) {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        host: "localhost",
        port: 5500,
        useGitHub: false,
        githubRepo: "",
        indexPath: "index.html",
        createCss: true,
        createJs: true,
        useNpm: false,
        installLiveServer: true,
    });

    const update = (patch: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...patch }));
    const goNext = () => setStep((s) => s + 1);
    const goBack = () => setStep((s) => s - 1);

    const selectFolder = async (setPath: (path: string) => void) => {
        const selected = await open({ directory: true, multiple: false, title: "Select Folder" });
        if (selected) setPath(selected as string);
    };

    const getCreateCommand = () => {
        if (formData.useGitHub && formData.githubRepo) {
            return `git clone ${formData.githubRepo} ${formData.name}`;
        }
        let cmd = `mkdir ${formData.name} && cd ${formData.name}`;
        if (formData.createCss) cmd += ` && touch styles.css`;
        if (formData.createJs) cmd += ` && touch script.js`;
        if (formData.useNpm) {
            cmd += ` && npm init -y`;
            if (formData.installLiveServer) cmd += ` && npm install -D live-server`;
        }
        return cmd;
    };

    const getHtmlTemplate = () => {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${formData.name || "My Static Site"}</title>
    ${formData.createCss ? `<link rel="stylesheet" href="styles.css">` : ""}
</head>
<body>
    <main>
        <h1>Welcome to ${formData.name || "My Static Site"}</h1>
        <p>Your static website is ready to be built.</p>
    </main>
    ${formData.createJs ? `<script src="script.js"></script>` : ""}
</body>
</html>`;
    };

    const getPackageJson = () => {
        return `{
  "name": "${formData.name}",
  "version": "1.0.0",
  "description": "${formData.description || "A static website"}",
  "main": "${formData.indexPath}",
  "scripts": {
    "start": "live-server --port=${formData.port} --host=${formData.host}",
    "dev": "live-server --port=${formData.port} --host=${formData.host} --watch"
  },
  "devDependencies": {
    "live-server": "^1.2.2"
  }
}`;
    };

    const handleCreate = () => {
        onSuccess({
            name: formData.name,
            type: "html5",
            path: `~/Projects/${formData.name}`,
            description: formData.description || "Static HTML/CSS/JS website",
            config: {
                port: formData.port,
                host: formData.host,
                indexPath: formData.indexPath,
                hasCss: formData.createCss,
                hasJs: formData.createJs,
                useNpm: formData.useNpm,
            },
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-1">
                {["Name", "Source", "Content", "Config", "Install"].map((label, i) => {
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
                            {i < 4 && (
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
                            placeholder="my-static-site"
                            value={formData.name}
                            onChange={(e) =>
                                update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                            }
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && formData.name && goNext()}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Will be created at ~/Projects/{formData.name || "my-static-site"}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm">Description (optional)</Label>
                        <Textarea
                            placeholder="A brief description of your static site"
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

            {/* Step 1: Source (GitHub or New) */}
            {step === 1 && (
                <div className="space-y-4">
                    <div className="space-y-3">
                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ useGitHub: false })}
                        >
                            <div>
                                <div className="text-sm font-medium">New Static Site</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Create a brand new HTML/CSS/JS project
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                    !formData.useGitHub
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {!formData.useGitHub && (
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ useGitHub: true })}
                        >
                            <div>
                                <div className="text-sm font-medium">Clone from GitHub</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Clone an existing static site repository
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                    formData.useGitHub
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.useGitHub && (
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                            </div>
                        </div>
                    </div>

                    {formData.useGitHub && (
                        <div className="space-y-1.5">
                            <Label className="text-sm">GitHub Repository URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.githubRepo}
                                    onChange={(e) => update({ githubRepo: e.target.value })}
                                    placeholder="https://github.com/user/static-site.git"
                                    className="font-mono text-xs"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => window.open("https://github.com", "_blank")}
                                >
                                    <FaGithub className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-sm">Index File Path</Label>
                        <div className="flex gap-2">
                            <Input
                                value={formData.indexPath}
                                onChange={(e) => update({ indexPath: e.target.value })}
                                placeholder="index.html"
                                className="font-mono text-xs"
                            />
                            <Button
                                variant="outline"
                                onClick={() =>
                                    selectFolder((path) =>
                                        update({ indexPath: path + "/index.html" })
                                    )
                                }
                            >
                                <FolderOpen className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Entry point of your website
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={goBack}>
                            Back
                        </Button>
                        <Button
                            onClick={goNext}
                            disabled={formData.useGitHub && !formData.githubRepo}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                        >
                            Continue <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Content Files */}
            {step === 2 && !formData.useGitHub && (
                <div className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <div>
                                <div className="text-sm font-medium">Create CSS File</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Generate styles.css with basic styling
                                </div>
                            </div>
                            <Switch
                                checked={formData.createCss}
                                onCheckedChange={(v) => update({ createCss: v })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <div>
                                <div className="text-sm font-medium">Create JavaScript File</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Generate script.js with basic console log
                                </div>
                            </div>
                            <Switch
                                checked={formData.createJs}
                                onCheckedChange={(v) => update({ createJs: v })}
                            />
                        </div>
                    </div>

                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                        <p className="text-[10px] text-zinc-500 mb-1.5 font-mono uppercase tracking-wider">
                            Preview
                        </p>
                        <pre className="text-[10px] font-mono text-emerald-400 break-all whitespace-pre-wrap max-h-[200px] overflow-auto">
                            {getHtmlTemplate()}
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

            {step === 2 && formData.useGitHub && (
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
            )}

            {/* Step 3: Configuration */}
            {step === 3 && (
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
                                placeholder="5500"
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>

                    {!formData.useGitHub && (
                        <>
                            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                                <div>
                                    <div className="text-sm font-medium">
                                        Initialize npm Project
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        Run npm init -y to create package.json
                                    </div>
                                </div>
                                <Switch
                                    checked={formData.useNpm}
                                    onCheckedChange={(v) => update({ useNpm: v })}
                                />
                            </div>

                            {formData.useNpm && (
                                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                                    <div>
                                        <div className="text-sm font-medium">
                                            Install Live Server
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                            Add live-server for hot reload
                                        </div>
                                    </div>
                                    <Switch
                                        checked={formData.installLiveServer}
                                        onCheckedChange={(v) => update({ installLiveServer: v })}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {formData.useNpm && formData.installLiveServer && (
                        <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                            <p className="text-[10px] text-zinc-500 mb-1.5 font-mono uppercase tracking-wider">
                                package.json preview
                            </p>
                            <pre className="text-[10px] font-mono text-emerald-400 break-all whitespace-pre-wrap">
                                {getPackageJson()}
                            </pre>
                        </div>
                    )}

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

            {/* Step 4: Summary & Install */}
            {step === 4 && (
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
                                <span className="text-muted-foreground">Index:</span>
                                <span className="font-mono text-foreground">
                                    {formData.indexPath}
                                </span>
                            </div>
                            {!formData.useGitHub && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">CSS:</span>
                                        <span
                                            className={
                                                formData.createCss
                                                    ? "text-emerald-500"
                                                    : "text-muted-foreground"
                                            }
                                        >
                                            {formData.createCss ? "Yes" : "No"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">JavaScript:</span>
                                        <span
                                            className={
                                                formData.createJs
                                                    ? "text-emerald-500"
                                                    : "text-muted-foreground"
                                            }
                                        >
                                            {formData.createJs ? "Yes" : "No"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">npm:</span>
                                        <span
                                            className={
                                                formData.useNpm
                                                    ? "text-emerald-500"
                                                    : "text-muted-foreground"
                                            }
                                        >
                                            {formData.useNpm ? "Yes" : "No"}
                                        </span>
                                    </div>
                                </>
                            )}
                            {formData.useGitHub && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">GitHub:</span>
                                    <span className="font-mono text-foreground truncate max-w-[200px]">
                                        {formData.githubRepo}
                                    </span>
                                </div>
                            )}
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
                            Create Static Site
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
