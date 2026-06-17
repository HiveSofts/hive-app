import { IconLoader2 } from "@tabler/icons-react";

export function LoadingSpinner() {
    return (
        <div className="flex h-full min-h-[400px] w-full items-center justify-center">
            <IconLoader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
    );
}
