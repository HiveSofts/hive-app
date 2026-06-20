import { getProjectPanels, getProjectTabs } from "@/core/lib/project-config";
import { getProjectIcon } from "@/core/lib/project-icons";

import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ProjectDetailSkeleton } from "../components/ui/ProjectDetailSkeleton";
import { ProjectHeader } from "../components/ui/ProjectHeader";
import { ServerLogs } from "../components/ui/ServerLogs";
import { Project } from "../types";

interface ServerStatus {
    project_path: string;
    project_name: string;
    project_type: string;
    port: number;
    pid: number;
    url: string;
    started_at: string;
    is_running: boolean;
}

export default function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
    const [restarting, setRestarting] = useState(false);

    const projectRef = useRef<Project | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMounted = useRef(true);

    const fetchStatus = useCallback(async (proj: Project) => {
        if (!isMounted.current) return null;
        try {
            const s = await invoke<ServerStatus | null>(`get_${proj.type}_server_status`, {
                projectPath: proj.path,
            });
            if (isMounted.current) {
                setServerStatus(s);
            }
            return s;
        } catch (error) {
            console.error("Failed to fetch server status:", error);
            return null;
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;

        if (!id) return;

        const init = async () => {
            setLoading(true);
            setError(null);
            try {
                const all = await invoke<Project[]>("list_all_projects");
                const found = all.find((p) => p.id === id);
                if (!found) {
                    setError("Project not found");
                    setLoading(false);
                    return;
                }

                projectRef.current = found;
                setProject(found);

                await fetchStatus(found);

                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = setInterval(() => {
                    if (projectRef.current && isMounted.current) {
                        fetchStatus(projectRef.current);
                    }
                }, 2000);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load");
            } finally {
                setLoading(false);
            }
        };

        init();

        return () => {
            isMounted.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [id, fetchStatus]);

    const handleStart = async () => {
        const proj = projectRef.current;
        if (!proj) return;
        try {
            const s = await invoke<ServerStatus>(`start_${proj.type}_project`, {
                projectPath: proj.path,
            });
            setServerStatus(s);
        } catch (e) {
            console.error("Failed to start project:", e);
        }
    };

    const handleStop = async () => {
        const proj = projectRef.current;
        if (!proj) return;
        try {
            await invoke(`stop_${proj.type}_project`, { projectPath: proj.path });
            setServerStatus((prev) => (prev ? { ...prev, is_running: false } : null));
        } catch (e) {
            console.error("Failed to stop project:", e);
        }
    };

    const handleRestart = async () => {
        const proj = projectRef.current;
        if (!proj) return;
        setRestarting(true);
        try {
            const s = await invoke<ServerStatus>(`restart_${proj.type}_project`, {
                projectPath: proj.path,
            });
            setServerStatus(s);
        } catch (e) {
            console.error("Failed to restart project:", e);
        } finally {
            setRestarting(false);
        }
    };

    if (loading) return <ProjectDetailSkeleton />;

    if (error || !project) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-muted-foreground">{error || "Project not found"}</p>
                <Button variant="outline" onClick={() => navigate("/projects")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to projects
                </Button>
            </div>
        );
    }

    const Icon = getProjectIcon(project.type);
    const tabs = getProjectTabs(project.type);
    const panels = getProjectPanels(project.type, project);
    const isRunning = serverStatus?.is_running ?? false;

    const overviewPanel = panels.find((p) => p.id === "overview");
    const otherPanels = panels.filter((p) => p.id !== "overview");

    return (
        <div className="min-h-screen">
            <ProjectHeader
                project={project}
                status={isRunning ? "running" : "stopped"}
                restarting={restarting}
                Icon={Icon}
                onRestart={handleRestart}
                onToggleStatus={() => (isRunning ? handleStop() : handleStart())}
                onBack={() => navigate("/projects")}
                serverUrl={serverStatus?.url ?? null}
                port={serverStatus?.port ?? null}
            />

            <div className="p-6 pb-0">
                <Tabs defaultValue="overview">
                    <TabsList className="flex h-auto gap-0.5 bg-muted/40 p-1 rounded-xl mb-6 flex-wrap">
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {overviewPanel && (
                        <TabsContent value="overview" className="mt-0">
                            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
                                <overviewPanel.component
                                    {...overviewPanel.props}
                                    projectPath={project.path}
                                    projectName={project.name}
                                    projectType={project.type}
                                    version={project.version}
                                />
                                <div className="mb-4 pt-4">
                                    <ServerLogs
                                        projectName={project.name}
                                        isRunning={isRunning}
                                        serverUrl={serverStatus?.url ?? null}
                                        port={serverStatus?.port ?? null}
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    )}

                    {otherPanels.map((panel, i) => (
                        <TabsContent key={`${panel.id}-${i}`} value={panel.id} className="mt-0">
                            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
                                <panel.component
                                    {...panel.props}
                                    projectPath={project.path}
                                    projectName={project.name}
                                    projectType={project.type}
                                    version={project.version}
                                />
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    );
}
