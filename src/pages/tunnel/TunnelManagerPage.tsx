import { useEffect, useState } from "react";

import {
    Activity,
    BarChart3,
    Copy,
    ExternalLink,
    Eye,
    EyeOff,
    Lock,
    Play,
    RefreshCw,
    Settings,
    Share2,
    Square,
    Wifi,
    X,
    Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Project {
    id: number;
    name: string;
    url: string;
    port: number;
    status: string;
}

interface TunnelSession {
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

interface RequestLog {
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

const MOCK_PROJECTS: Project[] = [
    { id: 1, name: "my-blog", url: "my-blog.test", port: 8000, status: "running" },
    { id: 2, name: "dashboard-app", url: "dashboard-app.test", port: 3000, status: "running" },
    { id: 3, name: "api-gateway", url: "api-gateway.test", port: 3001, status: "stopped" },
];

const MOCK_REQUESTS: RequestLog[] = [
    {
        id: "1",
        method: "GET",
        path: "/api/posts",
        statusCode: 200,
        ip: "185.123.45.67",
        timestamp: "2 min ago",
        duration: "12ms",
    },
    {
        id: "2",
        method: "POST",
        path: "/webhook/github",
        statusCode: 201,
        ip: "140.82.112.3",
        timestamp: "5 min ago",
        duration: "45ms",
        body: '{"ref":"refs/heads/main","commits":[{"id":"abc123","message":"Update"}]}',
    },
    {
        id: "3",
        method: "GET",
        path: "/api/users/42",
        statusCode: 404,
        ip: "192.168.1.1",
        timestamp: "12 min ago",
        duration: "8ms",
    },
    {
        id: "4",
        method: "POST",
        path: "/webhook/stripe",
        statusCode: 200,
        ip: "54.187.25.1",
        timestamp: "18 min ago",
        duration: "234ms",
        body: '{"id":"evt_123","type":"payment_intent.succeeded"}',
    },
    {
        id: "5",
        method: "PUT",
        path: "/api/posts/15",
        statusCode: 200,
        ip: "185.123.45.67",
        timestamp: "25 min ago",
        duration: "23ms",
    },
];

const generateSessionUrl = (projectName: string): string => {
    const random = Math.random().toString(36).substring(2, 8);
    return `https://${projectName}-${random}.expose.dev`;
};

const getStatusColor = (statusCode: number): string => {
    if (statusCode >= 200 && statusCode < 300) return "text-emerald-500";
    if (statusCode >= 400 && statusCode < 500) return "text-yellow-500";
    if (statusCode >= 500) return "text-red-500";
    return "text-muted-foreground";
};

function ActiveTunnel({
    session,
    onStop,
    onCopyUrl,
}: {
    session: TunnelSession | null;
    onStop: () => void;
    onCopyUrl: () => void;
}) {
    const [showAuth, setShowAuth] = useState(false);

    if (!session) return null;

    return (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-semibold">Tunnel Active</span>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                        {session.projectName}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={onStop}
                    >
                        <Square className="w-3 h-3" /> Stop Tunnel
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Public URL
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono bg-muted px-3 py-2 rounded-lg flex-1 break-all">
                        {session.url}
                    </code>
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onCopyUrl}>
                        <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1"
                        onClick={() => window.open(session.url, "_blank")}
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Requests</div>
                    <div className="text-sm font-mono font-semibold">
                        {session.requests.toLocaleString()}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Data Transfer</div>
                    <div className="text-sm font-mono font-semibold">
                        {session.bytesTransferred}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Uptime</div>
                    <div className="text-sm font-mono font-semibold">{session.uptime}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Status</div>
                    <div className="text-sm font-mono font-semibold text-emerald-500">
                        Connected
                    </div>
                </div>
            </div>

            {session.authEnabled && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 text-xs">
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span className="font-medium">Authentication Enabled</span>
                        <button
                            onClick={() => setShowAuth(!showAuth)}
                            className="ml-auto text-muted-foreground hover:text-foreground"
                        >
                            {showAuth ? (
                                <EyeOff className="w-3 h-3" />
                            ) : (
                                <Eye className="w-3 h-3" />
                            )}
                        </button>
                    </div>
                    {showAuth && (
                        <div className="mt-2 text-[11px] font-mono space-y-1">
                            <div>Username: {session.authUsername}</div>
                            <div>Password: {session.authPassword}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StartTunnelForm({
    projects,
    onStart,
}: {
    projects: Project[];
    onStart: (data: {
        projectId: number;
        authEnabled: boolean;
        username: string;
        password: string;
    }) => void;
}) {
    const [selectedProject, setSelectedProject] = useState<number | null>(null);
    const [authEnabled, setAuthEnabled] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const availableProjects = projects.filter((p) => p.status === "running");

    return (
        <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">Start New Tunnel</span>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                        Select Project
                    </label>
                    <Select onValueChange={(v) => setSelectedProject(parseInt(v))}>
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Choose a running project..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableProjects.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                    {p.name} → :{p.port}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                        <div className="text-sm font-medium">Authentication</div>
                        <div className="text-[11px] text-muted-foreground">
                            Password protect your tunnel
                        </div>
                    </div>
                    <Switch checked={authEnabled} onCheckedChange={setAuthEnabled} />
                </div>

                {authEnabled && (
                    <div className="space-y-2 pl-3 border-l-2 border-amber-500/30">
                        <Input
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="h-8 text-xs"
                        />
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                )}

                <Button
                    onClick={() =>
                        selectedProject &&
                        onStart({ projectId: selectedProject, authEnabled, username, password })
                    }
                    disabled={!selectedProject}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                    <Play className="w-4 h-4" /> Start Tunnel
                </Button>
            </div>
        </div>
    );
}

function RequestsPanel({ requests, onClear }: { requests: RequestLog[]; onClear: () => void }) {
    const [filter, setFilter] = useState<number | "all">("all");
    const filtered =
        filter === "all"
            ? requests
            : requests.filter((r) => Math.floor(r.statusCode / 100) === filter);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex gap-1">
                    {[
                        { value: "all", label: "All", count: requests.length },
                        {
                            value: 2,
                            label: "2xx",
                            count: requests.filter((r) => r.statusCode >= 200 && r.statusCode < 300)
                                .length,
                        },
                        {
                            value: 4,
                            label: "4xx",
                            count: requests.filter((r) => r.statusCode >= 400 && r.statusCode < 500)
                                .length,
                        },
                        {
                            value: 5,
                            label: "5xx",
                            count: requests.filter((r) => r.statusCode >= 500).length,
                        },
                    ].map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value as any)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${filter === f.value ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                        >
                            {f.label} ({f.count})
                        </button>
                    ))}
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] gap-1"
                    onClick={onClear}
                >
                    <X className="w-3 h-3" />
                    Clear
                </Button>
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {filtered.map((req) => (
                    <div
                        key={req.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors text-xs"
                    >
                        <span
                            className={`font-mono font-bold w-12 ${getStatusColor(req.statusCode)}`}
                        >
                            {req.statusCode}
                        </span>
                        <span className="font-mono font-semibold text-emerald-500 w-14">
                            {req.method}
                        </span>
                        <span className="font-mono text-foreground/80 flex-1 truncate">
                            {req.path}
                        </span>
                        <span className="text-muted-foreground text-[10px]">{req.ip}</span>
                        <span className="text-muted-foreground text-[10px]">{req.duration}</span>
                        <span className="text-muted-foreground text-[10px]">{req.timestamp}</span>
                        {req.body && (
                            <button className="p-1 rounded hover:bg-muted">
                                <Eye className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function WebhookInspector({ requests }: { requests: RequestLog[] }) {
    const webhooks = requests.filter(
        (r) => r.path.includes("/webhook") || r.path.includes("/hook")
    );
    const [selected, setSelected] = useState<RequestLog | null>(null);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {webhooks.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        No webhook requests received yet
                    </div>
                )}
                {webhooks.map((w) => (
                    <button
                        key={w.id}
                        onClick={() => setSelected(w)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === w.id ? "border-amber-500 bg-amber-500/5" : "border-border hover:bg-muted/50"}`}
                    >
                        <div className="flex items-center gap-2">
                            <Badge
                                variant="outline"
                                className={`text-[9px] ${getStatusColor(w.statusCode)}`}
                            >
                                {w.statusCode}
                            </Badge>
                            <span className="text-xs font-mono">{w.method}</span>
                            <span className="text-[11px] font-mono text-muted-foreground flex-1 truncate">
                                {w.path}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{w.timestamp}</span>
                        </div>
                    </button>
                ))}
            </div>
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-medium">Request Details</span>
                    {selected && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Replay
                        </Button>
                    )}
                </div>
                <div className="p-4">
                    {selected ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground">Method:</span>
                                <span className="font-mono font-semibold">{selected.method}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground">Path:</span>
                                <span className="font-mono break-all">{selected.path}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground">Status:</span>
                                <span className={getStatusColor(selected.statusCode)}>
                                    {selected.statusCode}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground">IP:</span>
                                <span className="font-mono">{selected.ip}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground">Duration:</span>
                                <span className="font-mono">{selected.duration}</span>
                            </div>
                            {selected.body && (
                                <div className="space-y-1">
                                    <div className="text-xs font-mono text-muted-foreground">
                                        Body:
                                    </div>
                                    <pre className="text-[11px] font-mono bg-muted p-2 rounded-lg overflow-auto max-h-[150px]">
                                        {selected.body}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                            Select a request to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatisticsPanel({ session }: { session: TunnelSession | null }) {
    const [history] = useState([
        { time: "14:00", req: 12 },
        { time: "14:15", req: 8 },
        { time: "14:30", req: 23 },
        { time: "14:45", req: 15 },
        { time: "15:00", req: 31 },
        { time: "15:15", req: 19 },
        { time: "15:30", req: 27 },
        { time: "15:45", req: 14 },
    ]);

    if (!session)
        return (
            <div className="text-center py-12 text-muted-foreground">
                Start a tunnel to see statistics
            </div>
        );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4 text-center">
                    <div className="text-2xl font-bold">{session.requests.toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">Total Requests</div>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                    <div className="text-2xl font-bold">{session.bytesTransferred}</div>
                    <div className="text-[11px] text-muted-foreground">Data Transferred</div>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                    <div className="text-2xl font-bold">{session.uptime}</div>
                    <div className="text-[11px] text-muted-foreground">Uptime</div>
                </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium mb-3">Request Rate (last 2 hours)</p>
                <div className="flex items-end gap-1 h-32">
                    {history.map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className="w-full bg-amber-500/20 rounded-t"
                                style={{ height: `${Math.min(100, (h.req / 40) * 100)}%` }}
                            >
                                <div
                                    className="w-full bg-amber-500 rounded-t"
                                    style={{ height: `${(h.req / 40) * 100}%` }}
                                />
                            </div>
                            <span className="text-[9px] text-muted-foreground">{h.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SettingsPanel({
    session,
    onUpdateAuth,
}: {
    session: TunnelSession | null;
    onUpdateAuth: (enabled: boolean, username: string, password: string) => void;
}) {
    const [authEnabled, setAuthEnabled] = useState(session?.authEnabled || false);
    const [username, setUsername] = useState(session?.authUsername || "");
    const [password, setPassword] = useState(session?.authPassword || "");
    const [customDomain, setCustomDomain] = useState("");

    return (
        <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium">Authentication</div>
                        <div className="text-[11px] text-muted-foreground">
                            Password protect your tunnel
                        </div>
                    </div>
                    <Switch checked={authEnabled} onCheckedChange={setAuthEnabled} />
                </div>
                {authEnabled && (
                    <div className="space-y-2 pl-3 border-l-2 border-amber-500/30">
                        <Input
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="h-8 text-xs"
                        />
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                )}
                <Button
                    onClick={() => onUpdateAuth(authEnabled, username, password)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
                >
                    Save Settings
                </Button>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-4">
                <div>
                    <div className="text-sm font-medium">Custom Domain (Pro)</div>
                    <div className="text-[11px] text-muted-foreground">
                        Use your own domain for the tunnel
                    </div>
                </div>
                <Input
                    placeholder="your-domain.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="h-8 text-xs"
                />
                <Button disabled className="w-full opacity-50 cursor-not-allowed">
                    Upgrade to Pro
                </Button>
            </div>
        </div>
    );
}

export default function TunnelManagerPage() {
    const [projects] = useState(MOCK_PROJECTS);
    const [session, setSession] = useState<TunnelSession | null>(null);
    const [requests, setRequests] = useState<RequestLog[]>(MOCK_REQUESTS);
    const [_loading, setLoading] = useState(false);

    const startTunnel = async (data: {
        projectId: number;
        authEnabled: boolean;
        username: string;
        password: string;
    }) => {
        setLoading(true);
        const project = projects.find((p) => p.id === data.projectId);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setSession({
            id: Math.random().toString(36).substring(7),
            projectId: data.projectId,
            projectName: project?.name || "",
            url: generateSessionUrl(project?.name || "tunnel"),
            port: project?.port || 0,
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
    };

    const stopTunnel = () => {
        setSession(null);
        setRequests([]);
    };
    const copyUrl = () => session && navigator.clipboard.writeText(session.url);
    const updateAuth = (enabled: boolean, username: string, password: string) => {
        if (session)
            setSession({
                ...session,
                authEnabled: enabled,
                authUsername: username,
                authPassword: password,
            });
    };
    const clearRequests = () => setRequests([]);

    useEffect(() => {
        if (session && session.status === "active") {
            const interval = setInterval(() => {
                setSession((prev) =>
                    prev
                        ? {
                              ...prev,
                              requests: prev.requests + Math.floor(Math.random() * 3),
                              uptime: `${Math.floor(prev.requests / 60)}m ${prev.requests % 60}s`,
                          }
                        : null
                );
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [session]);

    return (
        <div className="min-h-screen p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Share2 className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Tunnel Manager</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Expose local projects to the internet
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                        Powered by Expose
                    </Badge>
                </div>
            </div>

            {session ? (
                <ActiveTunnel session={session} onStop={stopTunnel} onCopyUrl={copyUrl} />
            ) : (
                <StartTunnelForm projects={projects} onStart={startTunnel} />
            )}

            {session && (
                <Tabs defaultValue="requests">
                    <TabsList className="flex h-auto gap-0.5 bg-muted/40 p-1 rounded-xl mb-5 w-full sm:w-auto">
                        {[
                            {
                                id: "requests",
                                label: "Requests",
                                icon: <Activity className="w-3.5 h-3.5" />,
                            },
                            {
                                id: "webhooks",
                                label: "Webhooks",
                                icon: <Zap className="w-3.5 h-3.5" />,
                            },
                            {
                                id: "stats",
                                label: "Statistics",
                                icon: <BarChart3 className="w-3.5 h-3.5" />,
                            },
                            {
                                id: "settings",
                                label: "Settings",
                                icon: <Settings className="w-3.5 h-3.5" />,
                            },
                        ].map((t) => (
                            <TabsTrigger
                                key={t.id}
                                value={t.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                                {t.icon}
                                {t.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <TabsContent value="requests" className="mt-0">
                        <RequestsPanel requests={requests} onClear={clearRequests} />
                    </TabsContent>
                    <TabsContent value="webhooks" className="mt-0">
                        <WebhookInspector requests={requests} />
                    </TabsContent>
                    <TabsContent value="stats" className="mt-0">
                        <StatisticsPanel session={session} />
                    </TabsContent>
                    <TabsContent value="settings" className="mt-0">
                        <SettingsPanel session={session} onUpdateAuth={updateAuth} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
