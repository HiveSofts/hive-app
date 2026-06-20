import { cn } from "@/core/lib/utils";

import { useState } from "react";

import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";

type LogLevel = "error" | "warn" | "info";

const NOTIFICATIONS = [
    {
        id: 1,
        level: "info" as LogLevel,
        title: "PHP 8.4.1 installed",
        body: "Updated successfully via Hive PHP Manager.",
        time: "2 min ago",
        action: null,
    },
    {
        id: 2,
        level: "warn" as LogLevel,
        title: "php.ini changed",
        body: "Restart PHP-FPM to apply new memory_limit.",
        time: "8 min ago",
        action: "Restart Now",
    },
    {
        id: 3,
        level: "info" as LogLevel,
        title: "my-blog created",
        body: "Laravel project scaffolded at ~/Projects/my-blog.",
        time: "1 hr ago",
        action: "Open Project",
    },
    {
        id: 4,
        level: "error" as LogLevel,
        title: "MinIO service crashed",
        body: "Process exited with code 1. Check logs for details.",
        time: "2 hr ago",
        action: "View Logs",
    },
];

const notifIcon: Record<LogLevel, React.ReactNode> = {
    error: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
    warn: <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
};

const logColor: Record<LogLevel, { bg: string }> = {
    error: { bg: "bg-red-500/8 border-red-500/20" },
    warn: { bg: "bg-yellow-500/8 border-yellow-500/20" },
    info: { bg: "bg-blue-500/8 border-blue-500/20" },
};

export function NotificationCenter() {
    const [notifs, setNotifs] = useState(NOTIFICATIONS);
    const dismiss = (id: number) => setNotifs((n) => n.filter((x) => x.id !== id));

    return (
        <div className="space-y-2">
            {notifs.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                    No notifications
                </div>
            )}
            {notifs.map((n) => (
                <div
                    key={n.id}
                    className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border",
                        logColor[n.level].bg
                    )}
                >
                    {notifIcon[n.level]}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium leading-none">{n.title}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                                {n.time}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">{n.body}</p>
                        {n.action && (
                            <button className="mt-1.5 text-[11px] font-medium text-amber-500 hover:text-amber-400 transition-colors">
                                {n.action} →
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => dismiss(n.id)}
                        className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ))}
        </div>
    );
}
