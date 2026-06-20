import { Download, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Backup } from "../types";

interface BackupsPanelProps {
    backups: Backup[];
}

export function BackupsPanel({ backups }: BackupsPanelProps) {
    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button
                    size="sm"
                    className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1"
                >
                    <Download className="w-3 h-3" />
                    New Backup
                </Button>
            </div>
            <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b bg-muted/40">
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Name
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Size
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Created
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Status
                            </th>
                            <th className="px-4 py-2.5" />
                        </tr>
                    </thead>
                    <tbody>
                        {backups.map((backup) => (
                            <tr
                                key={backup.id}
                                className="border-b last:border-0 hover:bg-muted/20"
                            >
                                <td className="px-4 py-2.5 font-mono text-foreground/90">
                                    {backup.name}
                                </td>
                                <td className="px-4 py-2.5 font-mono">{backup.size}</td>
                                <td className="px-4 py-2.5 text-muted-foreground">
                                    {backup.createdAt}
                                </td>
                                <td className="px-4 py-2.5">
                                    <Badge
                                        variant="outline"
                                        className="text-emerald-500 border-emerald-500/30"
                                    >
                                        {backup.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <button className="p-1 rounded hover:bg-muted transition-colors">
                                        <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
