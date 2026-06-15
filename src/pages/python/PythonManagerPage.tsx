import { SiPython } from "@react-icons/all-files/si/SiPython";
import { Clock, Code2, Info, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PythonManagerPage() {
    return (
        <div className="min-h-screen p-6 space-y-6 relative">
            {/* Background blur overlay */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-2xl pointer-events-auto" />

            {/* Content - blurred behind */}
            <div className="relative z-0 pointer-events-none opacity-30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <SiPython className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Python Manager</h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Coming soon · Under development
                            </p>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="projects" className="mt-6">
                    <TabsList className="flex h-auto gap-0.5 bg-muted/40 p-1 rounded-xl mb-5 w-full sm:w-auto">
                        {[
                            {
                                id: "projects",
                                label: "Projects",
                                icon: <Package className="w-3.5 h-3.5" />,
                            },
                            {
                                id: "frameworks",
                                label: "Frameworks",
                                icon: <Code2 className="w-3.5 h-3.5" />,
                            },
                            {
                                id: "packages",
                                label: "Packages",
                                icon: <Package className="w-3.5 h-3.5" />,
                            },
                            { id: "info", label: "Info", icon: <Info className="w-3.5 h-3.5" /> },
                        ].map((t) => (
                            <TabsTrigger
                                key={t.id}
                                value={t.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg"
                            >
                                {t.icon}
                                {t.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {/* Coming Soon overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-20 flex-col gap-4 pointer-events-none">
                <div className="rounded-full bg-amber-500/20 p-5 backdrop-blur-sm border border-amber-500/30">
                    <SiPython className="w-10 h-10 text-amber-500" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                        Python Support Coming Soon
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-md">
                        We're working hard to bring full Python support to Hive. Virtual
                        environments, pip package management, and framework scaffolding are on the
                        roadmap.
                    </p>
                    <div className="flex gap-2 justify-center pt-2">
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                            Django
                        </Badge>
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                            FastAPI
                        </Badge>
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                            Flask
                        </Badge>
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                            NumPy
                        </Badge>
                    </div>
                </div>
                <Button disabled className="mt-4 bg-amber-500/50 cursor-not-allowed">
                    <Clock className="w-4 h-4 mr-2" />
                    Coming in v1.1
                </Button>
            </div>
        </div>
    );
}
