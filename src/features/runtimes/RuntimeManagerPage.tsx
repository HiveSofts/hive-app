import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    AlertCircle,
    CloudOff,
    PackageOpen,
    RefreshCw,
    SearchX,
    ShieldCheck,
    Wand2,
    Wifi,
    WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import { CategoryBar, type CategoryChip } from "./components/CategoryBar";
import { CatalogCard } from "./components/CatalogCard";
import { InstallProgressPanel } from "./components/InstallProgressPanel";
import { ResultCard } from "./components/ResultCard";
import { ResultDetail } from "./components/ResultDetail";
import { SearchBar } from "./components/SearchBar";
import {
    cancelPackageInstall,
    checkInternet,
    detectManagers,
    getIndexFreshness,
    getPackageCatalog,
    getPackageStatuses,
    installCatalogTool,
    refreshPackageIndex,
    searchSystemPackages,
    uninstallCatalogTool,
    universalInstall,
    universalUninstall,
    universalUpdate,
    updateCatalogTool,
} from "./services/toolManager.service";
import type {
    CatalogTool,
    DetectionResult,
    InstallProgress,
    PackageManagerKind,
    RepoIndexProgress,
    SearchResult,
} from "./types/package.types";

const ALL_CATEGORY = "All";

export default function RuntimeManagerPage() {
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const [detection, setDetection] = useState<DetectionResult | null>(null);
    const [catalog, setCatalog] = useState<CatalogTool[]>([]);
    const [statuses, setStatuses] = useState<Record<string, { installed: boolean; version: string | null }>>({});
    const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);

    const [detail, setDetail] = useState<SearchResult | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const [progressByTool, setProgressByTool] = useState<Record<string, InstallProgress[]>>({});
    const [busyTools, setBusyTools] = useState<Record<string, boolean>>({});

    // --- Index freshness + network awareness (Online vs Offline behavior) ------
    const [indexFreshness, setIndexFreshness] = useState<string | null>(null);
    const [refreshingIndex, setRefreshingIndex] = useState(false);
    const [indexRefreshMsg, setIndexRefreshMsg] = useState<string | null>(null);
    const [online, setOnline] = useState<boolean | null>(null);

    const reqId = useRef(0);

    const recommended = detection?.recommended?.id;
    const isSearching = query.trim().length > 0;

    /// Format an RFC3339 timestamp as a short relative string ("just now",
    /// "5m ago", "2h ago", "3d ago", or an absolute date if old).
    const formatFreshness = useCallback((iso: string): string => {
        const then = new Date(iso).getTime();
        if (Number.isNaN(then)) return iso;
        const diff = Date.now() - then;
        const sec = Math.floor(diff / 1000);
        if (sec < 60) return "just now";
        const min = Math.floor(sec / 60);
        if (min < 60) return `${min}m ago`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `${hr}h ago`;
        const day = Math.floor(hr / 24);
        if (day < 7) return `${day}d ago`;
        return new Date(iso).toLocaleDateString();
    }, []);

    /// Load the recommended manager's last-index-refresh timestamp.
    const loadFreshness = useCallback(() => {
        const mgr = detection?.recommended?.id;
        if (!mgr) {
            setIndexFreshness(null);
            return;
        }
        getIndexFreshness(mgr)
            .then(setIndexFreshness)
            .catch(() => setIndexFreshness(null));
    }, [detection]);

    // --- Detection + catalog + status on mount ------------------------------
    const loadStatic = useCallback(() => {
        detectManagers()
            .then(setDetection)
            .catch(() => setDetection(null));
        getPackageCatalog()
            .then((c) => setCatalog(c.tools))
            .catch(() => setCatalog([]));
        getPackageStatuses()
            .then((s) => {
                const map: Record<string, { installed: boolean; version: string | null }> = {};
                for (const st of s) map[st.tool_id] = { installed: st.installed, version: st.version };
                setStatuses(map);
            })
            .catch(() => setStatuses({}));
        checkInternet().then(setOnline).catch(() => setOnline(null));
    }, []);

    useEffect(() => {
        loadStatic();
    }, [loadStatic]);

    // Once detection resolves, surface the recommended manager's index freshness.
    useEffect(() => {
        loadFreshness();
    }, [loadFreshness]);

    const categories = useMemo<CategoryChip[]>(() => {
        const counts = new Map<string, number>();
        for (const t of catalog) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
        const chips: CategoryChip[] = [{ label: ALL_CATEGORY, count: catalog.length }];
        for (const [label, count] of counts) chips.push({ label, count });
        return chips;
    }, [catalog]);

    const filteredCatalog = useMemo(
        () =>
            activeCategory === ALL_CATEGORY
                ? catalog
                : catalog.filter((t) => t.category === activeCategory),
        [catalog, activeCategory]
    );

    // --- Live cross-manager search (debounced 300ms) ------------------------
    const runSearch = useCallback(async (term: string) => {
        const id = ++reqId.current;
        if (!term.trim()) {
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }
        setSearchLoading(true);
        try {
            const r = await searchSystemPackages(term);
            if (id === reqId.current) setSearchResults(r);
        } catch {
            if (id === reqId.current) setSearchResults([]);
        } finally {
            if (id === reqId.current) setSearchLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isSearching) {
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }
        const h = setTimeout(() => runSearch(query), 300);
        return () => clearTimeout(h);
    }, [query, isSearching, runSearch]);

    // --- Progress accumulation ----------------------------------------------
    const appendProgress = useCallback((p: InstallProgress) => {
        setProgressByTool((prev) => {
            const list = prev[p.tool_id] ? [...prev[p.tool_id], p] : [p];
            return { ...prev, [p.tool_id]: list };
        });
    }, []);

    const finishRefresh = useCallback(
        (term: string) => {
            if (term.trim()) void runSearch(term);
            else loadStatic();
        },
        [runSearch, loadStatic]
    );

    // --- Install / update / uninstall (live results) ------------------------
    const handleInstall = useCallback(
        async (r: SearchResult, version?: string) => {
            if (busyTools[r.canonical_id]) return;
            setBusyTools((b) => ({ ...b, [r.canonical_id]: true }));
            setProgressByTool((p) => ({ ...p, [r.canonical_id]: [] }));
            try {
                await universalInstall(r.source_manager, r.name, r.canonical_id, version, appendProgress);
            } catch (e) {
                appendProgress({
                    tool_id: r.canonical_id,
                    action: "install",
                    step: "error",
                    message: typeof e === "string" ? e : "Install failed",
                    progress: null,
                    is_stderr: true,
                    log: null,
                    command: null,
                    failure_reason: "Install failed",
                    exit_code: null,
                    done: true,
                    success: false,
                });
            } finally {
                setBusyTools((b) => ({ ...b, [r.canonical_id]: false }));
                finishRefresh(query);
            }
        },
        [appendProgress, busyTools, query, finishRefresh]
    );

    const handleUpdate = useCallback(
        async (r: SearchResult) => {
            if (busyTools[r.canonical_id]) return;
            setBusyTools((b) => ({ ...b, [r.canonical_id]: true }));
            setProgressByTool((p) => ({ ...p, [r.canonical_id]: [] }));
            try {
                await universalUpdate(r.source_manager, r.name, r.canonical_id, appendProgress);
            } catch (e) {
                appendProgress({
                    tool_id: r.canonical_id,
                    action: "update",
                    step: "error",
                    message: typeof e === "string" ? e : "Update failed",
                    progress: null,
                    is_stderr: true,
                    log: null,
                    command: null,
                    failure_reason: "Update failed",
                    exit_code: null,
                    done: true,
                    success: false,
                });
            } finally {
                setBusyTools((b) => ({ ...b, [r.canonical_id]: false }));
                finishRefresh(query);
            }
        },
        [appendProgress, busyTools, query, finishRefresh]
    );

    const handleUninstall = useCallback(
        async (r: SearchResult) => {
            if (busyTools[r.canonical_id]) return;
            try {
                await universalUninstall(r.source_manager, r.name);
            } catch {
                /* ignore */
            } finally {
                finishRefresh(query);
            }
        },
        [busyTools, query, finishRefresh]
    );

    // --- Install / update / uninstall (catalog tools) -----------------------
    const handleCatalogInstall = useCallback(
        async (tool: CatalogTool, version?: string) => {
            if (busyTools[tool.id]) return;
            setBusyTools((b) => ({ ...b, [tool.id]: true }));
            setProgressByTool((p) => ({ ...p, [tool.id]: [] }));
            try {
                await installCatalogTool(tool.id, version ?? "", appendProgress);
            } catch (e) {
                appendProgress({
                    tool_id: tool.id,
                    action: "install",
                    step: "error",
                    message: typeof e === "string" ? e : "Install failed",
                    progress: null,
                    is_stderr: true,
                    log: null,
                    command: null,
                    failure_reason: "Install failed",
                    exit_code: null,
                    done: true,
                    success: false,
                });
            } finally {
                setBusyTools((b) => ({ ...b, [tool.id]: false }));
                finishRefresh(query);
            }
        },
        [appendProgress, busyTools, finishRefresh, query]
    );

    const handleCatalogUpdate = useCallback(
        async (tool: CatalogTool) => {
            if (busyTools[tool.id]) return;
            setBusyTools((b) => ({ ...b, [tool.id]: true }));
            setProgressByTool((p) => ({ ...p, [tool.id]: [] }));
            try {
                await updateCatalogTool(tool.id, "", appendProgress);
            } catch (e) {
                appendProgress({
                    tool_id: tool.id,
                    action: "update",
                    step: "error",
                    message: typeof e === "string" ? e : "Update failed",
                    progress: null,
                    is_stderr: true,
                    log: null,
                    command: null,
                    failure_reason: "Update failed",
                    exit_code: null,
                    done: true,
                    success: false,
                });
            } finally {
                setBusyTools((b) => ({ ...b, [tool.id]: false }));
                finishRefresh(query);
            }
        },
        [appendProgress, busyTools, finishRefresh, query]
    );

    const handleCatalogUninstall = useCallback(
        async (tool: CatalogTool) => {
            if (busyTools[tool.id]) return;
            try {
                await uninstallCatalogTool(tool.id, "");
            } catch {
                /* ignore */
            } finally {
                finishRefresh(query);
            }
        },
        [busyTools, finishRefresh, query]
    );

    const handleCancel = useCallback(async (id: string) => {
        await cancelPackageInstall(id);
    }, []);

    /// Refresh the recommended manager's repository index (explicit Refresh
    /// button). Streams progress into a small inline status line.
    const handleRefreshIndex = useCallback(async () => {
        const mgr = detection?.recommended?.id;
        if (!mgr || refreshingIndex) return;
        setRefreshingIndex(true);
        setIndexRefreshMsg("Refreshing repository index…");
        try {
            await refreshPackageIndex(mgr, (p: RepoIndexProgress) => {
                if (!p.done) setIndexRefreshMsg(p.message || "Refreshing repository index…");
            });
            setIndexRefreshMsg("Repository index updated");
            loadFreshness();
            await checkInternet().then(setOnline).catch(() => setOnline(null));
        } catch {
            setIndexRefreshMsg("Index refresh failed — check your connection");
        } finally {
            setRefreshingIndex(false);
        }
    }, [detection, refreshingIndex, loadFreshness]);

    const openDetail = useCallback((r: SearchResult) => {
        setDetail(r);
        setDetailOpen(true);
    }, []);

    const needsElevation = (m: PackageManagerKind) =>
        detection?.all_found.find((x) => x.id === m)?.requires_elevation ?? false;

    const activeProgress = Object.values(progressByTool).filter((l) => l.length > 0).flat();

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
                <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Wand2 className="w-5 h-5 text-white/80" />
                        </div>
                        <div>
                            <h1 className="text-base font-semibold tracking-tight">Runtimes</h1>
                            <p className="text-[11px] text-muted-foreground">
                                Browse and install runtimes, tools &amp; packages
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <DetectionBadge detection={detection} />
                        <NetworkBadge online={online} />
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadStatic()}
                            className="h-7 text-xs gap-1.5 border-white/10 bg-white/5"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
                        </Button>
                    </div>
                </div>

                <div className="px-6 pb-3">
                    <SearchBar
                        value={query}
                        onChange={setQuery}
                        loading={searchLoading}
                        placeholder="Search any package, runtime, or tool (apt, brew, winget…)"
                    />
                    <FreshnessBar
                        display={detection?.recommended?.display ?? null}
                        freshness={indexFreshness}
                        refreshing={refreshingIndex}
                        message={indexRefreshMsg}
                        formatFreshness={formatFreshness}
                        onRefresh={handleRefreshIndex}
                    />
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col">
                <div className="px-6 py-3 border-b border-white/5">
                    <CategoryBar
                        categories={categories}
                        active={activeCategory}
                        onSelect={(c) => {
                            setQuery("");
                            setActiveCategory(c);
                        }}
                    />
                </div>

                <ScrollArea className="flex-1">
                    <div className="px-6 py-4 space-y-3">
                        {activeProgress.length > 0 && (
                            <InstallProgressPanel
                                active={activeProgress}
                                onCancel={() => {
                                    const running = Object.entries(progressByTool).find(
                                        ([, l]) => l.length > 0 && !l[l.length - 1].done
                                    );
                                    if (running) void handleCancel(running[0]);
                                }}
                            />
                        )}

                        {/* --- Live search results --- */}
                        {isSearching ? (
                            searchLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <Skeleton key={i} className="h-[150px] w-full rounded-xl" />
                                    ))}
                                </div>
                            ) : searchResults.length === 0 ? (
                                <EmptyState searching query={query} />
                            ) : (
                                <>
                                    <SectionLabel
                                        icon={<SearchX className="w-3.5 h-3.5" />}
                                        text={`Live results for “${query}”`}
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                                        {searchResults.map((r) => (
                                            <ResultCard
                                                key={r.canonical_id}
                                                result={r}
                                                disabled={busyTools[r.canonical_id]}
                                                onClick={() => openDetail(r)}
                                                onInstall={handleInstall}
                                                onUpdate={handleUpdate}
                                                onUninstall={handleUninstall}
                                            />
                                        ))}
                                    </div>
                                </>
                            )
                        ) : /* --- Default: curated catalog browse --- */
                        filteredCatalog.length === 0 ? (
                            <EmptyState searching={false} query="" />
                        ) : (
                            <>
                                <SectionLabel
                                    icon={<PackageOpen className="w-3.5 h-3.5" />}
                                    text={
                                        activeCategory === ALL_CATEGORY
                                            ? "Curated tools"
                                            : activeCategory
                                    }
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                                    {filteredCatalog.map((tool) => (
                                        <CatalogCard
                                            key={tool.id}
                                            tool={tool}
                                            status={statuses[tool.id]}
                                            detected={recommended}
                                            busy={busyTools[tool.id]}
                                            onInstall={handleCatalogInstall}
                                            onUpdate={handleCatalogUpdate}
                                            onUninstall={handleCatalogUninstall}
                                            onSearch={(name) => {
                                                setQuery(name);
                                            }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </ScrollArea>
            </div>

            <ResultDetail
                result={detail}
                open={detailOpen}
                onOpenChange={setDetailOpen}
                onInstall={handleInstall}
                onUpdate={handleUpdate}
                onUninstall={handleUninstall}
                busy={detail ? busyTools[detail.canonical_id] : false}
                elevationRequired={detail ? needsElevation(detail.source_manager) : false}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/40 pt-1">
            {icon}
            <span>{text}</span>
        </div>
    );
}

function DetectionBadge({ detection }: { detection: DetectionResult | null }) {
    if (!detection) {
        return (
            <Badge variant="outline" className="text-[11px] gap-1 border-white/10 text-white/40">
                <AlertCircle className="w-3 h-3" />
                Detecting…
            </Badge>
        );
    }
    if (detection.uses_static_fallback || !detection.recommended) {
        return (
            <Badge
                variant="outline"
                className="text-[11px] gap-1 border-amber-500/30 text-amber-300"
            >
                <AlertCircle className="w-3 h-3" />
                No manager — static only
            </Badge>
        );
    }
    const m = detection.recommended;
    return (
        <Badge
            variant="outline"
            className="text-[11px] gap-1 border-white/15 text-white/60"
        >
            <ShieldCheck className="w-3 h-3 text-green-400" />
            {m.display}
            {m.requires_elevation && <span className="text-white/30">· sudo</span>}
        </Badge>
    );
}

/// Small connectivity indicator. `null` = unknown (probe still running).
function NetworkBadge({ online }: { online: boolean | null }) {
    if (online === null) {
        return (
            <Badge variant="outline" className="text-[11px] gap-1 border-white/10 text-white/40">
                <CloudOff className="w-3 h-3 opacity-40" />
                Network…
            </Badge>
        );
    }
    if (online) {
        return (
            <Badge variant="outline" className="text-[11px] gap-1 border-green-500/30 text-green-400">
                <Wifi className="w-3 h-3" />
                Online
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="text-[11px] gap-1 border-amber-500/30 text-amber-300">
            <WifiOff className="w-3 h-3" />
            Offline
        </Badge>
    );
}

/// Surfaces the recommended manager's index freshness + a manual Refresh that
/// pulls the latest repository metadata. Search itself stays offline-capable.
function FreshnessBar({
    display,
    freshness,
    refreshing,
    message,
    formatFreshness,
    onRefresh,
}: {
    display: string | null;
    freshness: string | null;
    refreshing: boolean;
    message: string | null;
    formatFreshness: (iso: string) => string;
    onRefresh: () => void;
}) {
    const hint = freshness ? `last updated ${formatFreshness(freshness)}` : "index never refreshed";
    return (
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-white/40">
            <span className="flex items-center gap-1.5 min-w-0">
                <RefreshCw className="w-3 h-3 shrink-0 opacity-60" />
                <span className="truncate">
                    {display ? `${display} repository index ` : "Repository index "}
                    {message ? message : hint}
                </span>
            </span>
            <Button
                size="sm"
                variant="ghost"
                disabled={refreshing || !display}
                onClick={onRefresh}
                className="h-6 text-[11px] gap-1 text-white/50 hover:text-white/80 hover:bg-white/5 shrink-0"
            >
                <RefreshCw className={refreshing ? "w-3 h-3 animate-spin" : "w-3 h-3"} />
                {refreshing ? "Refreshing…" : "Refresh index"}
            </Button>
        </div>
    );
}

function EmptyState({ searching, query }: { searching: boolean; query: string }) {
    return (
        <div className="text-center py-16 text-muted-foreground">
            {searching ? (
                <>
                    <SearchX className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No packages matched “{query}”.</p>
                    <p className="text-[12px] mt-1 opacity-70">
                        Try a different term, or clear the search to browse curated tools.
                    </p>
                </>
            ) : (
                <>
                    <PackageOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No tools in this category yet.</p>
                </>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Catalog tool card lives in ./components/CatalogCard.tsx
