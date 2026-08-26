import { invoke } from "@tauri-apps/api/core";

import { CreateProjectData, Project } from "../types";

export const projectService = {
    async listAll(): Promise<Project[]> {
        try {
            return await invoke<Project[]>("list_all_projects");
        } catch {
            return [];
        }
    },

    async getById(id: string): Promise<Project | null> {
        const projects = await projectService.listAll();
        return projects.find((p) => p.id === id) || null;
    },

    async remove(projectPath: string, deleteFiles: boolean = false): Promise<void> {
        await invoke("remove_project", { projectPath, deleteFiles });
    },

    async create(data: CreateProjectData): Promise<void> {
        const { type, ...rest } = data;
        await invoke(`create_${type}_project`, rest);
    },

    async start(type: string, projectPath: string): Promise<void> {
        await invoke(`start_${type}_project`, { projectPath });
    },

    async stop(type: string, projectPath: string): Promise<void> {
        await invoke(`stop_${type}_project`, { projectPath });
    },

    async update(project: Project): Promise<void> {
        await invoke("update_project", { project });
    },
};
