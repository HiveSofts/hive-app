import { cn } from "@/core/lib/utils";

import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Download,
    FolderOpen,
    Loader2,
    RefreshCw,
    Server,
    XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
    checkAndInstallDependencies,
    detectNode,
    detectPhp,
    downloadAndExtract,
    expandHomePath,
    fetchNodeManifest,
    fetchPhpManifest,
    formatBytes,
    getArch,
    getInstalledHiveRuntimes,
    getNodeDownloadUrl,
    getOs,
    getPhpDownloadUrl,
    hiveInstallPath,
} from "../services/onboardingService";
import { Arch, InstallJob, NodeManifest, OS, PhpManifest, RuntimeInfo } from "../types";

interface Step6RuntimeProps {
    onNext: (data: {
        phpVersion?: string;
        nodeVersion?: string;
        phpPath?: string;
        nodePath?: string;
    }) => void;
}

function RuntimeCard({
    label,
    emoji,
    info,
    loading,
    installedVersions,
    type,
}: {
    label: string;
    emoji: string;
    info: RuntimeInfo | null;
    loading: boolean;
    installedVersions: string[];
    type: "php" | "node";
}) {
    const [showList, setShowList] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-2"
        >
            <motion.div
                whileHover={{ scale: 1.01 }}
                className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border transition-all",
                    loading
                        ? "bg-muted/30 border-border"
                        : info?.found
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : "bg-red-500/5 border-red-500/30"
                )}
            >
                <motion.div
                    initial={{ scale: 0.8, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", bounce: 0.4 }}
                    className="text-3xl"
                >
                    {emoji}
                </motion.div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{label}</span>
                        {!loading &&
                            info &&
                            (info.found ? (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", bounce: 0.5 }}
                                >
                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                                        {info.isHive ? "Hive" : "System"}
                                    </Badge>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", bounce: 0.5 }}
                                >
                                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">
                                        Not found
                                    </Badge>
                                </motion.div>
                            ))}
                    </div>
                    {loading ? (
                        <motion.span
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="text-xs text-muted-foreground"
                        >
                            Detecting...
                        </motion.span>
                    ) : info?.found ? (
                        <>
                            <div className="text-xs font-mono text-muted-foreground">
                                {info.version}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground/60 truncate">
                                {info.path}
                            </div>
                        </>
                    ) : (
                        <span className="text-xs text-muted-foreground">
                            Not installed on this system
                        </span>
                    )}
                    {installedVersions.length > 0 && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowList(!showList)}
                            className="text-[10px] text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1"
                        >
                            <FolderOpen className="w-3 h-3" />
                            {installedVersions.length} Hive runtime
                            {installedVersions.length !== 1 ? "s" : ""} installed
                            {showList ? (
                                <ChevronUp className="w-3 h-3" />
                            ) : (
                                <ChevronDown className="w-3 h-3" />
                            )}
                        </motion.button>
                    )}
                </div>
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                    className="shrink-0"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    ) : info?.found ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                    )}
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {showList && installedVersions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="ml-4 pl-6 border-l-2 border-muted space-y-1 overflow-hidden"
                    >
                        {installedVersions.map((v, i) => (
                            <motion.div
                                key={v}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="text-xs font-mono text-muted-foreground flex items-center gap-2"
                            >
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {type === "php" ? `PHP ${v}` : `Node.js ${v}`}
                                <span className="text-[10px] text-muted-foreground/60">
                                    {hiveInstallPath(type, v)}
                                </span>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function PhpVersionPicker({
    manifest,
    selected,
    onSelect,
    os,
    installed,
}: {
    manifest: PhpManifest;
    selected: string | null;
    onSelect: (v: string) => void;
    os: OS;
    installed: string[];
}) {
    const versions = Object.entries(manifest.php).reverse();

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-hidden"
        >
            {versions.map(([ver, entry]) => {
                const size = os === "windows" ? entry.windows?.size : entry.linux?.size;
                const isLatest = ver === manifest.latest;
                const isSelected = selected === ver;
                const isInstalled = installed.includes(ver);
                return (
                    <motion.button
                        key={ver}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.05 }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onSelect(ver)}
                        disabled={isInstalled}
                        className={cn(
                            "flex flex-col gap-1 p-3 rounded-xl border text-left transition-all",
                            isInstalled && "opacity-50 cursor-not-allowed",
                            isSelected && !isInstalled
                                ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/10"
                                : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
                        )}
                    >
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm">PHP {ver}</span>
                            {isLatest && (
                                <Badge className="text-[9px] px-1 py-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                    Latest
                                </Badge>
                            )}
                            {isInstalled && (
                                <Badge className="text-[9px] px-1 py-0 bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                                    Installed
                                </Badge>
                            )}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                            {entry.full}
                        </div>
                        {size && (
                            <div className="text-[10px] text-muted-foreground/60">
                                {formatBytes(size)}
                            </div>
                        )}
                        <div className="text-[10px] font-mono text-muted-foreground/50">
                            {hiveInstallPath("php", ver)}
                        </div>
                    </motion.button>
                );
            })}
        </motion.div>
    );
}

function NodeVersionPicker({
    manifest,
    selected,
    onSelect,
    installed,
}: {
    manifest: NodeManifest;
    selected: string | null;
    onSelect: (v: string) => void;
    os: OS;
    arch: Arch;
    installed: string[];
}) {
    const versions = Object.entries(manifest.node).reverse();
    const bundledNpm = manifest.npm.bundled;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-hidden"
        >
            {versions.map(([ver, entry]) => {
                const isLatest = ver === manifest.latest;
                const isSelected = selected === ver;
                const isInstalled = installed.includes(ver);
                return (
                    <motion.button
                        key={ver}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.05 }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onSelect(ver)}
                        disabled={isInstalled}
                        className={cn(
                            "flex flex-col gap-1 p-3 rounded-xl border text-left transition-all",
                            isInstalled && "opacity-50 cursor-not-allowed",
                            isSelected && !isInstalled
                                ? "border-green-500 bg-green-500/10 ring-2 ring-green-500/40 shadow-lg shadow-green-500/10"
                                : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
                        )}
                    >
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-sm">Node {ver}</span>
                            {isLatest && (
                                <Badge className="text-[9px] px-1 py-0 bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20">
                                    Latest
                                </Badge>
                            )}
                            {entry.lts && (
                                <Badge className="text-[9px] px-1 py-0 bg-blue-500/15 text-blue-500 border-blue-500/20">
                                    LTS
                                </Badge>
                            )}
                            {isInstalled && (
                                <Badge className="text-[9px] px-1 py-0 bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                                    Installed
                                </Badge>
                            )}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                            v{entry.full}
                        </div>
                        <div className="text-[10px] text-muted-foreground/60">
                            npm {bundledNpm[ver] ?? "—"}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground/50">
                            {hiveInstallPath("node", ver)}
                        </div>
                    </motion.button>
                );
            })}
        </motion.div>
    );
}

function InstallProgress({ jobs }: { jobs: InstallJob[] }) {
    if (jobs.length === 0) return null;

    const statusLabel: Record<InstallJob["status"], string> = {
        idle: "Queued",
        downloading: "Downloading...",
        extracting: "Extracting...",
        done: "Installed",
        error: "Failed",
    };

    const statusColor: Record<InstallJob["status"], string> = {
        idle: "text-muted-foreground",
        downloading: "text-amber-500",
        extracting: "text-blue-500",
        done: "text-emerald-500",
        error: "text-red-500",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl border bg-zinc-950 overflow-hidden"
        >
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[11px] text-zinc-500 font-mono">
                    hive — runtime installer
                </span>
            </div>
            <div className="p-4 space-y-3 font-mono text-xs">
                {jobs.map((job, i) => {
                    const safeProgress = Number.isFinite(job.progress) ? job.progress : 0;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="space-y-1.5"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-zinc-500">❯</span>
                                <span className="text-zinc-200">
                                    hive install {job.type} {job.version}
                                </span>
                                <span className={cn("ml-auto", statusColor[job.status])}>
                                    {statusLabel[job.status]}
                                </span>
                            </div>
                            <div className="text-zinc-500 pl-4 text-[10px]">→ {job.url}</div>
                            <div className="text-zinc-500 pl-4">→ {job.destPath}</div>
                            {(job.status === "downloading" || job.status === "extracting") && (
                                <>
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(safeProgress, 100)}%` }}
                                            transition={{ duration: 0.5 }}
                                            className={cn(
                                                "h-full rounded-full",
                                                job.status === "downloading"
                                                    ? "bg-amber-500"
                                                    : "bg-blue-500"
                                            )}
                                        />
                                    </div>
                                    <div className="flex justify-between text-zinc-600 text-[10px]">
                                        <span>
                                            {job.status === "downloading"
                                                ? "Downloading"
                                                : "Extracting"}
                                        </span>
                                        <span>
                                            {safeProgress > 0
                                                ? `${Math.round(safeProgress)}%`
                                                : "..."}
                                        </span>
                                    </div>
                                </>
                            )}
                            {job.status === "done" && (
                                <div className="text-emerald-400 pl-4">
                                    ✔ Installed at {job.destPath}
                                </div>
                            )}
                            {job.status === "error" && (
                                <div className="text-red-400 pl-4">✖ {job.error}</div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}

function DependencyInstaller({ onComplete }: { onComplete: () => void }) {
    const [statuses, setStatuses] = useState<
        {
            step: string;
            message: string;
            progress: number | null;
            success: boolean;
        }[]
    >([]);
    const [isInstalling, setIsInstalling] = useState(false);
    const [done, setDone] = useState(false);

    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const install = async () => {
            setIsInstalling(true);
            try {
                const result = await checkAndInstallDependencies();
                if (cancelled) return;
                setStatuses(result);
                setDone(true);
            } catch (error) {
                console.error("Dependency installation failed:", error);
                setDone(true);
            } finally {
                if (!cancelled) setIsInstalling(false);
            }
            if (!cancelled) {
                timer = setTimeout(() => {
                    onCompleteRef.current();
                }, 1500);
            }
        };
        install();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, []);

    if (isInstalling || statuses.length > 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-xl border bg-zinc-950 overflow-hidden"
            >
                <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-[11px] text-zinc-500 font-mono">
                        hive — dependency installer
                    </span>
                </div>
                <div className="p-4 space-y-2 font-mono text-xs">
                    {statuses.map((status, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-2"
                        >
                            {status.success ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            ) : (
                                <XCircle className="w-3 h-3 text-red-400" />
                            )}
                            <span className={status.success ? "text-zinc-300" : "text-red-300"}>
                                {status.message}
                            </span>
                            {status.progress !== null && (
                                <span className="text-zinc-500 ml-auto">{status.progress}%</span>
                            )}
                        </motion.div>
                    ))}
                    {isInstalling && (
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Installing dependencies...
                        </div>
                    )}
                    {done && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 text-emerald-400 pt-2 border-t border-zinc-800"
                        >
                            <CheckCircle2 className="w-3 h-3" />
                            Dependencies ready
                        </motion.div>
                    )}
                </div>
            </motion.div>
        );
    }

    return null;
}

export function Step5Runtime({ onNext }: Step6RuntimeProps) {
    const [os, setOs] = useState<OS>("linux");
    const [arch, setArch] = useState<Arch>("x64");
    const [detecting, setDetecting] = useState(true);
    const [phpInfo, setPhpInfo] = useState<RuntimeInfo | null>(null);
    const [nodeInfo, setNodeInfo] = useState<RuntimeInfo | null>(null);
    const [installedPhp, setInstalledPhp] = useState<string[]>([]);
    const [installedNode, setInstalledNode] = useState<string[]>([]);
    const [phpManifest, setPhpManifest] = useState<PhpManifest | null>(null);
    const [nodeManifest, setNodeManifest] = useState<NodeManifest | null>(null);
    const [manifestLoading, setManifestLoading] = useState(false);
    const [manifestError, setManifestError] = useState<string | null>(null);
    const [selectedPhp, setSelectedPhp] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [jobs, setJobs] = useState<InstallJob[]>([]);
    const [allDone, setAllDone] = useState(false);
    const [showPhpPicker, setShowPhpPicker] = useState(false);
    const [showNodePicker, setShowNodePicker] = useState(false);
    const [dependenciesReady, setDependenciesReady] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const detectedOs = await getOs();
                const detectedArch = await getArch();
                setOs(detectedOs);
                setArch(detectedArch);
            } catch {}

            const [phpDetection, nodeDetection, phpInstalled, nodeInstalled] = await Promise.all([
                detectPhp(),
                detectNode(),
                getInstalledHiveRuntimes("php"),
                getInstalledHiveRuntimes("node"),
            ]);
            setPhpInfo(phpDetection);
            setNodeInfo(nodeDetection);
            setInstalledPhp(phpInstalled);
            setInstalledNode(nodeInstalled);
            setDetecting(false);
        };
        init();
    }, []);

    useEffect(() => {
        if (detecting) return;
        const load = async () => {
            setManifestLoading(true);
            setManifestError(null);
            try {
                const [phpData, nodeData] = await Promise.all([
                    fetchPhpManifest(),
                    fetchNodeManifest(),
                ]);
                setPhpManifest(phpData);
                setNodeManifest(nodeData);
                if (!selectedPhp) {
                    const notInstalled = Object.keys(phpData.php).filter(
                        (v) => !installedPhp.includes(v)
                    );
                    setSelectedPhp(notInstalled[0] || phpData.latest);
                }
                if (!selectedNode) {
                    const notInstalled = Object.keys(nodeData.node).filter(
                        (v) => !installedNode.includes(v)
                    );
                    setSelectedNode(notInstalled[0] || nodeData.latest);
                }
            } catch {
                setManifestError("Failed to load manifests. Check your internet connection.");
            }
            setManifestLoading(false);
        };
        load();
    }, [detecting, installedPhp, installedNode, selectedPhp, selectedNode]);

    const startInstall = async () => {
        const toInstall: {
            type: "php" | "node";
            version: string;
            url: string;
            destPath: string;
            archiveType: string;
        }[] = [];

        if (selectedPhp && !installedPhp.includes(selectedPhp) && phpManifest) {
            const entry = phpManifest.php[selectedPhp];
            const url = getPhpDownloadUrl(entry, os);
            const archiveType =
                os === "windows" ? entry.windows?.type || "zip" : entry.linux?.type || "tar.zst";
            if (url)
                toInstall.push({
                    type: "php",
                    version: selectedPhp,
                    url,
                    destPath: await expandHomePath(hiveInstallPath("php", selectedPhp)),
                    archiveType: archiveType || "zip",
                });
        }

        if (selectedNode && !installedNode.includes(selectedNode) && nodeManifest) {
            const entry = nodeManifest.node[selectedNode];
            const url = getNodeDownloadUrl(entry, os, arch);
            const archiveType = os === "windows" ? "zip" : os === "macos" ? "tar.gz" : "tar.gz";
            if (url)
                toInstall.push({
                    type: "node",
                    version: selectedNode,
                    url,
                    destPath: await expandHomePath(hiveInstallPath("node", selectedNode)),
                    archiveType,
                });
        }

        if (toInstall.length === 0) {
            setAllDone(true);
            return;
        }

        const initial: InstallJob[] = toInstall.map((j) => ({
            ...j,
            status: "idle" as const,
            progress: 0,
        }));
        setJobs(initial);

        for (let i = 0; i < initial.length; i++) {
            const job = initial[i];
            const updateJob = (updater: (j: InstallJob) => InstallJob) => {
                setJobs((prev) => prev.map((j, idx) => (idx === i ? updater(j) : j)));
            };

            updateJob((j) => ({ ...j, status: "downloading", progress: 0 }));

            try {
                await downloadAndExtract(job.type, job.version, job.url, job.archiveType);
                updateJob((j) => ({ ...j, status: "done", progress: 100 }));
                if (job.type === "php") setInstalledPhp((prev) => [...prev, job.version]);
                else setInstalledNode((prev) => [...prev, job.version]);
            } catch (e: any) {
                updateJob((j) => ({ ...j, status: "error", error: String(e) }));
            }
        }
        setAllDone(true);
    };

    const bothPresent =
        (phpInfo?.found || installedPhp.length > 0) &&
        (nodeInfo?.found || installedNode.length > 0);
    const needsInstall =
        (selectedPhp && !installedPhp.includes(selectedPhp)) ||
        (selectedNode && !installedNode.includes(selectedNode));

    const getResultData = async () => {
        const phpPath = phpInfo?.found
            ? phpInfo.path
            : selectedPhp
              ? await expandHomePath(hiveInstallPath("php", selectedPhp))
              : undefined;

        const nodePath = nodeInfo?.found
            ? nodeInfo.path
            : selectedNode
              ? await expandHomePath(hiveInstallPath("node", selectedNode))
              : undefined;

        return {
            phpVersion: phpInfo?.found ? phpInfo.version : (selectedPhp ?? undefined),
            nodeVersion: nodeInfo?.found ? nodeInfo.version : (selectedNode ?? undefined),
            phpPath,
            nodePath,
        };
    };

    const isLinux = os === "linux";

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex min-h-screen items-center justify-center p-4"
        >
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-full max-w-3xl"
            >
                <Card className="w-full shadow-2xl border-0 dark:border-zinc-800 backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90">
                    <CardHeader className="pb-2">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, type: "spring", bounce: 0.3 }}
                            className="flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <Server className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Runtime Setup</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Install PHP and Node.js runtimes for Hive
                                </p>
                            </div>
                        </motion.div>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-2">
                        {!dependenciesReady ? (
                            <DependencyInstaller onComplete={() => setDependenciesReady(true)} />
                        ) : (
                            <>
                                {isLinux && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
                                    >
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span>
                                                On Linux, only the system-installed version of PHP
                                                and Node.js is supported. Multiple versions are not
                                                available.
                                            </span>
                                        </div>
                                    </motion.div>
                                )}

                                <div className="space-y-2">
                                    <RuntimeCard
                                        label="PHP"
                                        emoji="🐘"
                                        info={phpInfo}
                                        loading={detecting}
                                        installedVersions={installedPhp}
                                        type="php"
                                    />
                                    <RuntimeCard
                                        label="Node.js"
                                        emoji="🟩"
                                        info={nodeInfo}
                                        loading={detecting}
                                        installedVersions={installedNode}
                                        type="node"
                                    />
                                </div>

                                {!detecting && bothPresent && !allDone && jobs.length === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                        <div className="flex-1 text-sm">
                                            Runtimes are available. You can install additional
                                            versions below.
                                        </div>
                                        <Button
                                            onClick={async () => onNext(await getResultData())}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            Continue <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </motion.div>
                                )}

                                {!detecting && jobs.length === 0 && !isLinux && (
                                    <>
                                        {manifestLoading && (
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Fetching available versions...
                                            </div>
                                        )}
                                        {manifestError && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex items-center gap-2 text-sm text-red-500"
                                            >
                                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                                {manifestError}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="ml-auto gap-1 transition-all hover:scale-105"
                                                    onClick={() => window.location.reload()}
                                                >
                                                    <RefreshCw className="w-3 h-3" />
                                                    Retry
                                                </Button>
                                            </motion.div>
                                        )}

                                        {phpManifest && (
                                            <div className="space-y-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.01 }}
                                                    whileTap={{ scale: 0.99 }}
                                                    onClick={() => setShowPhpPicker((v) => !v)}
                                                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                                                >
                                                    <span className="text-xl">🐘</span>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold">
                                                            Install PHP
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {selectedPhp
                                                                ? `PHP ${selectedPhp} → ${hiveInstallPath("php", selectedPhp)}`
                                                                : "Select version to install"}
                                                        </div>
                                                    </div>
                                                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                                                        {selectedPhp
                                                            ? `PHP ${selectedPhp}`
                                                            : "Choose"}
                                                    </Badge>
                                                    {showPhpPicker ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </motion.button>
                                                <AnimatePresence>
                                                    {showPhpPicker && (
                                                        <PhpVersionPicker
                                                            manifest={phpManifest}
                                                            selected={selectedPhp}
                                                            onSelect={setSelectedPhp}
                                                            os={os}
                                                            installed={installedPhp}
                                                        />
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}

                                        {nodeManifest && (
                                            <div className="space-y-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.01 }}
                                                    whileTap={{ scale: 0.99 }}
                                                    onClick={() => setShowNodePicker((v) => !v)}
                                                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                                                >
                                                    <span className="text-xl">🟩</span>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold">
                                                            Install Node.js
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {selectedNode
                                                                ? `Node ${selectedNode} → ${hiveInstallPath("node", selectedNode)}`
                                                                : "Select version to install"}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {selectedNode &&
                                                            nodeManifest.node[selectedNode]
                                                                ?.lts && (
                                                                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px]">
                                                                    LTS
                                                                </Badge>
                                                            )}
                                                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                                                            {selectedNode
                                                                ? `Node ${selectedNode}`
                                                                : "Choose"}
                                                        </Badge>
                                                    </div>
                                                    {showNodePicker ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </motion.button>
                                                <AnimatePresence>
                                                    {showNodePicker && (
                                                        <NodeVersionPicker
                                                            manifest={nodeManifest}
                                                            selected={selectedNode}
                                                            onSelect={setSelectedNode}
                                                            os={os}
                                                            arch={arch}
                                                            installed={installedNode}
                                                        />
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}

                                        <motion.div
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                        >
                                            <Button
                                                onClick={startInstall}
                                                disabled={!needsInstall || manifestLoading}
                                                className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25"
                                            >
                                                <Download className="w-4 h-4" />
                                                Install Selected Runtimes
                                            </Button>
                                        </motion.div>
                                    </>
                                )}

                                {isLinux && !allDone && jobs.length === 0 && (
                                    <Button
                                        onClick={async () => onNext(await getResultData())}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        Continue <ArrowRight className="w-4 h-4" />
                                    </Button>
                                )}

                                {jobs.length > 0 && <InstallProgress jobs={jobs} />}

                                {allDone && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="space-y-3"
                                    >
                                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                                            <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Runtime setup complete
                                            </div>
                                            {selectedPhp && installedPhp.includes(selectedPhp) && (
                                                <div className="text-xs font-mono">
                                                    PHP {selectedPhp} →{" "}
                                                    {hiveInstallPath("php", selectedPhp)}
                                                </div>
                                            )}
                                            {selectedNode &&
                                                installedNode.includes(selectedNode) && (
                                                    <div className="text-xs font-mono">
                                                        Node {selectedNode} →{" "}
                                                        {hiveInstallPath("node", selectedNode)}
                                                    </div>
                                                )}
                                        </div>
                                        <motion.div
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                        >
                                            <Button
                                                onClick={async () => {
                                                    await onNext(await getResultData());
                                                }}
                                                className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25"
                                            >
                                                Continue <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
