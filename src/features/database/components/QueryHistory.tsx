import { Activity } from "lucide-react";

import { Button } from "@/components/ui/button";

import { QueryHistory as QueryHistoryType } from "../types";

interface QueryHistoryProps {
    queries: QueryHistoryType[];
}

export function QueryHistory({ queries }: QueryHistoryProps) {
    return (
        <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Recent Queries</span>
                </div>
                <Button size="sm" variant="ghost" className="h-6 text-[10px]">
                    View all
                </Button>
            </div>
            <div className="divide-y">
                {queries.map((q) => (
                    <div key={q.id} className="px-4 py-2.5 hover:bg-muted/20">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-emerald-500">{q.db}</span>
                            <span className="text-[10px] text-muted-foreground">{q.time}</span>
                        </div>
                        <p className="text-[11px] font-mono text-foreground/80 mt-0.5 truncate">
                            {q.query}
                        </p>
                        <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span>⏱️ {q.duration}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
