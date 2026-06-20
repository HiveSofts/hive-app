import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { TunnelSession } from "../types";

interface SettingsPanelProps {
    session: TunnelSession | null;
    onUpdateAuth: (enabled: boolean, username: string, password: string) => void;
}

export function SettingsPanel({ session, onUpdateAuth }: SettingsPanelProps) {
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
