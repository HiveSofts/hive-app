import { useState } from "react";

import { Eye, Plus, Search, Terminal, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Database } from "../types";

interface DatabaseListProps {
    databases: Database[];
}

export function DatabaseList({ databases }: DatabaseListProps) {
    const [search, setSearch] = useState("");
    const filtered = databases.filter((db) => db.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search databases..."
                    className="pl-8 h-8 text-xs"
                />
            </div>
            <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b bg-muted/40">
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Name
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Service
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Size
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Tables
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                Status
                            </th>
                            <th className="px-4 py-2.5" />
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((db) => (
                            <tr key={db.id} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="px-4 py-2.5 font-mono font-medium">{db.name}</td>
                                <td className="px-4 py-2.5">{db.service}</td>
                                <td className="px-4 py-2.5 font-mono">{db.size}</td>
                                <td className="px-4 py-2.5">{db.tables}</td>
                                <td className="px-4 py-2.5">
                                    <Badge
                                        variant="outline"
                                        className={
                                            db.status === "active"
                                                ? "text-emerald-500 border-emerald-500/30"
                                                : "text-zinc-400"
                                        }
                                    >
                                        {db.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <button className="p-1 rounded hover:bg-muted transition-colors">
                                        <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button className="p-1 rounded hover:bg-muted transition-colors">
                                        <Terminal className="w-3.5 h-3.5" />
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
            <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1">
                <Plus className="w-3 h-3" />
                Create Database
            </Button>
        </div>
    );
}
