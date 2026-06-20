import { useEffect, useState } from "react";

import { projectService } from "../services/projectService";
import { Project } from "../types";

export function useProjectDetail(id: string | undefined) {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            setError("Project ID is required");
            return;
        }
        loadProject();
    }, [id]);

    const loadProject = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await projectService.getById(id!);
            if (!data) {
                setError("Project not found");
                return;
            }
            setProject(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load project");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = (status: "running" | "stopped") => {
        if (project) {
            setProject({ ...project, status });
        }
    };

    return { project, loading, error, loadProject, updateStatus };
}
