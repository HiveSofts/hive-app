import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";

interface CopyButtonProps {
    text: string;
    className?: string;
}

export function CopyButton({ text, className = "" }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <button
            onClick={copy}
            className={`p-1 rounded hover:bg-white/5 transition-colors ${className}`}
            title="Copy"
        >
            {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
        </button>
    );
}