import { useState } from "react";

import { Play, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { Project } from "../types";

interface StartTunnelFormProps {
    projects: Project[];
    onStart: (data: {
        projectId: number;
        authEnabled: boolean;
        username: string;
        password: string;
    }) => void;
}

export function StartTunnelForm({ projects, onStart }: StartTunnelFormProps) {
    const [selectedProject, setSelectedProject] = useState<number | null>(null);
    const [authEnabled] = useState(false);
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
