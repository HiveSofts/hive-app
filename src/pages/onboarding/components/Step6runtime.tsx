import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";
import {
    CheckCircle2, XCircle, Loader2, Download, ChevronDown,
    ChevronUp, AlertTriangle, ArrowRight,
    RefreshCw, Server, FolderOpen,
} from "lucide-react";

type OS = "windows" | "linux" | "macos";
type Arch = "x64" | "arm64";
type InstallStatus = "idle" | "downloading" | "extracting" | "done" | "error";

interface PhpVersionEntry {
    full: string;
    windows?: { url: string; size: number; type: string };
    linux?: { url: string; size: number; type: string };
}

interface NodeVersionEntry {
    full: string;
    lts: boolean;
    releaseDate: string;
    windows?: { url: string; type: string };
    linux?: { url: string; type: string };
    macos?: { x64: { url: string }; arm64: { url: string } };
}

interface PhpManifest {
    latest: string;
    php: Record<string, PhpVersionEntry>;
}

interface NodeManifest {
    latest: string;
    node: Record<string, NodeVersionEntry>;
    npm: { bundled: Record<string, string> };
}

interface RuntimeInfo {
    found: boolean;
    version?: string;
    path?: string;
    isHive?: boolean;
}

interface InstallJob {
    type: "php" | "node";
    version: string;
    status: InstallStatus;
    progress: number;
    error?: string;
    url: string;
    destPath: string;
}

interface Props {
    onNext: (data: {
        phpVersion?: string;
        nodeVersion?: string;
        phpPath?: string;
        nodePath?: string;
    }) => void;
}

const PHP_MANIFEST_URL = "https://raw.githubusercontent.com/LaraPire/hive-runtime-php/refs/heads/main/manifest.json";
const NODE_MANIFEST_URL = "https://raw.githubusercontent.com/LaraPire/hive-runtime-nodejs/refs/heads/main/manifest.json";

function formatBytes(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function hiveInstallPath(type: "php" | "node", version: string): string {
    return `${type === "php" ? "~/.hive/runtimes/php" : "~/.hive/runtimes/node"}/${version}`;
}

function getPhpDownloadUrl(entry: PhpVersionEntry, os: OS): string | null {
    if (os === "windows") return entry.windows?.url ?? null;
    if (os === "linux") return entry.linux?.url ?? null;
    return null;
}

function getNodeDownloadUrl(entry: NodeVersionEntry, os: OS, arch: Arch): string | null {
    if (os === "windows") return entry.windows?.url ?? null;
    if (os === "linux") return entry.linux?.url ?? null;
    if (os === "macos") return entry.macos?.[arch]?.url ?? null;
    return null;
}

async function detectPhp(): Promise<RuntimeInfo> {
    try {
        const result = await invoke<{ version: string; path: string; isHive: boolean }>("detect_php");
        return { found: true, version: result.version, path: result.path, isHive: result.isHive };
    } catch {
        return { found: false };
    }
}

async function detectNode(): Promise<RuntimeInfo> {
    try {
        const result = await invoke<{ version: string; path: string; isHive: boolean }>("detect_node");
        return { found: true, version: result.version, path: result.path, isHive: result.isHive };
    } catch {
        return { found: false };
    }
}

async function getInstalledHiveRuntimes(type: "php" | "node"): Promise<string[]> {
    try {
        return await invoke<string[]>("get_installed_runtimes", { type });
    } catch {
        return [];
    }
}

async function downloadAndExtract(url: string, destPath: string, onProgress: (progress: number) => void): Promise<void> {
    await invoke("download_and_extract", { url, destPath, onProgress: (progress: number) => onProgress(progress) });
}

function RuntimeCard({ label, emoji, info, loading, installedVersions, type }: {
    label: string; emoji: string; info: RuntimeInfo | null; loading: boolean;
    installedVersions: string[]; type: "php" | "node";
}) {
    const [showList, setShowList] = useState(false);

    return (
        <div className="space-y-2">
            <div className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all",
                loading ? "bg-muted/30 border-border" :
                    info?.found ? "bg-emerald-500/5 border-emerald-500/30" : "bg-red-500/5 border-red-500/30"
            )}>
                <div className="text-3xl">{emoji}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{label}</span>
                        {!loading && info && (
                            info.found
                                ? <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                                    {info.isHive ? "Hive" : "System"}
                                </Badge>
                                : <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">Not found</Badge>
                        )}
                    </div>
                    {loading
                        ? <span className="text-xs text-muted-foreground animate-pulse">Detecting...</span>
                        : info?.found
                            ? <>
                                <div className="text-xs font-mono text-muted-foreground">{info.version}</div>
                                <div className="text-[11px] font-mono text-muted-foreground/60 truncate">{info.path}</div>
                            </>
                            : <span className="text-xs text-muted-foreground">Not installed on this system</span>
                    }
                    {installedVersions.length > 0 && (
                        <button onClick={() => setShowList(!showList)} className="text-[10px] text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" />
                            {installedVersions.length} Hive runtime{installedVersions.length !== 1 ? "s" : ""} installed
                            {showList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    )}
                </div>
                <div className="shrink-0">
                    {loading
                        ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                        : info?.found
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            : <XCircle className="w-5 h-5 text-red-500" />
                    }
                </div>
            </div>

            {showList && installedVersions.length > 0 && (
                <div className="ml-4 pl-6 border-l-2 border-muted space-y-1">
                    {installedVersions.map(v => (
                        <div key={v} className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            {type === "php" ? `PHP ${v}` : `Node.js ${v}`}
                            <span className="text-[10px] text-muted-foreground/60">{hiveInstallPath(type, v)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PhpVersionPicker({ manifest, selected, onSelect, os, installed }: {
    manifest: PhpManifest; selected: string | null;
    onSelect: (v: string) => void; os: OS; installed: string[];
}) {
    const versions = Object.entries(manifest.php).reverse();

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {versions.map(([ver, entry]) => {
                const size = os === "windows" ? entry.windows?.size : entry.linux?.size;
                const isLatest = ver === manifest.latest;
                const isSelected = selected === ver;
                const isInstalled = installed.includes(ver);
                return (
                    <button key={ver} onClick={() => onSelect(ver)} disabled={isInstalled}
                            className={cn(
                                "flex flex-col gap-1 p-3 rounded-xl border text-left transition-all",
                                isInstalled && "opacity-50 cursor-not-allowed",
                                isSelected && !isInstalled
                                    ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
                            )}>
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm">PHP {ver}</span>
                            {isLatest && <Badge className="text-[9px] px-1 py-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">Latest</Badge>}
                            {isInstalled && <Badge className="text-[9px] px-1 py-0 bg-emerald-500/15 text-emerald-500 border-emerald-500/20">Installed</Badge>}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground">{entry.full}</div>
                        {size && <div className="text-[10px] text-muted-foreground/60">{formatBytes(size)}</div>}
                        <div className="text-[10px] font-mono text-muted-foreground/50">{hiveInstallPath("php", ver)}</div>
                    </button>
                );
            })}
        </div>
    );
}

function NodeVersionPicker({ manifest, selected, onSelect, installed }: {
    manifest: NodeManifest; selected: string | null;
    onSelect: (v: string) => void; os: OS; arch: Arch; installed: string[];
}) {
    const versions = Object.entries(manifest.node).reverse();
    const bundledNpm = manifest.npm.bundled;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {versions.map(([ver, entry]) => {
                const isLatest = ver === manifest.latest;
                const isSelected = selected === ver;
                const isInstalled = installed.includes(ver);
                return (
                    <button key={ver} onClick={() => onSelect(ver)} disabled={isInstalled}
                            className={cn(
                                "flex flex-col gap-1 p-3 rounded-xl border text-left transition-all",
                                isInstalled && "opacity-50 cursor-not-allowed",
                                isSelected && !isInstalled
                                    ? "border-green-500 bg-green-500/10 ring-1 ring-green-500/40"
                                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
                            )}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-sm">Node {ver}</span>
                            {isLatest && <Badge className="text-[9px] px-1 py-0 bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20">Latest</Badge>}
                            {entry.lts && <Badge className="text-[9px] px-1 py-0 bg-blue-500/15 text-blue-500 border-blue-500/20">LTS</Badge>}
                            {isInstalled && <Badge className="text-[9px] px-1 py-0 bg-emerald-500/15 text-emerald-500 border-emerald-500/20">Installed</Badge>}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground">v{entry.full}</div>
                        <div className="text-[10px] text-muted-foreground/60">npm {bundledNpm[ver] ?? "—"}</div>
                        <div className="text-[10px] font-mono text-muted-foreground/50">{hiveInstallPath("node", ver)}</div>
                    </button>
                );
            })}
        </div>
    );
}

function InstallProgress({ jobs }: { jobs: InstallJob[] }) {
    if (jobs.length === 0) return null;

    const statusLabel: Record<InstallStatus, string> = {
        idle: "Queued",
        downloading: "Downloading...",
        extracting: "Extracting...",
        done: "Installed",
        error: "Failed",
    };

    const statusColor: Record<InstallStatus, string> = {
        idle: "text-muted-foreground",
        downloading: "text-amber-500",
        extracting: "text-blue-500",
        done: "text-emerald-500",
        error: "text-red-500",
    };

    return (
        <div className="rounded-xl border bg-zinc-950 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[11px] text-zinc-500 font-mono">hive — runtime installer</span>
            </div>
            <div className="p-4 space-y-3 font-mono text-xs">
                {jobs.map((job, i) => (
                    <div key={i} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500">❯</span>
                            <span className="text-zinc-200">hive install {job.type} {job.version}</span>
                            <span className={cn("ml-auto", statusColor[job.status])}>{statusLabel[job.status]}</span>
                        </div>
                        <div className="text-zinc-500 pl-4 text-[10px]">→ {job.url}</div>
                        <div className="text-zinc-500 pl-4">→ {job.destPath}</div>
                        {(job.status === "downloading" || job.status === "extracting") && (
                            <>
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full transition-all duration-300", job.status === "downloading" ? "bg-amber-500" : "bg-blue-500")} style={{ width: `${job.progress}%` }} />
                                </div>
                                <div className="text-zinc-600 pl-4 text-[10px]">{job.progress}%</div>
                            </>
                        )}
                        {job.status === "done" && <div className="text-emerald-400 pl-4">✔ Installed at {job.destPath}</div>}
                        {job.status === "error" && <div className="text-red-400 pl-4">✖ {job.error}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function Step6Runtime({ onNext }: Props) {
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

    useEffect(() => {
        const init = async () => {
            try {
                const detectedOs = await invoke<OS>("get_os");
                const detectedArch = await invoke<Arch>("get_arch");
                setOs(detectedOs);
                setArch(detectedArch);
            } catch { }

            const [phpDetection, nodeDetection, phpInstalled, nodeInstalled] = await Promise.all([
                detectPhp(), detectNode(), getInstalledHiveRuntimes("php"), getInstalledHiveRuntimes("node")
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
                const [phpRes, nodeRes] = await Promise.all([fetch(PHP_MANIFEST_URL), fetch(NODE_MANIFEST_URL)]);
                const phpData: PhpManifest = await phpRes.json();
                const nodeData: NodeManifest = await nodeRes.json();
                setPhpManifest(phpData);
                setNodeManifest(nodeData);
                if (!selectedPhp) {
                    const notInstalled = Object.keys(phpData.php).filter(v => !installedPhp.includes(v));
                    setSelectedPhp(notInstalled[0] || phpData.latest);
                }
                if (!selectedNode) {
                    const notInstalled = Object.keys(nodeData.node).filter(v => !installedNode.includes(v));
                    setSelectedNode(notInstalled[0] || nodeData.latest);
                }
            } catch {
                setManifestError("Failed to load manifests. Check your internet connection.");
            }
            setManifestLoading(false);
        };
        load();
    }, [detecting, installedPhp, installedNode]);

    const startInstall = async () => {
        const toInstall: { type: "php" | "node"; version: string; url: string; destPath: string }[] = [];

        if (selectedPhp && !installedPhp.includes(selectedPhp) && phpManifest) {
            const entry = phpManifest.php[selectedPhp];
            const url = getPhpDownloadUrl(entry, os);
            if (url) toInstall.push({ type: "php", version: selectedPhp, url, destPath: hiveInstallPath("php", selectedPhp) });
        }

        if (selectedNode && !installedNode.includes(selectedNode) && nodeManifest) {
            const entry = nodeManifest.node[selectedNode];
            const url = getNodeDownloadUrl(entry, os, arch);
            if (url) toInstall.push({ type: "node", version: selectedNode, url, destPath: hiveInstallPath("node", selectedNode) });
        }

        if (toInstall.length === 0) { setAllDone(true); return; }

        const initial: InstallJob[] = toInstall.map(j => ({ ...j, status: "idle", progress: 0 }));
        setJobs(initial);

        for (let i = 0; i < initial.length; i++) {
            const job = initial[i];
            const updateJob = (updater: (j: InstallJob) => InstallJob) => {
                setJobs(prev => prev.map((j, idx) => idx === i ? updater(j) : j));
            };

            updateJob(j => ({ ...j, status: "downloading", progress: 0 }));

            try {
                await downloadAndExtract(job.url, job.destPath, (progress: number) => {
                    updateJob(j => ({ ...j, progress }));
                });
                updateJob(j => ({ ...j, status: "done", progress: 100 }));
                if (job.type === "php") setInstalledPhp(prev => [...prev, job.version]);
                else setInstalledNode(prev => [...prev, job.version]);
            } catch (e: any) {
                updateJob(j => ({ ...j, status: "error", error: String(e) }));
            }
        }
        setAllDone(true);
    };

    const bothPresent = (phpInfo?.found || installedPhp.length > 0) && (nodeInfo?.found || installedNode.length > 0);
    const needsInstall = (selectedPhp && !installedPhp.includes(selectedPhp)) || (selectedNode && !installedNode.includes(selectedNode));

    const getResultData = () => ({
        phpVersion: phpInfo?.found ? phpInfo.version : selectedPhp ?? undefined,
        nodeVersion: nodeInfo?.found ? nodeInfo.version : selectedNode ?? undefined,
        phpPath: phpInfo?.found ? phpInfo.path : (selectedPhp ? hiveInstallPath("php", selectedPhp) : undefined),
        nodePath: nodeInfo?.found ? nodeInfo.path : (selectedNode ? hiveInstallPath("node", selectedNode) : undefined),
    });

    return (
        <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-amber-50 to-white dark:from-zinc-950 dark:to-zinc-900 p-4">
            <Card className="w-full max-w-3xl shadow-2xl">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Server className="w-5 h-5 text-amber-500" /></div>
                        <div><CardTitle className="text-xl">Runtime Setup</CardTitle><p className="text-xs text-muted-foreground mt-0.5">Install PHP and Node.js runtimes for Hive</p></div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                    <div className="space-y-2">
                        <RuntimeCard label="PHP" emoji="🐘" info={phpInfo} loading={detecting} installedVersions={installedPhp} type="php" />
                        <RuntimeCard label="Node.js" emoji="🟩" info={nodeInfo} loading={detecting} installedVersions={installedNode} type="node" />
                    </div>

                    {!detecting && bothPresent && !allDone && jobs.length === 0 && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            <div className="flex-1 text-sm">Runtimes are available. You can install additional versions below.</div>
                            <Button onClick={() => onNext(getResultData())} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0">Continue <ArrowRight className="w-4 h-4" /></Button>
                        </div>
                    )}

                    {!detecting && jobs.length === 0 && (
                        <>
                            {manifestLoading && <div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Fetching available versions...</div>}
                            {manifestError && (<div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex items-center gap-2 text-sm text-red-500"><AlertTriangle className="w-4 h-4 shrink-0" />{manifestError}<Button size="sm" variant="ghost" className="ml-auto gap-1" onClick={() => window.location.reload()}><RefreshCw className="w-3 h-3" />Retry</Button></div>)}

                            {phpManifest && (
                                <div className="space-y-2">
                                    <button onClick={() => setShowPhpPicker(v => !v)} className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                                        <span className="text-xl">🐘</span>
                                        <div className="flex-1"><div className="text-sm font-semibold">Install PHP</div><div className="text-[11px] text-muted-foreground">{selectedPhp ? `PHP ${selectedPhp} → ${hiveInstallPath("php", selectedPhp)}` : "Select version to install"}</div></div>
                                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">{selectedPhp ? `PHP ${selectedPhp}` : "Choose"}</Badge>
                                        {showPhpPicker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    {showPhpPicker && <PhpVersionPicker manifest={phpManifest} selected={selectedPhp} onSelect={setSelectedPhp} os={os} installed={installedPhp} />}
                                </div>
                            )}

                            {nodeManifest && (
                                <div className="space-y-2">
                                    <button onClick={() => setShowNodePicker(v => !v)} className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                                        <span className="text-xl">🟩</span>
                                        <div className="flex-1"><div className="text-sm font-semibold">Install Node.js</div><div className="text-[11px] text-muted-foreground">{selectedNode ? `Node ${selectedNode} → ${hiveInstallPath("node", selectedNode)}` : "Select version to install"}</div></div>
                                        <div className="flex items-center gap-1.5">{selectedNode && nodeManifest.node[selectedNode]?.lts && <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px]">LTS</Badge>}<Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">{selectedNode ? `Node ${selectedNode}` : "Choose"}</Badge></div>
                                        {showNodePicker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    {showNodePicker && <NodeVersionPicker manifest={nodeManifest} selected={selectedNode} onSelect={setSelectedNode} os={os} arch={arch} installed={installedNode} />}
                                </div>
                            )}

                            <Button onClick={startInstall} disabled={!needsInstall || manifestLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"><Download className="w-4 h-4" />Install Selected Runtimes</Button>
                        </>
                    )}

                    {jobs.length > 0 && <InstallProgress jobs={jobs} />}

                    {allDone && (
                        <div className="space-y-3">
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm"><CheckCircle2 className="w-4 h-4" />Runtime setup complete</div>
                                {selectedPhp && installedPhp.includes(selectedPhp) && <div className="text-xs font-mono">PHP {selectedPhp} → {hiveInstallPath("php", selectedPhp)}</div>}
                                {selectedNode && installedNode.includes(selectedNode) && <div className="text-xs font-mono">Node {selectedNode} → {hiveInstallPath("node", selectedNode)}</div>}
                            </div>
                            <Button onClick={() => onNext(getResultData())} className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2">Continue <ArrowRight className="w-4 h-4" /></Button>
                        </div>
                    )}

                    {!detecting && !allDone && jobs.length === 0 && (
                        <button onClick={() => onNext(getResultData())} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1">Skip for now — I'll manage runtimes manually</button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}