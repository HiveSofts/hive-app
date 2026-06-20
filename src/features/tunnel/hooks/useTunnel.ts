import { useCallback, useEffect, useState } from "react";

import { generateSessionUrl } from "../services/tunnelService";
import { RequestLog, StartTunnelData, TunnelSession } from "../types";

export function useTunnel() {
    const [session, setSession] = useState<TunnelSession | null>(null);
    const [requests, setRequests] = useState<RequestLog[]>([]);
    const [loading, setLoading] = useState(false);

    const startTunnel = useCallback(async (data: StartTunnelData) => {
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const project = { id: data.projectId, name: "my-blog" };
        setSession({
            id: Math.random().toString(36).substring(7),
            projectId: data.projectId,
            projectName: project?.name || "",
            url: generateSessionUrl(project?.name || "tunnel"),
            port: 8000,
            status: "active",
            requests: 0,
            bytesTransferred: "0 KB",
            startedAt: new Date().toISOString(),
            uptime: "0s",
            authEnabled: data.authEnabled,
            authUsername: data.username,
            authPassword: data.password,
        });
        setLoading(false);
    }, []);

    const stopTunnel = useCallback(() => {
        setSession(null);
        setRequests([]);
    }, []);

    const addRequest = useCallback((request: RequestLog) => {
        setRequests((prev) => [request, ...prev]);
    }, []);

    const clearRequests = useCallback(() => {
        setRequests([]);
    }, []);

    const copyUrl = useCallback(() => {
        if (session) {
            navigator.clipboard.writeText(session.url);
        }
    }, [session]);

    const updateAuth = useCallback((enabled: boolean, username: string, password: string) => {
        setSession((prev) =>
            prev
                ? {
                      ...prev,
                      authEnabled: enabled,
                      authUsername: username,
                      authPassword: password,
                  }
                : null
        );
    }, []);

    useEffect(() => {
        if (session && session.status === "active") {
            const interval = setInterval(() => {
                setSession((prev) =>
                    prev
                        ? {
                              ...prev,
                              requests: prev.requests + Math.floor(Math.random() * 3),
                              bytesTransferred: `${Math.floor(prev.requests / 10 + 1)} KB`,
                              uptime: `${Math.floor(prev.requests / 60)}m ${prev.requests % 60}s`,
                          }
                        : null
                );
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [session]);

    return {
        session,
        requests,
        loading,
        startTunnel,
        stopTunnel,
        addRequest,
        clearRequests,
        copyUrl,
        updateAuth,
    };
}
