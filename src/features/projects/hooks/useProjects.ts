import { useCallback, useEffect, useState } from "react";

import { projectService } from "../services/projectService";
import { DeleteDialogState, Project } from "../types";

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
        open: false,
        project: null,
        deleteFiles: false,
    });

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        setError(null);
        const result = await projectService.listAll();
        setProjects(result || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const openDeleteDialog = useCallback((project: Project) => {
        setDeleteDialog({ open: true, project, deleteFiles: false });
    }, []);

    const closeDeleteDialog = useCallback(() => {
        setDeleteDialog({ open: false, project: null, deleteFiles: false });
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!deleteDialog.project) return;

        try {
            await projectService.remove(deleteDialog.project.path, deleteDialog.deleteFiles);
            setProjects((prev) => prev.filter((p) => p.path !== deleteDialog.project!.path));
            closeDeleteDialog();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete project");
        }
    }, [deleteDialog, closeDeleteDialog]);

    const toggleDeleteFiles = useCallback((checked: boolean) => {
        setDeleteDialog((d) => ({ ...d, deleteFiles: checked }));
    }, []);

    const runningCount = projects.filter((p) => p.status === "running").length;

    return {
        projects,
        loading,
        error,
        deleteDialog,
        runningCount,
        fetchProjects,
        openDeleteDialog,
        closeDeleteDialog,
        confirmDelete,
        toggleDeleteFiles,
        setError,
    };
}
