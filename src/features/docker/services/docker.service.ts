import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ContainerInfo, ContainerStats, CreateContainerResult, CreateDatabaseContainerRequest, DockerInfo } from "./types";

export const detectDocker = (): Promise<DockerInfo> =>
    invoke("detect_docker");

export const getDockerInstallUrl = (): Promise<string> =>
    invoke("get_docker_install_url");

export const installDockerLinux = (onLog: (line: string) => void): Promise<string> => {
    const unlisten = listen<string>("docker-install-log", (e) => onLog(e.payload));
    return invoke<string>("install_docker_linux").finally(() =>
        unlisten.then((fn) => fn())
    );
};

export const listContainers = (all = true): Promise<ContainerInfo[]> =>
    invoke("list_docker_containers", { all });

export const createDatabaseContainer = (req: CreateDatabaseContainerRequest): Promise<CreateContainerResult> =>
    invoke("create_database_container", { req });

export const startContainer = (name: string): Promise<string> =>
    invoke("start_docker_container", { containerName: name });

export const stopContainer = (name: string): Promise<string> =>
    invoke("stop_docker_container", { containerName: name });

export const restartContainer = (name: string): Promise<string> =>
    invoke("restart_docker_container", { containerName: name });

export const removeContainer = (name: string, removeVolume: boolean): Promise<string> =>
    invoke("remove_docker_container", { containerName: name, removeVolume });

export const getContainerLogs = (name: string, tail = 200): Promise<string[]> =>
    invoke("get_container_logs", { containerName: name, tail });

export const getContainerStats = (name: string): Promise<ContainerStats> =>
    invoke("get_container_stats", { containerName: name });

export const pullDockerImage = (image: string, tag: string, onLog: (line: string) => void): Promise<void> => {
    const unlisten = listen<string>("docker-pull-log", (e) => onLog(e.payload));
    return invoke<void>("pull_docker_image", { image, tag }).finally(() =>
        unlisten.then((fn) => fn())
    );
};

export const listVolumes = (): Promise<Array<{ name: string; driver: string; mountpoint: string }>> =>
    invoke("list_docker_volumes");

export const removeVolume = (name: string): Promise<string> =>
    invoke("remove_docker_volume", { volumeName: name });

export const executeSql = (
    containerName: string,
    dbType: string,
    username: string,
    password: string,
    database: string,
    query: string
): Promise<string> =>
    invoke("execute_sql_in_container", { containerName, dbType, username, password, database, query });

// Docker Compose operations
export const runDockerCompose = (
    projectName: string,
    composeContent: string,
    envVars: Record<string, string>,
    onLog: (line: string) => void
): Promise<void> => {
    const unlisten = listen<string>("compose-log", (e) => onLog(e.payload));
    return invoke<void>("run_docker_compose", {
        projectName,
        composeContent,
        envVars
    }).finally(() => unlisten.then((fn) => fn()));
};

export const stopDockerCompose = (projectName: string): Promise<void> =>
    invoke("stop_docker_compose", { projectName });

export const listComposeProjects = (): Promise<Array<{ name: string; status: string; services: number }>> =>
    invoke("list_compose_projects");

// Backup operations
export const backupDatabase = (
    containerName: string,
    dbType: string,
    username: string,
    password: string,
    database: string,
    outputPath: string
): Promise<string> =>
    invoke("backup_database_container", {
        containerName, dbType, username, password, database, outputPath
    });

// Shell exec
export const execInContainer = (containerName: string, command: string): Promise<string> =>
    invoke("exec_in_container", { containerName, command });