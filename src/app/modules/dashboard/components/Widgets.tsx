import { Database, Network, Shield } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { WidgetsState, DBConnection, SSLCert } from "../types";
import { DB_CONNS, SSL_CERTS, WIDGET_DEFS } from "../constants";

interface WidgetsProps {
  widgets: WidgetsState;
  setWidgets: (w: WidgetsState) => void;
}

export function Widgets({ widgets, setWidgets }: WidgetsProps) {
  const toggleWidget = (id: keyof WidgetsState) => {
    setWidgets({ ...widgets, [id]: !widgets[id] });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {WIDGET_DEFS.map((w) => (
          <button
            key={w.id}
            onClick={() => toggleWidget(w.id)}
            className={cn(
              "text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors",
              widgets[w.id]
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {widgets[w.id] ? "✓ " : "+ "}
            {w.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {widgets.php && <PhpWidget />}
        {widgets.node && <NodeWidget />}
        {widgets.db && <DbWidget connections={DB_CONNS} />}
        {widgets.ssl && <SslWidget certs={SSL_CERTS} />}
        {widgets.tunnel && <TunnelWidget />}
      </div>
    </div>
  );
}

function PhpWidget() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-base">🐘</span>
        <span className="text-sm font-medium">PHP Info</span>
      </div>
      <div className="space-y-1 text-xs font-mono text-muted-foreground">
        <div className="flex justify-between">
          <span>Default</span>
          <span className="text-foreground">PHP 8.3.11</span>
        </div>
        <div className="flex justify-between">
          <span>Path</span>
          <span className="text-foreground">~/.hive/php/8.3/php</span>
        </div>
        <div className="flex justify-between">
          <span>Extensions</span>
          <span className="text-foreground">42 loaded</span>
        </div>
        <div className="flex justify-between">
          <span>OPcache</span>
          <span className="text-emerald-500">enabled</span>
        </div>
      </div>
    </div>
  );
}

function NodeWidget() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-base">🟩</span>
        <span className="text-sm font-medium">Node.js Info</span>
      </div>
      <div className="space-y-1 text-xs font-mono text-muted-foreground">
        <div className="flex justify-between">
          <span>Node</span>
          <span className="text-foreground">v20.14.0 LTS</span>
        </div>
        <div className="flex justify-between">
          <span>npm</span>
          <span className="text-foreground">10.7.0</span>
        </div>
        <div className="flex justify-between">
          <span>pnpm</span>
          <span className="text-foreground">9.5.0</span>
        </div>
        <div className="flex justify-between">
          <span>bun</span>
          <span className="text-foreground">1.1.18</span>
        </div>
      </div>
    </div>
  );
}

function DbWidget({ connections }: { connections: DBConnection[] }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium">DB Connections</span>
      </div>
      <div className="space-y-1.5">
        {connections.map((c) => (
          <div key={c.name} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                c.status === "connected"
                  ? "bg-emerald-500 animate-pulse"
                  : c.status === "error"
                  ? "bg-red-500"
                  : "bg-zinc-400"
              )}
            />
            <span className="font-mono truncate flex-1 text-muted-foreground">
              {c.name}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {c.driver}
            </span>
            <span
              className={cn(
                "text-[10px]",
                c.status === "connected"
                  ? "text-emerald-500"
                  : c.status === "error"
                  ? "text-red-500"
                  : "text-zinc-400"
              )}
            >
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SslWidget({ certs }: { certs: SSLCert[] }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-green-500" />
        <span className="text-sm font-medium">SSL Certificates</span>
      </div>
      <div className="space-y-1.5">
        {certs.map((c) => (
          <div key={c.domain} className="text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-foreground">{c.domain}</span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  c.daysLeft < 30
                    ? "text-red-500"
                    : c.daysLeft < 90
                    ? "text-yellow-500"
                    : "text-emerald-500"
                )}
              >
                {c.daysLeft}d left
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1 mt-1">
              <div
                className={cn(
                  "h-1 rounded-full transition-all",
                  c.daysLeft < 30
                    ? "bg-red-500"
                    : c.daysLeft < 90
                    ? "bg-yellow-500"
                    : "bg-emerald-500"
                )}
                style={{
                  width: `${Math.min(100, (c.daysLeft / 365) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TunnelWidget() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Network className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-medium">Tunnel</span>
        <span className="ml-auto text-[10px] text-muted-foreground">Expose</span>
      </div>
      <div className="space-y-1 text-xs font-mono text-muted-foreground">
        <div className="flex justify-between">
          <span>Status</span>
          <span className="text-yellow-500">inactive</span>
        </div>
        <div className="flex justify-between">
          <span>URL</span>
          <span className="text-muted-foreground/40">—</span>
        </div>
        <div className="flex justify-between">
          <span>Requests</span>
          <span className="text-muted-foreground/40">—</span>
        </div>
      </div>
      <button className="w-full mt-1 text-[11px] py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted transition-colors">
        Start tunnel
      </button>
    </div>
  );
}