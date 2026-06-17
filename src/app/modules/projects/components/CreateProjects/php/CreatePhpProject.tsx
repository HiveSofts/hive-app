import { useState } from "react";

import { FaGithub } from "@react-icons/all-files/fa/FaGithub";
import { open } from "@tauri-apps/plugin-dialog";
import { CheckCircle2, ChevronRight, FolderOpen, Globe } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea.tsx";
import { cn } from "@/core/lib/utils";

interface FormData {
    name: string;
    description: string;
    host: string;
    port: number;
    hasGitHubRepo: boolean;
    githubRepo: string;
    packageName: string;
    vendorName: string;
    namespace: string;
    srcPath: string;
    indexPath: string;
    phpVersion: string;
}

const PHP_VERSIONS = ["8.4", "8.3", "8.2", "8.1", "8.0"];

export function CreatePhpProject({ onSuccess }: { onSuccess: (project: any) => void }) {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        host: "localhost",
        port: 8000,
        hasGitHubRepo: false,
        githubRepo: "",
        packageName: "",
        vendorName: "",
        namespace: "",
        srcPath: "src/",
        indexPath: "public/index.php",
        phpVersion: "8.3",
    });

    const update = (patch: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...patch }));
    const goNext = () => setStep((s) => s + 1);
    const goBack = () => setStep((s) => s - 1);

    const selectFolder = async (setPath: (path: string) => void) => {
        const selected = await open({ directory: true, multiple: false, title: "Select Folder" });
        if (selected) setPath(selected as string);
    };

    const getInitCommand = () => {
        return `composer init \\
    --name="${formData.vendorName || "vendor"}/${formData.packageName || formData.name}" \\
    --description="${formData.description || "A PHP project"}" \\
    --author="${formData.vendorName || "author"}" \\
    --autoload-psr-4="${formData.namespace || "App\\\\"}": "${formData.srcPath || "src/"}"`;
    };

    const handleCreate = () => {
        onSuccess({
            name: formData.name,
            type: "php",
            path: `~/Projects/${formData.name}`,
            description: formData.description || `PHP project with PHP ${formData.phpVersion}`,
            config: {
                port: formData.port,
                host: formData.host,
                phpVersion: formData.phpVersion,
                indexPath: formData.indexPath,
                githubRepo: formData.hasGitHubRepo ? formData.githubRepo : null,
            },
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-1">
                {["Name", "Source", "Config", "Install"].map((label, i) => {
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
                            placeholder="my-php-app"
                            value={formData.name}
                            onChange={(e) =>
                                update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                            }
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && formData.name && goNext()}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Will be created at ~/Projects/{formData.name || "my-php-app"}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm">Description (optional)</Label>
                        <Textarea
                            placeholder="A brief description of your PHP project"
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

            {/* Step 1: Source (GitHub or Composer init) */}
            {step === 1 && (
                <div className="space-y-4">
                    <div className="space-y-3">
                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ hasGitHubRepo: false })}
                        >
                            <div>
                                <div className="text-sm font-medium">New Project</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Create a new PHP project from scratch
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                    !formData.hasGitHubRepo
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {!formData.hasGitHubRepo && (
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ hasGitHubRepo: true })}
                        >
                            <div>
                                <div className="text-sm font-medium">Clone from GitHub</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Clone an existing PHP repository
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                    formData.hasGitHubRepo
                                        ? "bg-amber-500 border-amber-500"
                                        : "border-muted-foreground"
                                )}
                            >
                                {formData.hasGitHubRepo && (
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                            </div>
                        </div>
                    </div>

                    {formData.hasGitHubRepo ? (
                        <div className="space-y-1.5">
                            <Label className="text-sm">GitHub Repository URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.githubRepo}
                                    onChange={(e) => update({ githubRepo: e.target.value })}
                                    placeholder="https://github.com/user/repo.git"
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
                            <p className="text-[10px] text-muted-foreground">
                                Supports HTTPS and SSH URLs
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Vendor Name</Label>
                                    <Input
                                        value={formData.vendorName}
                                        onChange={(e) => update({ vendorName: e.target.value })}
                                        placeholder="your-vendor"
                                        className="font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Package Name</Label>
                                    <Input
                                        value={formData.packageName}
                                        onChange={(e) =>
                                            update({ packageName: e.target.value || formData.name })
                                        }
                                        placeholder={formData.name || "my-app"}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">PHP Version</Label>
                                <div className="grid grid-cols-5 gap-1">
                                    {PHP_VERSIONS.map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => update({ phpVersion: v })}
                                            className={cn(
                                                "px-2 py-1 rounded text-xs font-mono transition-all",
                                                formData.phpVersion === v
                                                    ? "bg-amber-500 text-white"
                                                    : "bg-muted hover:bg-muted/80"
                                            )}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">PSR-4 Namespace</Label>
                                <Input
                                    value={formData.namespace}
                                    onChange={(e) => update({ namespace: e.target.value })}
                                    placeholder="App\\"
                                    className="font-mono text-xs"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    e.g., App\\, MyProject\\
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Source Directory</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={formData.srcPath}
                                        onChange={(e) => update({ srcPath: e.target.value })}
                                        placeholder="src/"
                                        className="font-mono text-xs"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            selectFolder((path) => update({ srcPath: path }))
                                        }
                                    >
                                        <FolderOpen className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={goBack}>
                            Back
                        </Button>
                        <Button
                            onClick={goNext}
                            disabled={formData.hasGitHubRepo && !formData.githubRepo}
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
                                placeholder="8000"
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Entry Point (Index Path)</Label>
                        <div className="flex gap-2">
                            <Input
                                value={formData.indexPath}
                                onChange={(e) => update({ indexPath: e.target.value })}
                                placeholder="public/index.php"
                                className="font-mono text-xs"
                            />
                            <Button
                                variant="outline"
                                onClick={() =>
                                    selectFolder((path) =>
                                        update({ indexPath: path + "/index.php" })
                                    )
                                }
                            >
                                <FolderOpen className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            The file that will be served by the web server
                        </p>
                    </div>

                    {!formData.hasGitHubRepo && (
                        <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                            <p className="text-[10px] text-zinc-500 mb-1.5 font-mono uppercase tracking-wider">
                                Composer init command
                            </p>
                            <code className="text-[11px] font-mono text-emerald-400 break-all">
                                {getInitCommand()}
                            </code>
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
                                <span className="text-muted-foreground">PHP Version:</span>
                                <span className="font-mono text-foreground">
                                    {formData.phpVersion}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Entry Point:</span>
                                <span className="font-mono text-foreground truncate max-w-[200px]">
                                    {formData.indexPath}
                                </span>
                            </div>
                            {formData.hasGitHubRepo && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">GitHub:</span>
                                    <span className="font-mono text-foreground truncate max-w-[200px]">
                                        {formData.githubRepo}
                                    </span>
                                </div>
                            )}
                            {!formData.hasGitHubRepo && formData.vendorName && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Package:</span>
                                    <span className="font-mono text-foreground">
                                        {formData.vendorName}/
                                        {formData.packageName || formData.name}
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

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={goBack}>
                            Back
                        </Button>
                        <Button
                            onClick={handleCreate}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <Globe className="w-4 h-4" />
                            Create PHP Project
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
