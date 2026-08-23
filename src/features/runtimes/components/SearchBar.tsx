import { Loader2, Search, X } from "lucide-react";

import { cn } from "@/core/lib/utils";

import { Input } from "@/components/ui/input";

interface SearchBarProps {
    value: string;
    onChange: (v: string) => void;
    loading?: boolean;
    placeholder?: string;
    className?: string;
}

export function SearchBar({
    value,
    onChange,
    loading = false,
    placeholder = "Search any package, runtime, or tool…",
    className,
}: SearchBarProps) {
    return (
        <div className={cn("relative", className)}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-8 pr-16 h-9 text-sm bg-white/5 border-white/10"
                spellCheck={false}
                autoComplete="off"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                {value && !loading && (
                    <button
                        onClick={() => onChange("")}
                        className="text-muted-foreground hover:text-white/80 transition-colors"
                        aria-label="Clear search"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
