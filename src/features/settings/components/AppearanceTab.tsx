import { Laptop, Moon, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch";

import { AppSettings } from "../types";

const ACCENT_COLORS = [
    { name: "Amber", value: "#F59E0B", class: "bg-amber-500" },
    { name: "Blue", value: "#3B82F6", class: "bg-blue-500" },
    { name: "Green", value: "#10B981", class: "bg-green-500" },
    { name: "Purple", value: "#8B5CF6", class: "bg-purple-500" },
    { name: "Red", value: "#EF4444", class: "bg-red-500" },
    { name: "Pink", value: "#EC4899", class: "bg-pink-500" },
    { name: "Indigo", value: "#6366F1", class: "bg-indigo-500" },
    { name: "Teal", value: "#14B8A6", class: "bg-teal-500" },
];

interface AppearanceTabProps {
    settings: AppSettings;
    updateSetting: (field: keyof AppSettings, value: any) => void;
}

export function AppearanceTab({ settings, updateSetting }: AppearanceTabProps) {
    return (
        <div className="rounded-xl border bg-card p-5 space-y-4">
            <div>
                <h3 className="text-sm font-medium mb-3">Theme</h3>
                <div className="flex gap-3">
                    {[
                        { id: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
                        { id: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
                        { id: "system", label: "System", icon: <Laptop className="w-4 h-4" /> },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => updateSetting("theme", t.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${settings.theme === t.id ? "border-amber-500 bg-amber-500/10 text-amber-500" : "border-border hover:bg-muted"}`}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <h3 className="text-sm font-medium mb-3">Accent Color</h3>
                <div className="flex gap-2 flex-wrap">
                    {ACCENT_COLORS.map((c) => (
                        <button
                            key={c.value}
                            onClick={() => updateSetting("accentColor", c.value)}
                            className={`w-8 h-8 rounded-full ${c.class} transition-all ${settings.accentColor === c.value ? "ring-2 ring-offset-2 ring-amber-500 scale-110" : "hover:scale-105"}`}
                            title={c.name}
                        />
                    ))}
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm font-medium">Sidebar Collapsed</div>
                    <div className="text-[11px] text-muted-foreground">
                        Always start with collapsed sidebar
                    </div>
                </div>
                <Switch
                    checked={settings.sidebarCollapsed}
                    onCheckedChange={(v) => updateSetting("sidebarCollapsed", v)}
                />
            </div>
            <div>
                <h3 className="text-sm font-medium mb-2">Font Size</h3>
                <div className="flex gap-2">
                    {["small", "medium", "large"].map((s) => (
                        <button
                            key={s}
                            onClick={() => updateSetting("fontSize", s as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${settings.fontSize === s ? "border-amber-500 bg-amber-500/10 text-amber-500" : "border-border hover:bg-muted"}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm font-medium">Animations</div>
                    <div className="text-[11px] text-muted-foreground">
                        Enable UI animations and transitions
                    </div>
                </div>
                <Switch
                    checked={settings.animations}
                    onCheckedChange={(v) => updateSetting("animations", v)}
                />
            </div>
        </div>
    );
}
