import { cn } from "@/core/lib/utils";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AlertCircle, AlertTriangle, Info, CheckCircle, X, Loader2 } from "lucide-react";

type EventLevel = "info" | "success" | "warning" | "error" | "debug";

interface Event {
    id: number;
    created_at: string;
    level: EventLevel;
    category: string;
    event_key: string;
    title: string;
    message: string;
    metadata?: any;
    source?: string;
    read: boolean;
    trace_id?: string;
}

interface NotificationItem {
    id: number;
    level: EventLevel;
    title: string;
    body: string;
    time: string;
    read: boolean;
    category: string;
}

const notifIcon: Record<EventLevel, React.ReactNode> = {
    error: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
    success: <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />,
    debug: <Info className="w-4 h-4 text-purple-400 shrink-0" />,
};

const logColor: Record<EventLevel, { bg: string; border: string }> = {
    error: { bg: "bg-red-500/8", border: "border-red-500/20" },
    warning: { bg: "bg-yellow-500/8", border: "border-yellow-500/20" },
    info: { bg: "bg-blue-500/8", border: "border-blue-500/20" },
    success: { bg: "bg-green-500/8", border: "border-green-500/20" },
    debug: { bg: "bg-purple-500/8", border: "border-purple-500/20" },
};

export function NotificationCenter() {
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadEvents = async () => {
        try {
            const events = await invoke<Event[]>("get_events", { limit: 5 });
            const count = await invoke<number>("get_unread_events_count");
            
            setUnreadCount(count);
            setItems(
                events.map((e) => ({
                    id: e.id,
                    level: e.level,
                    title: e.title,
                    body: e.message,
                    time: new Date(e.created_at).toLocaleString("fa-IR"),
                    read: e.read,
                    category: e.category,
                }))
            );
        } catch (error) {
            console.error("Failed to load events:", error);
        } finally {
            setLoading(false);
        }
    };

    const dismiss = async (id: number) => {
        try {
            await invoke("mark_event_read", { id });
            setItems((prev) => prev.filter((x) => x.id !== id));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to dismiss notification:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await invoke("mark_all_events_read");
            setItems((prev) => prev.map((x) => ({ ...x, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    useEffect(() => {
        loadEvents();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {unreadCount > 0 && (
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-muted-foreground">
                        {unreadCount} new notification{unreadCount > 1 ? "s" : ""}
                    </span>
                    <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
                    >
                        Mark all as read
                    </button>
                </div>
            )}

            {items.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                    No notifications
                </div>
            )}

            {items.map((n) => (
                <div
                    key={n.id}
                    className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border transition-all duration-200",
                        logColor[n.level].bg,
                        logColor[n.level].border,
                        !n.read && "border-l-4",
                        !n.read && "border-l-blue-500"
                    )}
                >
                    {notifIcon[n.level]}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium leading-none">
                                {n.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                                {n.time}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">
                            {n.body}
                        </p>
                        {n.category && (
                            <span className="inline-block mt-1.5 text-[9px] uppercase tracking-wider text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded">
                                {n.category}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => dismiss(n.id)}
                        className="p-0.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground shrink-0"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ))}
        </div>
    );
}