import { FolderOpen } from "lucide-react";
import { cn } from "@/core/lib/utils";
import {
  LaravelIcon,
  ReactIcon,
  VueIcon,
  NextjsIcon,
  DockerIcon,
} from "@/app/components/icons";

export const getProjectIcon = (type: string, className?: string) => {
  const cls = cn("w-5 h-5 shrink-0", className);
  
  switch (type) {
    case "laravel":
      return <LaravelIcon className={cls} />;
    case "react":
      return <ReactIcon className={cls} />;
    case "vue":
      return <VueIcon className={cls} />;
    case "nextjs":
      return <NextjsIcon className={cls} />;
    case "docker":
      return <DockerIcon className={cls} />;
    default:
      return <FolderOpen className={cn(cls, "text-muted-foreground")} />;
  }
};