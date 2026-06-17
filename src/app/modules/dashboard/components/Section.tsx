import { useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

export function Section({
    title,
    icon,
    children,
    defaultOpen = true,
    right,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    right?: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rounded-2xl border bg-card overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-2.5 px-5 py-3.5 border-b bg-muted/20 hover:bg-muted/40 transition-colors text-left"
            >
                <span className="text-muted-foreground">{icon}</span>
                <span className="font-semibold text-sm tracking-tight flex-1">{title}</span>
                {right && <span onClick={(e) => e.stopPropagation()}>{right}</span>}
                {open ? (
                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                )}
            </button>
            {open && <div className="p-5">{children}</div>}
        </div>
    );
}
