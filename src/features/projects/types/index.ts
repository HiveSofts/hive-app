export type ProjectType =
    | "laravel"
    | "react"
    | "nextjs"
    | "vue"
    | "vite"
    | "nodejs"
    | "php"
    | "html5"
    | "wordpress"
    | "go"
    | "gin"
    | "docker"
    | "django"
    | "nginx"
    | "fastapi";

export type ProjectStatus = "running" | "stopped";

export interface DatabaseConfig {
    driver: string;
    name: string;
    host: string;
    port: number;
    status: string;
}

export interface Project {
    id: string;
    name: string;
    type: ProjectType;
    path: string;
    description?: string;
    status: ProjectStatus;
    version?: string;
    phpVersion?: string;
    entryPoint?: string;
    host?: string;
    port?: number;
    nodeVersion?: string;
    package_manager?: string;
    source_type?: string;
    github_repo?: string;
    created_at?: string;
    database?: DatabaseConfig;
    readme?: string;
}

export interface DeleteDialogState {
    open: boolean;
    project: Project | null;
    deleteFiles: boolean;
}

export interface Technology {
    id: ProjectType;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    selectedColor: string;
    available: boolean;
    soon?: boolean;
}

export interface TabConfig {
    id: string;
    label: string;
    icon: string;
}

export interface PanelConfig {
    id: string;
    component: React.ComponentType<any>;
    props?: Record<string, any>;
}

export interface CreateProjectData {
    name: string;
    path: string;
    type: ProjectType;
    version?: string;
    phpVersion?: string;
    nodeVersion?: string;
    package_manager?: string;
    [key: string]: any;
}
