import { Activity, BarChart3, Settings, Share2, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ActiveTunnel } from "./components/ActiveTunnel";
import { RequestsPanel } from "./components/RequestsPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { StartTunnelForm } from "./components/StartTunnelForm";
import { StatisticsPanel } from "./components/StatisticsPanel";
import { WebhookInspector } from "./components/WebhookInspector";
import { useTunnel } from "./hooks/useTunnel";
import { getProjects } from "./services/tunnelService";

export default function TunnelManagerPage() {
    const projects = getProjects();
    // const initialRequests = getRequests();

    const {
        session,
        requests,
        // loading,
        startTunnel,
        stopTunnel,
        clearRequests,
        copyUrl,
        updateAuth,
    } = useTunnel();

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
