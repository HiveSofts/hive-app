import { AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/core/lib/utils";
import { LangMeta } from "../../types/runtime.types";
import { accentMap } from "../../utils/accent.utils";

interface RustPanelProps {
    lang: LangMeta;
}

export function RustPanel({ lang }: RustPanelProps) {
    const colors = accentMap[lang.accent];

    return (
        <div className="space-y-4">
            <div className={cn("rounded-xl border p-4", colors.border, colors.bg)}>
                <div className="flex items-center gap-3">
                    <AlertCircle className={cn("w-4 h-4", colors.text)} />
                    <p className="text-sm">Rust is not installed. Install via rustup.</p>
                    <Button size="sm" className={cn("ml-auto text-xs gap-1.5", colors.bg, colors.text, "border", colors.border)}>
                        <Download className="w-3.5 h-3.5" />
                        Install rustup
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Toolchains</p>
                {[
                    { name: "stable", installed: false, default: true },
                    { name: "beta", installed: false, default: false },
                    { name: "nightly", installed: false, default: false },
                ].map((tc) => (
                    <div key={tc.name} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                        <p className="text-sm font-mono flex-1">{tc.name}</p>
                        {tc.default && <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">default</Badge>}
                        <Button size="sm" className={cn("h-7 text-xs gap-1", colors.bg, colors.text, "border", colors.border)}>
                            <Download className="w-3 h-3" />
                            Install
                        </Button>
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cargo Tools</p>
                {[
                    { name: "cargo-watch", desc: "Watch for changes", installed: false },
                    { name: "cargo-edit", desc: "Manage dependencies", installed: false },
                    { name: "cargo-audit", desc: "Security audit", installed: false },
                    { name: "cargo-expand", desc: "Macro expansion", installed: false },
                    { name: "clippy", desc: "Lint collection", installed: false },
                    { name: "rustfmt", desc: "Code formatter", installed: false },
                ].map((tool) => (
                    <div key={tool.name} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10">
                        <div className="flex-1">
                            <p className="text-sm font-mono">{tool.name}</p>
                            <p className="text-xs text-muted-foreground">{tool.desc}</p>
                        </div>
                        <Button size="sm" className={cn("h-7 text-xs gap-1", colors.bg, colors.text, "border", colors.border)}>
                            <Download className="w-3 h-3" />
                            cargo install
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}