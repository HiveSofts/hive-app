import { useCallback, useEffect, useRef, useState } from "react";

import {
    TunnelConfig,
    TunnelLog,
    TunnelSession,
    checkCloudflaredInstalled,
    deleteTunnelAuthToken,
    getAllActiveTunnels,
    getTunnelConfig,
    getTunnelLogs,
    getTunnelStatus,
    installCloudflared,
    onInstallProgress,
    onTunnelEvent,
    onTunnelLog,
    saveTunnelAuthToken,
    startQuickTunnel,
    stopAllTunnels,
    stopTunnel,
} from "../services/tunnelService";

export type TunnelStep =
    "idle" | "checking" | "installing" | "connecting" | "active" | "error" | "stopped";

interface UseTunnelOptions {
    projectPath?: string;
    projectName?: string;
    localUrl?: string;
    autoCheck?: boolean;
}

export function useTunnel(options: UseTunnelOptions = {}) {
    const { projectPath = "", projectName = "", localUrl = "", autoCheck = true } = options;

    const [step, setStep] = useState<TunnelStep>("idle");
    const [session, setSession] = useState<TunnelSession | null>(null);
    const [config, setConfig] = useState<TunnelConfig | null>(null);
    const [logs, setLogs] = useState<TunnelLog[]>([]);
    const [installProgress, setInstallProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [activeTunnels, setActiveTunnels] = useState<TunnelSession[]>([]);

    const unlistenRefs = useRef<Array<() => void>>([]);
    // Track which session ID the live-log listener is currently bound to
    const activeSessionIdRef = useRef<number | null>(null);

    const refreshActiveTunnels = useCallback(async () => {
        const tunnels = await getAllActiveTunnels();
        setActiveTunnels(tunnels);
    }, []);

    const checkSetup = useCallback(async () => {
        setStep("checking");
        try {
            const cfg = await getTunnelConfig();
            setConfig(cfg);
            setStep("idle");
            await refreshActiveTunnels();
        } catch (e) {
            setStep("error");
            setError(String(e));
        }
    }, [refreshActiveTunnels]);

    // ── event listeners (set up once, never torn down until unmount) ──────────
    useEffect(() => {
        let mounted = true;
        const unsubs: Array<() => void> = [];

        const setup = async () => {
            const u1 = await onTunnelEvent((event) => {
                if (!mounted) return;

                if (event.type === "url" && event.url) {
                    setSession((prev) =>
                        prev && prev.id === event.sessionId
                            ? { ...prev, public_url: event.url, status: "active" }
                            : prev
                    );
                    setStep("active");
                    refreshActiveTunnels();
                }

                if (event.type === "stopped") {
                    setSession((prev) =>
                        prev && prev.id === event.sessionId ? { ...prev, status: "stopped" } : prev
                    );
                    setStep((prev) => (prev !== "idle" ? "stopped" : "idle"));
                    refreshActiveTunnels();
                }

                if (event.type === "error") {
                    setError(event.error || "Unknown tunnel error");
                    setStep("error");
                    refreshActiveTunnels();
                }
            });
            if (!mounted) {
                u1();
                return;
            }
            unsubs.push(u1);

            // Only accept log lines that belong to the *current* session
            const u2 = await onTunnelLog((log) => {
                if (!mounted) return;
                // Filter: only forward logs for the session we're watching
                if (
                    activeSessionIdRef.current !== null &&
                    log.sessionId !== activeSessionIdRef.current
                ) {
                    return;
                }
                setLogs((prev) => {
                    const next = [...prev, log];
                    return next.length > 500 ? next.slice(-500) : next;
                });
            });
            if (!mounted) {
                u2();
                return;
            }
            unsubs.push(u2);

            const u3 = await onInstallProgress((p) => {
                if (!mounted) return;
                setInstallProgress(p.progress);
            });
            if (!mounted) {
                u3();
                return;
            }
            unsubs.push(u3);
        };

        setup();

        return () => {
            mounted = false;
            unsubs.forEach((u) => u());
            unlistenRefs.current = [];
        };
    }, [refreshActiveTunnels]);

    // Keep activeSessionIdRef in sync with the current session
    useEffect(() => {
        activeSessionIdRef.current = session?.id ?? null;
    }, [session?.id]);

    useEffect(() => {
        if (autoCheck) checkSetup();
    }, [autoCheck, checkSetup]);

    useEffect(() => {
        if (!projectPath) return;
        getTunnelStatus(projectPath).then((status) => {
            if (status.session) {
                setSession(status.session);
                if (status.is_running) {
                    setStep(status.session.status === "active" ? "active" : "connecting");
                }
            }
        });
    }, [projectPath]);

    const installBinary = useCallback(async () => {
        setStep("installing");
        setInstallProgress(0);
        setError(null);
        try {
            await installCloudflared();
            const cfg = await getTunnelConfig();
            setConfig(cfg);
            setStep("idle");
        } catch (e) {
            setError(`Installation failed: ${e}`);
            setStep("error");
        }
    }, []);

    const loadLogs = useCallback(async (sessionId: number, limit: number = 200) => {
        try {
            const storedLogs = await getTunnelLogs(sessionId, limit);
            if (storedLogs.length > 0) {
                // Replace logs (don't append) – these are the ground-truth from disk
                setLogs(storedLogs);
            }
        } catch (e) {
            console.error("Failed to load logs:", e);
        }
    }, []);

    const startTunnelForProject = useCallback(
        async (overrides?: { localUrl?: string; projectName?: string; projectPath?: string }) => {
            const url = overrides?.localUrl || localUrl;
            const name = overrides?.projectName || projectName;
            const path = overrides?.projectPath || projectPath;

            if (!url || !path) {
                setError("Local URL and project path are required");
                return;
            }

            // ── Reset state for the new session BEFORE starting ───────────────
            setStep("connecting");
            setError(null);
            setLogs([]); // clear logs from previous session
            setSession(null); // clear previous session object
            activeSessionIdRef.current = null; // stop filtering logs by old ID

            try {
                const installed = await checkCloudflaredInstalled();
                if (!installed) {
                    await installBinary();
                }

                const sess = await startQuickTunnel(url, name || path, path);
                setSession(sess);
                // Now only accept logs for this new session
                activeSessionIdRef.current = sess.id;
                setStep("connecting");
                await refreshActiveTunnels();
            } catch (e) {
                setError(String(e));
                setStep("error");
            }
        },
        [localUrl, projectName, projectPath, installBinary, refreshActiveTunnels]
    );

    const stopTunnelForSession = useCallback(
        async (id?: number) => {
            const targetId = id ?? session?.id;
            if (targetId === undefined) return;
            try {
                await stopTunnel(targetId);
                setSession((prev) =>
                    prev?.id === targetId ? { ...prev, status: "stopped" } : prev
                );
                setStep("stopped");
                await refreshActiveTunnels();
            } catch (e) {
                setError(String(e));
            }
        },
        [session, refreshActiveTunnels]
    );

    const stopAll = useCallback(async () => {
        await stopAllTunnels();
        setSession(null);
        setStep("idle");
        setActiveTunnels([]);
        setLogs([]);
        activeSessionIdRef.current = null;
    }, []);

    const saveToken = useCallback(async (token: string) => {
        await saveTunnelAuthToken(token);
        const cfg = await getTunnelConfig();
        setConfig(cfg);
    }, []);

    const removeToken = useCallback(async () => {
        await deleteTunnelAuthToken();
        const cfg = await getTunnelConfig();
        setConfig(cfg);
    }, []);

    const clearLogs = useCallback(() => setLogs([]), []);

    const copyPublicUrl = useCallback(() => {
        if (session?.public_url) {
            navigator.clipboard.writeText(session.public_url);
        }
    }, [session]);

    const reset = useCallback(() => {
        setStep("idle");
        setSession(null);
        setError(null);
        setLogs([]);
        activeSessionIdRef.current = null;
    }, []);

    return {
        step,
        session,
        config,
        logs,
        installProgress,
        error,
        activeTunnels,
        isInstalled: config?.cloudflared_installed ?? false,
        isConnecting: step === "connecting",
        isActive: step === "active",
        isInstalling: step === "installing",
        publicUrl: session?.public_url,
        checkSetup,
        installBinary,
        startTunnel: startTunnelForProject,
        stopTunnel: stopTunnelForSession,
        stopAll,
        saveToken,
        removeToken,
        clearLogs,
        copyPublicUrl,
        reset,
        refreshActiveTunnels,
        loadLogs,
    };
}
