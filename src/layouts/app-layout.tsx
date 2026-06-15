import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const pageVariants = {
    initial: { opacity: 0, x: 20, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -20, scale: 0.98 },
};

const pageTransition = {
    type: "tween" as const,
    ease: "anticipate" as const,
    duration: 0.3,
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
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            variants={pageVariants}
                            transition={pageTransition}
                            className="flex-1"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
