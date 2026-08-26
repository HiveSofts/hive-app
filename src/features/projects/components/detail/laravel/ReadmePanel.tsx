import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";

interface ReadmePanelProps {
    content?: string | null;
    projectPath?: string;
}

export function ReadmePanel({ content, projectPath }: ReadmePanelProps) {
    const [readmeContent, setReadmeContent] = useState<string | null>(content || null);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (content) {
            setReadmeContent(content);
            return;
        }

        if (projectPath) {
            loadReadmeFromFile();
        }
    }, [content, projectPath]);

    const loadReadmeFromFile = async () => {
        setLoading(true);
        try {
            const result = await invoke<string>("read_project_file", {
                projectPath: projectPath!,
                fileName: "README.md",
            });
            setReadmeContent(result);
        } catch {
            try {
                const result = await invoke<string>("read_project_file", {
                    projectPath: projectPath!,
                    fileName: "README.md",
                });
                setReadmeContent(result);
            } catch {
                setReadmeContent(null);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-xl border bg-card p-8 text-center">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading README...</p>
            </div>
        );
    }

    if (!readmeContent) {
        return (
            <div className="rounded-xl border bg-card p-8 text-center">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No README.md found</p>
            </div>
        );
    }

    const lines = readmeContent.split("\n");

    const escapeHtml = (input: string): string =>
        input
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">README.md</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs">{readmeContent.split("\n").length} lines</span>
                    {isOpen ? (
                        <ChevronDown className="w-4 h-4 transition-transform" />
                    ) : (
                        <ChevronRight className="w-4 h-4 transition-transform" />
                    )}
                </div>
            </button>

            <div
                className={`
                    overflow-hidden transition-all duration-300 ease-in-out
                    ${isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}
                `}
            >
                <div className="prose prose-sm dark:prose-invert max-w-none p-5 pt-0 space-y-2 text-sm border-t">
                    {lines.map((line, i) => {
                        if (line.startsWith("# "))
                            return (
                                <h1 key={i} className="text-xl font-bold mt-4 first:mt-0">
                                    {line.slice(2)}
                                </h1>
                            );
                        if (line.startsWith("## "))
                            return (
                                <h2
                                    key={i}
                                    className="text-base font-semibold mt-5 mb-2 border-b pb-1"
                                >
                                    {line.slice(3)}
                                </h2>
                            );
                        if (line.startsWith("- "))
                            return (
                                <li key={i} className="ml-4 text-muted-foreground">
                                    {line.slice(2).replace(/\*\*(.*?)\*\*/g, (_, t) => t)}
                                </li>
                            );
                        if (line.startsWith("```"))
                            return (
                                <div
                                    key={i}
                                    className={
                                        line === "```"
                                            ? "rounded-b-lg"
                                            : "bg-zinc-950 rounded-t-lg px-4 pt-3 pb-1 text-xs font-mono text-zinc-300"
                                    }
                                />
                            );
                        if (line.trim() === "") return <div key={i} className="h-2" />;
                        const formatted = line
                            .replace(/\*\*(.*?)\*\*/g, (_m, t) => `<strong>${escapeHtml(t)}</strong>`)
                            .replace(
                                /`(.*?)`/g,
                                (_m, t) =>
                                    `<code class="bg-muted px-1 rounded text-[11px] font-mono">${escapeHtml(t)}</code>`
                            );
                        return (
                            <p
                                key={i}
                                className="text-muted-foreground leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: formatted }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
