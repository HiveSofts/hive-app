import { type Icon } from "@tabler/icons-react";
import { useLocation, useNavigate } from "react-router-dom";

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/app/components/ui/sidebar";

export function NavSecondary({
    items,
    ...props
}: {
    items: { title: string; url: string; icon: Icon }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => {
                        const isActive = location.pathname === item.url;

                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    isActive={isActive}
                                    onClick={() => navigate(item.url)}
                                >
                                    <button className="w-full">
                                        <item.icon className="size-4" />
                                        <span>{item.title}</span>
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
