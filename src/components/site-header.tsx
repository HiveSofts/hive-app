import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader() {
    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b px-4 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-4" />
            <h1 className="text-base font-medium">Hive 🐝</h1>
        </header>
    );
}
