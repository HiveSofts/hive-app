import { type Icon } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils.ts";

export function NavMain({ items }: { items: { title: string; url: string; icon: Icon }[] }) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <SidebarGroup>
            <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                    {items.map((item) => {
                        const isActive = location.pathname === item.url;

                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    isActive={isActive}
                                    onClick={() => navigate(item.url)}
                                    className="relative group"
                                >
                                    <button className="w-full relative overflow-hidden">
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeNav"
                                                className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-amber-500/5 rounded-lg"
                                                transition={{
                                                    type: "spring",
                                                    bounce: 0.2,
                                                    duration: 0.6,
                                                }}
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center gap-3">
                                            <item.icon
                                                className={cn(
                                                    "size-4 transition-all duration-300",
                                                    isActive
                                                        ? "text-amber-500 scale-110"
                                                        : "text-muted-foreground group-hover:text-foreground group-hover:scale-105"
                                                )}
                                            />
                                            <span
                                                className={cn(
                                                    "transition-all duration-300",
                                                    isActive
                                                        ? "text-foreground font-medium"
                                                        : "text-muted-foreground group-hover:text-foreground"
                                                )}
                                            >
                                                {item.title}
                                            </span>
                                        </span>
                                    </button>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
