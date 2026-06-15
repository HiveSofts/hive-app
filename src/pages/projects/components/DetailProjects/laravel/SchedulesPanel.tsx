import { CheckCircle2, Play, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";

const mockSchedules = [
    {
        id: 1,
        command: "emails:send-digest",
        cron: "0 8 * * 1",
        nextRun: "Mon 08:00",
        lastRun: "2025-06-09 08:00",
        status: "ok",
    },
    {
        id: 2,
        command: "cache:prune-stale-tags",
        cron: "* * * * *",
        nextRun: "in 1 min",
        lastRun: "2025-06-14 23:43",
        status: "ok",
    },
    {
        id: 3,
        command: "reports:generate-monthly",
        cron: "0 0 1 * *",
        nextRun: "Jul 01 00:00",
        lastRun: "2025-06-01 00:00",
        status: "failed",
    },
];

export function SchedulesPanel() {
    const statusIcon = (s: string) =>
        s === "ok" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
            <XCircle className="w-4 h-4 text-red-500" />
        );

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Scheduled tasks from{" "}
                    <span className="font-mono text-foreground">App\Console\Kernel</span>
                </p>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <Play className="w-3 h-3" /> Run all now
                </Button>
            </div>
            <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b bg-muted/40">
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Command
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Cron
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Next run
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Last run
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Status
                            </th>
                            <th className="px-4 py-2.5" />
                        </tr>
                    </thead>
                    <tbody>
                        {mockSchedules.map((s, i) => (
                            <tr
                                key={s.id}
                                className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                            >
                                <td className="px-4 py-3 font-mono text-foreground/90">
                                    {s.command}
                                </td>
                                <td className="px-4 py-3 font-mono text-muted-foreground">
                                    {s.cron}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{s.nextRun}</td>
                                <td className="px-4 py-3 text-muted-foreground font-mono">
                                    {s.lastRun}
                                </td>
                                <td className="px-4 py-3">{statusIcon(s.status)}</td>
                                <td className="px-4 py-3">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 text-[11px] px-2"
                                    >
                                        <Play className="w-2.5 h-2.5 mr-1" />
                                        Run
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
