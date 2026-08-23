import { cn } from "@/core/lib/utils";

export interface CategoryChip {
    label: string;
    count: number;
}

interface CategoryBarProps {
    categories: CategoryChip[];
    active: string;
    onSelect: (label: string) => void;
}

export function CategoryBar({ categories, active, onSelect }: CategoryBarProps) {
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((c) => {
                const isActive = c.label === active;
                return (
                    <button
                        key={c.label}
                        onClick={() => onSelect(c.label)}
                        className={cn(
                            "px-3 h-7 rounded-full text-[11px] font-medium border transition-colors",
                            isActive
                                ? "bg-white/10 border-white/20 text-white"
                                : "bg-white/[0.02] border-white/10 text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
                        )}
                    >
                        {c.label}
                        <span className="ml-1.5 text-white/30">{c.count}</span>
                    </button>
                );
            })}
        </div>
    );
}
