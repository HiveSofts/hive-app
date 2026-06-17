import { ArrowLeft, Bug, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./app/components/ui/button";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-white dark:from-zinc-950 dark:to-zinc-900 px-4">
            <div className="text-center space-y-6 max-w-md">
                <div className="relative">
                    <div className="text-[120px] font-bold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                        404
                    </div>
                    <div className="absolute -top-4 -right-8 animate-bounce">
                        <Bug className="w-10 h-10 text-amber-500/50" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
                    <p className="text-muted-foreground text-sm">
                        Oops! The page you're looking for doesn't exist or has been moved.
                    </p>
                </div>

                <div className="flex gap-3 justify-center pt-4">
                    <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </Button>
                    <Button
                        onClick={() => navigate("/")}
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                    >
                        <Home className="w-4 h-4" />
                        Home
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground pt-8">
                    Check the URL or return to the dashboard to continue working.
                </p>
            </div>
        </div>
    );
}
