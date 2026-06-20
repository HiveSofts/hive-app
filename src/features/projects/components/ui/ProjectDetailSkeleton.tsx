import { Skeleton } from "@/components/ui/skeleton";

export function ProjectDetailSkeleton() {
    return (
        <div className="min-h-screen">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-3">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-7 w-20" />
                    <div className="h-4 w-px bg-border" />
                    <Skeleton className="w-5 h-5 shrink-0 rounded" />
                    <Skeleton className="h-5 w-32" />
                    <div className="ml-auto flex gap-2">
                        <Skeleton className="h-7 w-16" />
                        <Skeleton className="h-7 w-16" />
                        <Skeleton className="h-7 w-16" />
                    </div>
                </div>
            </div>
            <div className="p-6">
                <Skeleton className="h-10 w-full rounded-xl mb-6" />
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                </div>
                <Skeleton className="h-[300px] rounded-xl" />
            </div>
        </div>
    );
}
