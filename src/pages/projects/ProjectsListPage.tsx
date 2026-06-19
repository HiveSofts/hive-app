import { useState, useEffect } from "react";
import { ChevronRight, FolderOpen, Plus, Server, Terminal, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";

import {
    DataBaseIcon,
    DjangoIcon,
    FastApiIcon,
    Html5Icon,
    NginxIcon,
    NodejsIcon,
    WordpressIcon,
} from "@/components/icons";
import { DockerIcon } from "@/components/icons/DockerIcon";
import { LaravelIcon } from "@/components/icons/LaravelIcon.tsx";
import { NextjsIcon } from "@/components/icons/NextjsIcon";
import { PhpIcon } from "@/components/icons/PhpIcon";
import { ReactIcon } from "@/components/icons/ReactIcon";
import { ViteIcon } from "@/components/icons/ViteIcon";
import { VueIcon } from "@/components/icons/VueIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const PROJECT_TYPE_CONFIG: Record<
    string,
    { icon: React.ReactNode; color: string; badge: string; soon?: boolean }
> = {
    laravel: {
        icon: <LaravelIcon className="w-8 h-8" />,
        color: "border-red-500/30 bg-red-500/5 hover:bg-red-500/10 dark:border-red-500/20 dark:bg-red-500/5 dark:hover:bg-red-500/10",
        badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    },
    react: {
        icon: <ReactIcon className="w-8 h-8" />,
        color: "border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 dark:border-cyan-500/20 dark:bg-cyan-500/5 dark:hover:bg-cyan-500/10",
        badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    },
    vue: {
        icon: <VueIcon className="w-8 h-8" />,
        color: "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10",
        badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    nextjs: {
        icon: <NextjsIcon className="w-8 h-8" />,
        color: "border-zinc-500/30 bg-zinc-500/5 hover:bg-zinc-500/10 dark:border-zinc-500/20 dark:bg-zinc-500/5 dark:hover:bg-zinc-500/10",
        badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    },
    vite: {
        icon: <ViteIcon className="w-8 h-8" />,
        color: "border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 dark:border-purple-500/20 dark:bg-purple-500/5 dark:hover:bg-purple-500/10",
        badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
    docker: {
        icon: <DockerIcon className="w-8 h-8" />,
        color: "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 dark:border-blue-500/20 dark:bg-blue-500/5 dark:hover:bg-blue-500/10",
        badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    php: {
        icon: <PhpIcon className="w-8 h-8" />,
        color: "border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:hover:bg-indigo-500/10",
        badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    },
    wordpress: {
        icon: <WordpressIcon className="w-8 h-8" />,
        color: "border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 dark:border-sky-500/20 dark:bg-sky-500/5 dark:hover:bg-sky-500/10",
        badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    },
    django: {
        icon: <DjangoIcon className="w-8 h-8" />,
        color: "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10",
        badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    nginx: {
        icon: <NginxIcon className="w-8 h-8" />,
        color: "border-green-500/30 bg-green-500/5 hover:bg-green-500/10 dark:border-green-500/20 dark:bg-green-500/5 dark:hover:bg-green-500/10",
        badge: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    },
    nodejs: {
        icon: <NodejsIcon className="w-8 h-8" />,
        color: "border-lime-500/30 bg-lime-500/5 hover:bg-lime-500/10 dark:border-lime-500/20 dark:bg-lime-500/5 dark:hover:bg-lime-500/10",
        badge: "bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20",
    },
    database: {
        icon: <DataBaseIcon className="w-8 h-8" />,
        color: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 dark:border-amber-500/20 dark:bg-amber-500/5 dark:hover:bg-amber-500/10",
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    fastapi: {
        icon: <FastApiIcon className="w-8 h-8" />,
        color: "border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 dark:border-teal-500/20 dark:bg-teal-500/5 dark:hover:bg-teal-500/10",
        badge: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    },
    html5: {
        icon: <Html5Icon className="w-8 h-8" />,
        color: "border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 dark:border-orange-500/20 dark:bg-orange-500/5 dark:hover:bg-orange-500/10",
        badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    },
    static: {
        icon: <Html5Icon className="w-8 h-8" />,
        color: "border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 dark:border-orange-500/20 dark:bg-orange-500/5 dark:hover:bg-orange-500/10",
        badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    },
};

interface Project {
    id?: string;
    name: string;
    project_type?: string;
    type?: string;
    path: string;
    description?: string;
    created_at?: string;
    package_manager?: string;
    status?: "running" | "stopped";
    version?: string;
    source_type?: string;
    github_repo?: string;
}

interface DeleteDialogState {
    open: boolean;
    project: Project | null;
    deleteFiles: boolean;
}

export default function ProjectsListPage() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
        open: false,
        project: null,
        deleteFiles: false,
    });

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await invoke<Project[]>("list_all_projects");
            setProjects(result || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load projects");
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const openDeleteDialog = (project: Project) => {
        setDeleteDialog({ open: true, project, deleteFiles: false });
    };

    const confirmDelete = async () => {
        if (!deleteDialog.project) return;

        try {
            await invoke("remove_project", {
                projectPath: deleteDialog.project.path,
                deleteFiles: deleteDialog.deleteFiles,
            });

            setProjects((prev) => prev.filter((p) => p.path !== deleteDialog.project!.path));
            setDeleteDialog({ open: false, project: null, deleteFiles: false });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete project");
        }
    };

    const handleProjectClick = (project: Project) => {
        navigate(`/projects/${project.name}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <p className="text-sm text-muted-foreground">Loading projects...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {projects.length} project{projects.length !== 1 ? "s" : ""} ·{" "}
                        {projects.filter((p) => p.status === "running").length} running
                    </p>
                </div>
                <Button
                    onClick={() => navigate("/projects/new")}
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Project
                </Button>
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

            {/* Projects Grid */}
            {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <FolderOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">No projects yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Create your first project to get started.
                    </p>
                    <Button
                        onClick={() => navigate("/projects/new")}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => {
                        const projectType = project.project_type || project.type || "unknown";
                        const config = PROJECT_TYPE_CONFIG[projectType] || PROJECT_TYPE_CONFIG["docker"];

                        return (
                            <div
                                key={project.path}
                                onClick={() => handleProjectClick(project)}
                                className={`group relative rounded-xl border transition-all duration-200 cursor-pointer ${config.color}`}
                            >
                                <div className="p-4">
                                    {/* Top row */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="shrink-0">{config.icon}</div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm truncate">
                                                        {project.name}
                                                    </span>
                                                    {project.status === "running" && (
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        </span>
                                                    )}
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] px-1.5 py-0 font-mono mt-0.5 ${config.badge}`}
                                                >
                                                    {projectType}
                                                </Badge>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openDeleteDialog(project);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-muted-foreground"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Path */}
                                    <p className="text-[11px] font-mono text-muted-foreground truncate mb-2">
                                        {project.path}
                                    </p>

                                    {/* Description */}
                                    {project.description && (
                                        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
                                            {project.description}
                                        </p>
                                    )}

                                    {/* Meta */}
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                        {project.package_manager && (
                                            <span className="font-mono">
                                                {project.package_manager}
                                            </span>
                                        )}
                                        {project.version && (
                                            <span className="font-mono">
                                                v{project.version}
                                            </span>
                                        )}
                                        {project.created_at && (
                                            <span>
                                                {new Date(project.created_at).toLocaleDateString(
                                                    "en-US",
                                                    {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    }
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-3">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-7 text-xs gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Server className="w-3 h-3" />
                                            {project.status === "running" ? "Stop" : "Start"}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-7 text-xs gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Terminal className="w-3 h-3" />
                                            Terminal
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 w-7 p-0"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ChevronRight className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Dialog */}
            <Dialog
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog((d) => ({ ...d, open }))}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Trash2 className="w-4 h-4 text-red-500" />
                            Remove project
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-2 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to remove{" "}
                            <span className="font-semibold text-foreground font-mono">
                                {deleteDialog.project?.name}
                            </span>{" "}
                            from Hive?
                        </p>

                        <div className="rounded-lg border bg-muted/40 p-3 flex items-start gap-3">
                            <Switch
                                id="delete-files"
                                checked={deleteDialog.deleteFiles}
                                onCheckedChange={(v) =>
                                    setDeleteDialog((d) => ({ ...d, deleteFiles: v }))
                                }
                                className="mt-0.5 shrink-0"
                            />
                            <div>
                                <Label
                                    htmlFor="delete-files"
                                    className="text-sm font-medium cursor-pointer"
                                >
                                    Delete project files
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Permanently delete{" "}
                                    <span className="font-mono">{deleteDialog.project?.path}</span>{" "}
                                    from disk. This cannot be undone.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setDeleteDialog({ open: false, project: null, deleteFiles: false })
                            }
                        >
                            Cancel
                        </Button>
                        <Button size="sm" variant="destructive" onClick={confirmDelete}>
                            {deleteDialog.deleteFiles ? "Delete project & files" : "Remove project"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}