import { Download, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function AdvancedTab() {
    return (
        <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="space-y-1.5">
                <Label className="text-xs">PHP Memory Limit</Label>
                <Input defaultValue="256M" className="font-mono text-xs h-8" />
                <p className="text-[10px] text-muted-foreground">Maximum memory per PHP script</p>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs">Node.js Heap Size</Label>
                <Input defaultValue="4GB" className="font-mono text-xs h-8" />
            </div>
            <Separator />
            <div>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Export Settings
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 ml-2">
                    <Upload className="w-3.5 h-3.5" />
                    Import Settings
                </Button>
            </div>
            <div className="rounded-lg bg-zinc-950 p-3">
                <p className="text-[10px] font-mono text-zinc-500">Version: Hive v0.1.0-beta</p>
                <p className="text-[10px] font-mono text-zinc-600">
                    Built with Tauri • MIT License
                </p>
            </div>
        </div>
    );
}
