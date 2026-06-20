import { RotateCcw, Save, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AdvancedTab } from "./components/AdvancedTab";
import { AppearanceTab } from "./components/AppearanceTab";
import { NetworkTab } from "./components/NetworkTab";
import { PathsTab } from "./components/PathsTab";
import { ProfileTab } from "./components/ProfileTab";
import { SecurityTab } from "./components/SecurityTab";
import { StartupTab } from "./components/StartupTab";
import { useSettings } from "./hooks/useSettings";

export default function SettingsPage() {
    const {
        loading,
        saving,
        saved,
        user,
        settings,
        updateUser,
        updateSetting,
        resetToDefaults,
        save,
    } = useSettings();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center">
                        <Settings className="w-6 h-6 text-zinc-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Manage your preferences and account
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8"
                        onClick={resetToDefaults}
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </Button>
                    <Button
                        size="sm"
                        onClick={save}
                        disabled={saving}
                        className="gap-1.5 text-xs h-8 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        {saving ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-3.5 h-3.5" />
                        )}
                        {saved ? "Saved!" : "Save Changes"}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="profile">
                <TabsList className="flex h-auto gap-0.5 bg-muted/40 p-1 rounded-xl mb-6 w-full sm:w-auto flex-wrap">
                    {[
                        { id: "profile", label: "Profile" },
                        { id: "appearance", label: "Appearance" },
                        { id: "paths", label: "Paths" },
                        { id: "network", label: "Network" },
                        { id: "startup", label: "Startup" },
                        { id: "security", label: "Security" },
                        { id: "advanced", label: "Advanced" },
                    ].map((t) => (
                        <TabsTrigger
                            key={t.id}
                            value={t.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="profile" className="mt-0">
                    <ProfileTab user={user} updateUser={updateUser} />
                </TabsContent>
                <TabsContent value="appearance" className="mt-0">
                    <AppearanceTab settings={settings} updateSetting={updateSetting} />
                </TabsContent>
                <TabsContent value="paths" className="mt-0">
                    <PathsTab settings={settings} updateSetting={updateSetting} />
                </TabsContent>
                <TabsContent value="network" className="mt-0">
                    <NetworkTab settings={settings} updateSetting={updateSetting} />
                </TabsContent>
                <TabsContent value="startup" className="mt-0">
                    <StartupTab settings={settings} updateSetting={updateSetting} />
                </TabsContent>
                <TabsContent value="security" className="mt-0">
                    <SecurityTab settings={settings} updateSetting={updateSetting} />
                </TabsContent>
                <TabsContent value="advanced" className="mt-0">
                    <AdvancedTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
