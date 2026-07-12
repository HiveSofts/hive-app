import { FolderOpen, Loader2, Plus } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

import { DeleteDialog } from "../components/common/DeleteDialog";
import { ProjectCard } from "../components/common/ProjectCard";
import { useProjects } from "../hooks/useProjects";

export default function ProjectsListPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        projects,
        loading,
        error,
        deleteDialog,
        runningCount,
        fetchProjects,  // Using the fetchProjects function to refresh
        openDeleteDialog,
        closeDeleteDialog,
        confirmDelete,
        toggleDeleteFiles,
        setError,
    } = useProjects();

    // Check if we came from project creation and need to refresh
    useEffect(() => {
        if (location.state?.refreshAfterCreation) {
            // Clear the state to avoid repeated refreshes
            setTimeout(() => {
                window.history.replaceState({}, document.title);
            }, 100);
            
            // Refresh the projects list
            fetchProjects();
        }
    }, [location.state, fetchProjects]);

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
                        {projects.length} project{projects.length !== 1 ? "s" : ""} · {runningCount}{" "}
                        running
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

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
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
                    {projects.map((project) => (
                        <ProjectCard
                            key={project.path}
                            project={project}
                            onDelete={openDeleteDialog}
                        />
                    ))}
                </div>
            )}

            {/* Delete Dialog */}
            <DeleteDialog
                open={deleteDialog.open}
                project={deleteDialog.project}
                deleteFiles={deleteDialog.deleteFiles}
                onOpenChange={(open) => !open && closeDeleteDialog()}
                onDeleteFilesChange={toggleDeleteFiles}
                onConfirm={confirmDelete}
                onCancel={closeDeleteDialog}
            />
        </div>
    );
}