import { invoke } from "@tauri-apps/api/core";
import { UnlistenFn, listen } from "@tauri-apps/api/event";

export interface CloudflaredInfo {
    installed: boolean;
    version?: string;
    path?: string;
}

export interface TunnelConfig {
    cloudflared_installed: boolean;
    cloudflared_version?: string;
    has_auth: boolean;
    auth_token?: string;
}

export interface TunnelSession {
    id: number;
    project_path: string;
    project_name: string;
    local_url: string;
    public_url?: string;
    pid?: number;
    status: "connecting" | "active" | "stopped" | "error";
    started_at: string;
    stopped_at?: string;
    error?: string;
}

export interface TunnelStatus {
    session?: TunnelSession;
    is_running: boolean;
}

export interface StartTunnelRequest {
    project_path: string;
    project_name: string;
    local_url: string;
}

export interface TunnelEvent {
    sessionId: number;
    type: "url" | "stopped" | "error";
    url?: string;
    error?: string;
}

export interface TunnelLog {
    sessionId: number;
    line: string;
    isError: boolean;
    timestamp?: string;
}

export interface InstallProgress {
    step: string;
    progress: number;
}

export const detectCloudflared = (): Promise<CloudflaredInfo> => invoke("detect_cloudflared");

export const checkCloudflaredInstalled = (): Promise<boolean> =>
    invoke("check_cloudflared_installed");

export const installCloudflared = (): Promise<CloudflaredInfo> => invoke("install_cloudflared");

export const getTunnelConfig = (): Promise<TunnelConfig> => invoke("get_tunnel_config");

export const saveTunnelAuthToken = (token: string): Promise<void> =>
    invoke("save_tunnel_auth_token", { token });

export const deleteTunnelAuthToken = (): Promise<void> => invoke("delete_tunnel_auth_token");

export const startTunnel = (request: StartTunnelRequest): Promise<TunnelSession> =>
    invoke("start_tunnel", { request });

export const startQuickTunnel = (
    localUrl: string,
    projectName: string,
    projectPath: string
): Promise<TunnelSession> => invoke("start_quick_tunnel", { localUrl, projectName, projectPath });

export const stopTunnel = (sessionId: number): Promise<void> =>
    invoke("stop_tunnel", { sessionId });

export const stopAllTunnels = (): Promise<void> => invoke("stop_all_tunnels");

export const getTunnelStatus = (projectPath: string): Promise<TunnelStatus> =>
    invoke("get_tunnel_status", { projectPath });

export const getAllActiveTunnels = (): Promise<TunnelSession[]> => invoke("get_all_active_tunnels");

export const getTunnelHistory = (limit?: number): Promise<TunnelSession[]> =>
    invoke("get_tunnel_history", { limit });

export const getTunnelSession = (sessionId: number): Promise<TunnelSession | null> =>
    invoke("get_tunnel_session", { sessionId });

export const getTunnelLogs = (sessionId: number, limit?: number): Promise<TunnelLog[]> =>
    invoke("get_tunnel_logs", { sessionId, limit });

export const clearTunnelLogs = (sessionId: number): Promise<void> =>
    invoke("clear_tunnel_logs", { sessionId });

export const onTunnelEvent = (cb: (event: TunnelEvent) => void): Promise<UnlistenFn> =>
    listen<TunnelEvent>("tunnel-event", (e) => cb(e.payload));

export const onTunnelLog = (cb: (log: TunnelLog) => void): Promise<UnlistenFn> =>
    listen<TunnelLog>("tunnel-log", (e) => cb(e.payload));

export const onInstallProgress = (cb: (progress: InstallProgress) => void): Promise<UnlistenFn> =>
    listen<InstallProgress>("cloudflared-install-progress", (e) => cb(e.payload));

export const buildLocalUrl = (port: number, host = "localhost"): string => `http://${host}:${port}`;
