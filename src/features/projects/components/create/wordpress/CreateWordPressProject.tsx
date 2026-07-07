import { cn } from "@/core/lib/utils";

import { useEffect, useState, type ReactNode } from "react";

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Download,
    FileArchive,
    FolderOpen,
    GitBranch,
    Globe,
    Loader2,
    RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

type DatabaseDriver = "mysql" | "mariadb";
type SourceType = "wordpress_org" | "github_clone" | "github_zip";

interface FormData {
    name: string;
    description: string;
    host: string;
    port: number;
    version: string;
    sourceType: SourceType;
    githubRepo: string;
    githubBranch: string;
    githubZipUrl: string;
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

interface GitHubTag {
    name: string;
    zipball_url: string;
    tarball_url: string;
}

const GITHUB_API = "https://api.github.com/repos/WordPress/WordPress";

export function CreateWordPressProject({ onSuccess }: { onSuccess: (project: any) => void }) {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tags, setTags] = useState<GitHubTag[]>([]);
    const [loadingTags, setLoadingTags] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [selectedVersion, setSelectedVersion] = useState<string>("");

    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        host: "localhost",
        port: 8080,
        version: "",
        sourceType: "wordpress_org",
        githubRepo: "https://github.com/WordPress/WordPress",
        githubBranch: "master",
        githubZipUrl: "",
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

    useEffect(() => {
        if (step === 1 && tags.length === 0 && !loadingTags) {
            fetchTags();
        }
    }, [step]);

    const fetchTags = async () => {
        setLoadingTags(true);
        setError(null);
        try {
            const response = await fetch(`${GITHUB_API}/tags?per_page=100`);
            if (!response.ok) throw new Error(`Failed to fetch tags: ${response.status}`);
            const data = await response.json();
            const versionTags = data.filter((t: GitHubTag) => t.name.match(/^\d+\.\d+(\.\d+)?$/));
            setTags(versionTags);
            if (versionTags.length > 0) {
                setSelectedVersion(versionTags[0].name);
                update({ version: versionTags[0].name });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch WordPress versions");
        } finally {
            setLoadingTags(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.name) {
            setError("Project name is required");
            return;
        }

        if (!formData.siteTitle || !formData.siteUrl || !formData.adminUser || !formData.adminEmail) {
            setError("Site title, URL, admin user and admin email are required");
            return;
        }

        if (
            formData.sourceType === "github_clone" &&
            !formData.githubRepo
        ) {
            setError("A GitHub repository URL is required for clone source");
            return;
        }

        if (
            formData.sourceType === "wordpress_org" &&
            !formData.version &&
            tags.length === 0
        ) {
            setError("Please select a WordPress version");
            return;
        }

        setLoading(true);
        setError(null);
        setDownloadProgress(8);

        const progressTimer = setInterval(() => {
            setDownloadProgress((p) => (p < 90 ? p + Math.random() * 12 : p));
        }, 400);

        try {
            const requestData = {
                name: formData.name,
                description: formData.description || null,
                source_type: formData.sourceType,
                version: formData.version || "latest",
                github_repo: formData.sourceType === "github_clone" ? formData.githubRepo : null,
                github_branch:
                    formData.sourceType === "github_clone" ? formData.githubBranch || null : null,
                github_zip_url:
                    formData.sourceType === "github_zip" ? formData.githubZipUrl || null : null,
                db_driver: formData.dbDriver,
                db_host: formData.dbHost,
                db_port: formData.dbPort,
                db_name: formData.dbName || formData.name,
                db_user: formData.dbUser,
                db_password: formData.dbPassword,
                site_title: formData.siteTitle || formData.name,
                site_url: formData.siteUrl || `http://${formData.host}:${formData.port}`,
                admin_user: formData.adminUser,
                admin_password: formData.adminPassword || null,
                admin_email: formData.adminEmail,
                wp_path: formData.wpPath || null,
                port: formData.port,
                host: formData.host,
            };

            const result = await invoke<{
                success: boolean;
                message: string;
                project: any;
                error?: string;
            }>("create_wordpress_project", { request: requestData });

            if (result.success && result.project) {
                setDownloadProgress(100);
                onSuccess(result.project);
            } else {
                setError(result.error || result.message || "Failed to create WordPress site");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create WordPress site");
        } finally {
            clearInterval(progressTimer);
            setLoading(false);
        }
    };

    const getCreateCommand = () => {
        const target = formData.wpPath || formData.name;
        if (formData.sourceType === "github_clone") {
            const repo = formData.githubRepo || "https://github.com/WordPress/WordPress";
            const branch = formData.githubBranch ? ` --branch ${formData.githubBranch}` : "";
            return `git clone${branch} ${repo} ${target}`;
        }
        if (formData.sourceType === "github_zip") {
            const url =
                formData.githubZipUrl ||
                `https://github.com/WordPress/WordPress/archive/refs/tags/${formData.version || "latest"}.zip`;
            return `curl -L ${url} -o ${target}.zip && unzip ${target}.zip -d ${target}`;
        }
        const version = formData.version || "latest";
        const file = version === "latest" ? "latest" : `wordpress-${version}`;
        return `curl -L https://wordpress.org/${file}.zip -o ${target}.zip && unzip ${target}.zip -d ${target}`;
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

            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError(null)} className="text-xs hover:underline">
                        Dismiss
                    </button>
                </div>
            )}

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

            {step === 1 && (
                <div className="space-y-4">
                    <div className="space-y-3">
                        <SourceOption
                            active={formData.sourceType === "wordpress_org"}
                            onClick={() => update({ sourceType: "wordpress_org" })}
                            icon={<Download className="w-4 h-4" />}
                            title="WordPress.org"
                            description="Download the official WordPress release (recommended)"
                        />
                        <SourceOption
                            active={formData.sourceType === "github_clone"}
                            onClick={() => update({ sourceType: "github_clone" })}
                            icon={<GitBranch className="w-4 h-4" />}
                            title="Clone from GitHub"
                            description="Clone the WordPress repository via git"
                        />
                        <SourceOption
                            active={formData.sourceType === "github_zip"}
                            onClick={() => update({ sourceType: "github_zip" })}
                            icon={<FileArchive className="w-4 h-4" />}
                            title="Download ZIP from GitHub"
                            description="Download a specific version as a ZIP from GitHub tags"
                        />
                    </div>

                    {formData.sourceType === "github_clone" && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm">GitHub Repository URL</Label>
                                <Input
                                    value={formData.githubRepo}
                                    onChange={(e) => update({ githubRepo: e.target.value })}
                                    placeholder="https://github.com/WordPress/WordPress"
                                    className="font-mono text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm">Branch (optional)</Label>
                                <Input
                                    value={formData.githubBranch}
                                    onChange={(e) => update({ githubBranch: e.target.value })}
                                    placeholder="master"
                                    className="font-mono text-xs"
                                />
                            </div>
                        </div>
                    )}

                    {formData.sourceType === "wordpress_org" && (
                        <WordPressVersionSelector
                            tags={tags}
                            loadingTags={loadingTags}
                            selectedVersion={selectedVersion}
                            onSelect={(v) => {
                                setSelectedVersion(v);
                                update({ version: v });
                            }}
                            onLoad={fetchTags}
                            customUrl={formData.githubZipUrl}
                            onCustomUrl={(v) => update({ githubZipUrl: v })}
                            customUrlLabel="Or pin a specific WordPress.org version URL"
                            customUrlPlaceholder="https://wordpress.org/wordpress-6.4.2.zip"
                            note="Leave empty to use the selected version from WordPress.org."
                        />
                    )}

                    {formData.sourceType === "github_zip" && (
                        <WordPressVersionSelector
                            tags={tags}
                            loadingTags={loadingTags}
                            selectedVersion={selectedVersion}
                            onSelect={(v) => {
                                setSelectedVersion(v);
                                update({ version: v });
                            }}
                            onLoad={fetchTags}
                            customUrl={formData.githubZipUrl}
                            onCustomUrl={(v) => update({ githubZipUrl: v })}
                            customUrlLabel="Or Custom ZIP URL"
                            customUrlPlaceholder="https://github.com/user/repo/archive/refs/tags/version.zip"
                            note="Leave empty to use the selected version from WordPress."
                        />
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
                                className="flex-shrink-0"
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
                            disabled={
                                (formData.sourceType === "github_clone" && !formData.githubRepo) ||
                                (formData.sourceType === "github_zip" &&
                                    !formData.githubZipUrl &&
                                    tags.length === 0) ||
                                (formData.sourceType === "wordpress_org" &&
                                    !formData.version &&
                                    tags.length === 0)
                            }
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                        >
                            Continue <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

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
                            disabled={
                                !formData.siteTitle ||
                                !formData.siteUrl ||
                                !formData.adminUser ||
                                !formData.adminEmail
                            }
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                        >
                            Continue <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

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
                                <span className="text-muted-foreground">Source:</span>
                                <span className="font-mono text-foreground">
                                    {formData.sourceType === "wordpress_org"
                                        ? "WordPress.org"
                                        : formData.sourceType === "github_clone"
                                          ? "GitHub Clone"
                                          : "GitHub ZIP"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Version:</span>
                                <span className="font-mono text-foreground">
                                    {formData.version || "Latest"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Database:</span>
                                <span className="font-mono text-foreground">
                                    {formData.dbDriver} · {formData.dbName || formData.name}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Site:</span>
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

                    {loading && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Creating WordPress site...</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 transition-all duration-300"
                                    style={{ width: `${downloadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={goBack} disabled={loading}>
                            Back
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={loading}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Globe className="w-4 h-4" />
                                    Create WordPress Site
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function SourceOption({
    active,
    onClick,
    icon,
    title,
    description,
}: {
    active: boolean;
    onClick: () => void;
    icon: ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div
            className={cn(
                "flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-all",
                active
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border hover:bg-muted/30"
            )}
            onClick={onClick}
        >
            <div className="flex-1">
                <div className="text-sm font-medium flex items-center gap-2">
                    {icon}
                    {title}
                </div>
                <div className="text-[11px] text-muted-foreground">{description}</div>
            </div>
            <div
                className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                    active ? "bg-amber-500 border-amber-500" : "border-muted-foreground"
                )}
            >
                {active && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
        </div>
    );
}

function WordPressVersionSelector({
    tags,
    loadingTags,
    selectedVersion,
    onSelect,
    onLoad,
    customUrl,
    onCustomUrl,
    customUrlLabel,
    customUrlPlaceholder,
    note,
}: {
    tags: GitHubTag[];
    loadingTags: boolean;
    selectedVersion: string;
    onSelect: (v: string) => void;
    onLoad: () => void;
    customUrl: string;
    onCustomUrl: (v: string) => void;
    customUrlLabel: string;
    customUrlPlaceholder: string;
    note: string;
}) {
    if (loadingTags) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading WordPress versions...</span>
            </div>
        );
    }

    if (tags.length === 0) {
        return (
            <div className="flex items-center justify-center p-4">
                <Button variant="outline" onClick={onLoad} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Load WordPress Versions
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
                <Label className="text-sm">Select WordPress Version</Label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                    {tags.map((tag) => (
                        <button
                            key={tag.name}
                            onClick={() => onSelect(tag.name)}
                            className={cn(
                                "px-3 py-2 rounded-lg text-xs transition-all text-center font-mono",
                                selectedVersion === tag.name
                                    ? "bg-amber-500 text-white"
                                    : "bg-muted hover:bg-muted/80"
                            )}
                        >
                            {tag.name}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-1.5">
                <Label className="text-sm">{customUrlLabel}</Label>
                <Input
                    value={customUrl}
                    onChange={(e) => onCustomUrl(e.target.value)}
                    placeholder={customUrlPlaceholder}
                    className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">{note}</p>
            </div>
        </div>
    );
}
