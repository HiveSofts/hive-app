import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
};

export function AppLayout() {
    const location = useLocation();

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col p-6">
                    <motion.div
                        key={location.pathname}
                        variants={variants}
                        initial="initial"
                        animate="animate"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="flex-1"
                    >
                        <Outlet />
                    </motion.div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
