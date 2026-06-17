import { useEffect, useState } from "react";

import { IconSettings, IconUserCircle } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/app/components/ui/sidebar";

interface UserConfig {
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
}

export function NavUser({
    user: propUser,
}: {
    user: { name: string; email: string; avatar: string };
}) {
    const { isMobile } = useSidebar();
    const navigate = useNavigate();
    const [user, setUser] = useState(propUser);

    useEffect(() => {
        loadUserConfig();
    }, []);

    const loadUserConfig = async () => {
        try {
            const config = await invoke<UserConfig>("get_user_config");
            if (config) {
                setUser({
                    name: `${config.firstName} ${config.lastName}`.trim() || config.firstName,
                    email: config.email || propUser.email,
                    avatar: config.avatar || "",
                });
            }
        } catch (error) {
            console.error("Failed to load user config:", error);
        }
    };

    const handleNavigate = (path: string) => {
        navigate(path);
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton size="lg">
                            <Avatar className="h-8 w-8 rounded-lg">
                                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                                <AvatarFallback className="rounded-lg">
                                    {user.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user.name}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {user.email}
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    {user.avatar && (
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                    )}
                                    <AvatarFallback>
                                        {user.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user.name}</span>
                                    <span className="truncate text-xs">{user.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => handleNavigate("/settings")}>
                                <IconUserCircle className="size-4" />
                                Account
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleNavigate("/settings")}>
                                <IconSettings className="size-4" />
                                Preferences
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
