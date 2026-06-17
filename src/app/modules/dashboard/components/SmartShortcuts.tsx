import { CheckCircle2, Terminal } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { RECENT_COMMANDS, LARAVEL_COMMANDS } from "../constants/shortcuts";
import { useShortcuts } from "../hooks/useShortcuts";

interface SmartShortcutsProps {
  onCommandRun?: (command: string, project?: string) => void;
  recentCommands?: string[];
  laravelCommands?: typeof LARAVEL_COMMANDS;
}

export function SmartShortcuts({ 
  onCommandRun,
  recentCommands = RECENT_COMMANDS,
  laravelCommands = LARAVEL_COMMANDS,
}: SmartShortcutsProps) {
  const { runCommand, isRunning } = useShortcuts({ onCommandRun });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Recent commands
        </p>
        <div className="flex flex-wrap gap-2">
          {recentCommands.map((cmd) => (
            <button
              key={cmd}
              onClick={() => runCommand(cmd)}
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded-lg border transition-all",
                isRunning(cmd)
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                  : "bg-muted/40 border-border hover:bg-muted hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground"
              )}
            >
              {isRunning(cmd) ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <Terminal className="w-3 h-3" />
              )}
              {cmd}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Laravel · my-blog
        </p>
        <div className="flex flex-wrap gap-2">
          {laravelCommands.map((t) => (
            <button
              key={t.label}
              onClick={() => runCommand(t.cmd, t.project)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all",
                isRunning(t.cmd)
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {isRunning(t.cmd) ? <CheckCircle2 className="w-3 h-3" /> : t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}