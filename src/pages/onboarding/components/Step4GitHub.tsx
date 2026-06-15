import { IconBrandGithub } from "@tabler/icons-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Step4GitHub({ onNext }: { onNext: (data: { githubStarred: boolean }) => void }) {
    const orgLogo = "https://avatars.githubusercontent.com/u/205054168?s=200&v=4";
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-white dark:from-zinc-950 dark:to-zinc-900">
            <Card className="w-full max-w-2xl shadow-2xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center gap-8 mb-6">
                        <img
                            src={orgLogo}
                            alt="LaraPire"
                            className="w-20 h-20 rounded-2xl shadow-lg"
                        />
                    </div>
                    <CardTitle className="text-2xl">Support the Project</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                    <div className="space-y-4">
                        <p className="text-muted-foreground">
                            If you find Hive useful, please consider starring us on GitHub!
                        </p>
                        <div className="flex justify-center">
                            <button
                                onClick={() => openUrl("https://github.com/LaraPire/hive-app")}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-lg shadow-sm transition-all hover:bg-amber-50 hover:shadow-md dark:bg-zinc-800/50 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                                <IconBrandGithub className="h-4 w-4" />
                                <span>@LaraPire/hive</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => openUrl("https://github.com/LaraPire/hive-app")}
                        >
                            <Star className="w-4 h-4 mr-2" />
                            Star on GitHub
                        </Button>
                        <Button
                            onClick={() => onNext({ githubStarred: true })}
                            className="flex-1 bg-amber-500 hover:bg-amber-600"
                        >
                            Continue →
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Created by <strong>Arshia Mohammadi</strong> • LaraPire Organization
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
