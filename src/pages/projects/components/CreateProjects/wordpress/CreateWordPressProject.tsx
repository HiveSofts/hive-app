import { useState } from "react";

import { open } from "@tauri-apps/plugin-dialog";
import { CheckCircle2, ChevronRight, FolderOpen, Globe } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";

type WordPressVersion = "latest" | "6.4" | "6.3" | "6.2" | "6.1";
type DatabaseDriver = "mysql" | "mariadb";

interface FormData {
    name: string;
    description: string;
    host: string;
    port: number;
    version: WordPressVersion;
    useGitHub: boolean;
    githubRepo: string;
    dbDriver: DatabaseDriver;
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUser: string;
    dbPassword: string;
    siteTitle: string;
    siteUrl: string;
    adminUser: string;
    adminPassword: string;
    adminEmail: string;
    wpPath: string;
}

const WORDPRESS_VERSIONS: { id: WordPressVersion; name: string }[] = [
    { id: "latest", name: "Latest (6.4)" },
    { id: "6.4", name: "6.4" },
    { id: "6.3", name: "6.3" },
    { id: "6.2", name: "6.2" },
    { id: "6.1", name: "6.1" },
];

export function CreateWordPressProject({ onSuccess }: { onSuccess: (project: any) => void }) {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        host: "localhost",
        port: 8080,
        version: "latest",
        useGitHub: false,
        githubRepo: "",
        dbDriver: "mysql",
        dbHost: "localhost",
        dbPort: 3306,
        dbName: "",
        dbUser: "root",
        dbPassword: "",
        siteTitle: "",
        siteUrl: "",
        adminUser: "admin",
        adminPassword: "",
        adminEmail: "",
        wpPath: "",
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
            return `git clone ${formData.githubRepo} ${formData.name} && cd ${formData.name} && composer install`;
        }
        const version = formData.version === "latest" ? "" : `--version=${formData.version}`;
        return `wp core download ${version} --path=${formData.wpPath || formData.name}`;
    };

    const handleCreate = () => {
        onSuccess({
            name: formData.name,
            type: "wordpress",
            path: `~/Projects/${formData.name}`,
            description:
                formData.description ||
                `WordPress ${formData.version === "latest" ? "6.4" : formData.version} site`,
            config: {
                port: formData.port,
                host: formData.host,
                version: formData.version,
                database: {
                    driver: formData.dbDriver,
                    host: formData.dbHost,
                    port: formData.dbPort,
                    name: formData.dbName,
                    user: formData.dbUser,
                },
                site: {
                    title: formData.siteTitle,
                    url: formData.siteUrl || `http://${formData.host}:${formData.port}`,
                },
                admin: {
                    user: formData.adminUser,
                    email: formData.adminEmail,
                },
            },
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-1">
                {["Name", "Source", "Database", "Site", "Install"].map((label, i) => {
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
                            placeholder="my-wordpress-site"
                            value={formData.name}
                            onChange={(e) =>
                                update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                            }
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && formData.name && goNext()}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Will be created at ~/Projects/{formData.name || "my-wordpress-site"}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm">Description (optional)</Label>
                        <Textarea
                            placeholder="A brief description of your WordPress site"
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

            {/* Step 1: Source (GitHub or Fresh Install) */}
            {step === 1 && (
                <div className="space-y-4">
                    <div className="space-y-3">
                        <div
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => update({ useGitHub: false })}
                        >
                            <div>
                                <div className="text-sm font-medium">
                                    Fresh WordPress Installation
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                    Download WordPress from wordpress.org
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
                                    Clone an existing WordPress repository
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

                    {formData.useGitHub ? (
                        <div className="space-y-1.5">
                            <Label className="text-sm">GitHub Repository URL</Label>
                            <Input
                                value={formData.githubRepo}
                                onChange={(e) => update({ githubRepo: e.target.value })}
                                placeholder="https://github.com/user/wordpress-site.git"
                                className="font-mono text-xs"
                            />
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <Label className="text-sm">WordPress Version</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {WORDPRESS_VERSIONS.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => update({ version: v.id })}
                                        className={cn(
                                            "px-3 py-2 rounded-lg text-sm transition-all",
                                            formData.version === v.id
                                                ? "bg-amber-500 text-white"
                                                : "bg-muted hover:bg-muted/80"
                                        )}
                                    >
                                        {v.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-sm">Installation Path (optional)</Label>
                        <div className="flex gap-2">
                            <Input
                                value={formData.wpPath}
                                onChange={(e) => update({ wpPath: e.target.value })}
                                placeholder={formData.name}
                                className="font-mono text-xs"
                            />
                            <Button
                                variant="outline"
                                onClick={() => selectFolder((path) => update({ wpPath: path }))}
                            >
                                <FolderOpen className="w-4 h-4" />
                            </Button>
                        </div>
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

            {/* Step 2: Database Configuration */}
            {step === 2 && (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm">Database Driver</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => update({ dbDriver: "mysql" })}
                                className={cn(
                                    "p-2 rounded-lg border text-center transition-all",
                                    formData.dbDriver === "mysql"
                                        ? "border-amber-500 bg-amber-500/10"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                MySQL 🐬
                            </button>
                            <button
                                onClick={() => update({ dbDriver: "mariadb" })}
                                className={cn(
                                    "p-2 rounded-lg border text-center transition-all",
                                    formData.dbDriver === "mariadb"
                                        ? "border-amber-500 bg-amber-500/10"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                MariaDB 🦭
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Database Host</Label>
                            <Input
                                value={formData.dbHost}
                                onChange={(e) => update({ dbHost: e.target.value })}
                                className="font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Database Port</Label>
                            <Input
                                type="number"
                                value={formData.dbPort}
                                onChange={(e) => update({ dbPort: parseInt(e.target.value) })}
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Database Name</Label>
                        <Input
                            value={formData.dbName}
                            onChange={(e) => update({ dbName: e.target.value })}
                            placeholder="wp_database"
                            className="font-mono text-xs"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Database User</Label>
                            <Input
                                value={formData.dbUser}
                                onChange={(e) => update({ dbUser: e.target.value })}
                                className="font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Database Password</Label>
                            <Input
                                type="password"
                                value={formData.dbPassword}
                                onChange={(e) => update({ dbPassword: e.target.value })}
                                className="font-mono text-xs"
                            />
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

            {/* Step 3: Site & Admin Configuration */}
            {step === 3 && (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm">Site Title</Label>
                        <Input
                            value={formData.siteTitle}
                            onChange={(e) => update({ siteTitle: e.target.value })}
                            placeholder="My WordPress Site"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Site URL</Label>
                            <Input
                                value={formData.siteUrl}
                                onChange={(e) => update({ siteUrl: e.target.value })}
                                placeholder={`http://${formData.host}:${formData.port}`}
                                className="font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Web Server Port</Label>
                            <Input
                                type="number"
                                value={formData.port}
                                onChange={(e) => update({ port: parseInt(e.target.value) })}
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Admin Username</Label>
                            <Input
                                value={formData.adminUser}
                                onChange={(e) => update({ adminUser: e.target.value })}
                                placeholder="admin"
                                className="font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Admin Email</Label>
                            <Input
                                type="email"
                                value={formData.adminEmail}
                                onChange={(e) => update({ adminEmail: e.target.value })}
                                placeholder="admin@example.com"
                                className="text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Admin Password</Label>
                        <Input
                            type="password"
                            value={formData.adminPassword}
                            onChange={(e) => update({ adminPassword: e.target.value })}
                            placeholder="Auto-generated if empty"
                            className="font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Leave empty to auto-generate a secure password
                        </p>
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
                                <span className="text-muted-foreground">Version:</span>
                                <span className="font-mono text-foreground">
                                    {formData.version === "latest" ? "6.4" : formData.version}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Database:</span>
                                <span className="font-mono text-foreground">
                                    {formData.dbDriver} · {formData.dbName || formData.name}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Site Title:</span>
                                <span className="font-mono text-foreground">
                                    {formData.siteTitle || formData.name}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Admin:</span>
                                <span className="font-mono text-foreground">
                                    {formData.adminUser} · {formData.adminEmail}
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
                            Create WordPress Site
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
