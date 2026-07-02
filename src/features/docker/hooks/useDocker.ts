import { useCallback, useEffect, useRef, useState } from "react";
import * as dockerService from "../services/docker.service";
import { ContainerInfo, CreateContainerResult, CreateDatabaseContainerRequest, DockerInfo } from "../services/types";

export function useDocker() {
    const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);
    const [containers, setContainers] = useState<ContainerInfo[]>([]);
    const [allContainers, setAllContainers] = useState<ContainerInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const DB_IMAGES = ["mysql", "mariadb", "postgres", "mongo", "redis", "mssql", "cassandra", "elasticsearch", "neo4j", "influxdb"];

    const checkDocker = useCallback(async () => {
        try {
            const info = await dockerService.detectDocker();
            setDockerInfo(info);
            return info;
        } catch {
            setDockerInfo({ installed: false, version: null, daemon_running: false, compose_available: false, compose_version: null });
            return null;
        }
    }, []);

    const fetchContainers = useCallback(async () => {
        try {
            const list = await dockerService.listContainers(true);
            setAllContainers(list);
            setContainers(list.filter(c => DB_IMAGES.some(db => c.image.toLowerCase().includes(db))));
        } catch {
            setContainers([]);
            setAllContainers([]);
        }
    }, []);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([checkDocker(), fetchContainers()]);
        setRefreshing(false);
    }, [checkDocker, fetchContainers]);

    useEffect(() => {
        refresh();
        intervalRef.current = setInterval(fetchContainers, 5000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const createContainer = useCallback(async (req: CreateDatabaseContainerRequest): Promise<CreateContainerResult> => {
        setLoading(true);
        try {
            const result = await dockerService.createDatabaseContainer(req);
            if (result.success) await fetchContainers();
            return result;
        } finally {
            setLoading(false);
        }
    }, [fetchContainers]);

    const startContainer = useCallback(async (name: string) => {
        await dockerService.startContainer(name);
        await fetchContainers();
    }, [fetchContainers]);

    const stopContainer = useCallback(async (name: string) => {
        await dockerService.stopContainer(name);
        await fetchContainers();
    }, [fetchContainers]);

    const restartContainer = useCallback(async (name: string) => {
        await dockerService.restartContainer(name);
        await fetchContainers();
    }, [fetchContainers]);

    const removeContainer = useCallback(async (name: string, removeVolume: boolean) => {
        await dockerService.removeContainer(name, removeVolume);
        await fetchContainers();
    }, [fetchContainers]);

    const runningCount = allContainers.filter(c => c.state === "running").length;
    const stoppedCount = allContainers.filter(c => c.state !== "running").length;
    const dbRunning = containers.filter(c => c.state === "running").length;

    return {
        dockerInfo,
        containers,
        allContainers,
        loading,
        refreshing,
        runningCount,
        stoppedCount,
        dbRunning,
        checkDocker,
        refresh,
        createContainer,
        startContainer,
        stopContainer,
        restartContainer,
        removeContainer,
        fetchContainers,
    };
}