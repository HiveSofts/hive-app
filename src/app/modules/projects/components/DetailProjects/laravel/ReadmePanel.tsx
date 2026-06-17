import { FileText } from "lucide-react";

export function ReadmePanel({ content }: { content: string }) {
    const lines = content.split("\n");
    return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">README.md</span>
                </div>
                <div className="p-5 space-y-2 text-sm">
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
                            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                            .replace(
                                /`(.*?)`/g,
                                '<code class="bg-muted px-1 rounded text-[11px] font-mono">$1</code>'
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
