import { UserConfig } from "@/features/onboarding/types";

import { useEffect, useState } from "react";

import { SiNodeDotJs } from "@react-icons/all-files/si/SiNodeDotJs";
import { SiPhp } from "@react-icons/all-files/si/SiPhp";
import {
    IconCpu2,
    IconDashboard,
    IconDatabase,
    IconFolder,
    IconHelp,
    IconSettings,
    IconShare,
} from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

import { NavUser } from "./nav-user";
import { SiDocker } from "react-icons/si";

const navMainItems = [
    { title: "Dashboard", url: "/", icon: IconDashboard },
    { title: "Projects", url: "/projects", icon: IconFolder },
    { title: "Docker", url: "/docker", icon: SiDocker },
    { title: "Runtimes", url: "/runtimes", icon: IconCpu2 },
    { title: "Databases", url: "/databases", icon: IconDatabase },
    { title: "Tunnel", url: "/tunnel", icon: IconShare },
];

const navSecondaryItems = [
    { title: "Settings", url: "/settings", icon: IconSettings },
    { title: "Help", url: "/help", icon: IconHelp },
];

const defaultUser = {
    name: "User",
    email: "user@hive.dev",
    avatar: "",
};

const sidebarVariants = {
    initial: { x: -260, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -260, opacity: 0 },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const [user, setUser] = useState(defaultUser);

    const loadUserConfig = async () => {
        try {
            const config = await invoke<UserConfig>("get_user_config");
            if (config && config.firstName) {
                setUser({
                    name: `${config.firstName} ${config.lastName}`.trim() || config.firstName,
                    email: config.email || "user@hive.dev",
                    avatar: config.avatar || "",
                });
            }
        } catch (error) {
            console.error("Failed to load user config:", error);
        }
    };

    useEffect(() => {
        loadUserConfig();
    }, []);

    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={sidebarVariants}
            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            className="h-full"
        >
            <Sidebar collapsible="offcanvas" {...props}>
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild className="p-1.5">
                                <motion.a
                                    href="/"
                                    className="flex items-center gap-2"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <motion.img
                                        src="/hive.png"
                                        alt="Hive"
                                        className="w-8 h-8"
                                        whileHover={{ rotate: 180 }}
                                        transition={{ duration: 0.3 }}
                                    />
                                    <motion.span
                                        className="text-xl font-bold bg-linear-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        Hive
                                    </motion.span>
                                </motion.a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarContent>
                    <NavMain items={navMainItems as any} />
                    <NavSecondary items={navSecondaryItems as any} className="mt-auto" />
                </SidebarContent>
                <SidebarFooter>
                    <NavUser user={user} />
                </SidebarFooter>
            </Sidebar>
        </motion.div>
    );
}
