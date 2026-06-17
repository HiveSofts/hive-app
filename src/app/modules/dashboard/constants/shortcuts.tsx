import { Activity, Database, Package, Terminal, Trash2, Zap } from "lucide-react";
import { ShortcutCommand, ShortcutGroup } from "../types";

export const RECENT_COMMANDS: string[] = [
  "php artisan cache:clear",
  "php artisan migrate",
  "composer install",
  "php artisan optimize",
  "npm run build",
];

export const LARAVEL_COMMANDS: ShortcutCommand[] = [
  {
    label: "Run Migrations",
    icon: <Database className="w-3 h-3" />,
    cmd: "php artisan migrate",
    project: "my-blog",
  },
  {
    label: "Optimize",
    icon: <Zap className="w-3 h-3" />,
    cmd: "php artisan optimize",
    project: "my-blog",
  },
  {
    label: "Clear Cache",
    icon: <Trash2 className="w-3 h-3" />,
    cmd: "php artisan cache:clear",
    project: "my-blog",
  },
  {
    label: "Install NPM",
    icon: <Package className="w-3 h-3" />,
    cmd: "npm install",
    project: "my-blog",
  },
  {
    label: "Queue Work",
    icon: <Activity className="w-3 h-3" />,
    cmd: "php artisan queue:work",
    project: "my-blog",
  },
];

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Recent commands",
    commands: RECENT_COMMANDS.map((cmd) => ({
      label: cmd,
      icon: <Terminal className="w-3 h-3" />,
      cmd,
    })),
  },
  {
    title: "Laravel · my-blog",
    commands: LARAVEL_COMMANDS,
  },
];