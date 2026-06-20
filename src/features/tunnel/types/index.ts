export interface Project {
    id: number;
    name: string;
    url: string;
    port: number;
    status: string;
}

export interface TunnelSession {
    id: string;
    projectId: number;
    projectName: string;
    url: string;
    port: number;
    status: "active" | "inactive" | "error";
    requests: number;
    bytesTransferred: string;
    startedAt: string;
    uptime: string;
    authEnabled: boolean;
    authUsername?: string;
    authPassword?: string;
}

export interface RequestLog {
    id: string;
    method: string;
    path: string;
    statusCode: number;
    ip: string;
    timestamp: string;
    duration: string;
    body?: string;
    headers?: Record<string, string>;
}

export interface StartTunnelData {
    projectId: number;
    authEnabled: boolean;
    username: string;
    password: string;
}
