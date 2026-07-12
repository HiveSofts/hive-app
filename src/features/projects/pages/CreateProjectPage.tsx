import { useState } from "react";

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

import { CreateDockerContainer } from "../components/create/docker/CreateDockerContainer";
import { CreateLaravelProject } from "../components/create/laravel/CreateLaravelProject";
import { CreateNextJsProject } from "../components/create/nextjs/CreateNextJsProject";
import { CreateNodejsProject } from "../components/create/nodejs/CreateNodejsProject";
import { CreatePhpProject } from "../components/create/php/CreatePhpProject";
import { CreateReactProject } from "../components/create/react/CreateReactProject";
import { CreateStaticProject } from "../components/create/static/CreateStaticProject";
import { CreateViteProject } from "../components/create/vite/CreateViteProject";
import { CreateVueProject } from "../components/create/vue/CreateVueProject";
import { CreateWordPressProject } from "../components/create/wordpress/CreateWordPressProject";
import { TECHNOLOGIES } from "../config";
import { ProjectType } from "../types";

export default function CreateProjectPage() {
    const navigate = useNavigate();
    const [selectedTech, setSelectedTech] = useState<ProjectType | null>(null);

    const handleProjectCreated = () => {
        // Navigate to projects list with state indicating a refresh is needed
        navigate("/projects", { state: { refreshAfterCreation: true } });
    };

    const selectedConfig = TECHNOLOGIES.find((t) => t.id === selectedTech);
    const Icon = selectedConfig?.icon;

    const renderCreateForm = () => {
        if (!selectedTech || !selectedConfig?.available) return null;

        switch (selectedTech) {
            case "laravel":
                return <CreateLaravelProject onSuccess={handleProjectCreated} />;
            case "react":
                return <CreateReactProject onSuccess={handleProjectCreated} />;
            case "vue":
                return <CreateVueProject onSuccess={handleProjectCreated} />;
            case "nextjs":
                return <CreateNextJsProject onSuccess={handleProjectCreated} />;
            case "vite":
                return <CreateViteProject onSuccess={handleProjectCreated} />;
            case "php":
                return <CreatePhpProject onSuccess={handleProjectCreated} />;
            case "nodejs":
                return <CreateNodejsProject onSuccess={handleProjectCreated} />;
            case "wordpress":
                return <CreateWordPressProject onSuccess={handleProjectCreated} />;
            case "html5":
                return <CreateStaticProject onSuccess={handleProjectCreated} />;
            case "docker":
                return <CreateDockerContainer onSuccess={handleProjectCreated} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen p-6">
            <div className="flex items-center gap-3 mb-8">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/projects")}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>
                <div className="h-4 w-px bg-border" />
                <div>
                    <h1 className="text-lg font-semibold leading-none">New Project</h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        Choose a technology to get started
                    </p>
                </div>
            </div>

            <div className="max-w-3xl space-y-8">
                <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Technology
                    </h2>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {TECHNOLOGIES.map((tech) => {
                            const TechIcon = tech.icon;
                            const isSelected = selectedTech === tech.id;

                            return (
                                <button
                                    key={tech.id}
                                    onClick={() => tech.available && setSelectedTech(tech.id)}
                                    className={`
                                        relative flex flex-col items-center gap-2 p-3 rounded-xl border
                                        transition-all duration-150 text-center
                                        ${
                                            !tech.available
                                                ? "opacity-40 cursor-not-allowed border-border"
                                                : isSelected
                                                  ? tech.selectedColor
                                                  : `cursor-pointer ${tech.color} border-border`
                                        }
                                    `}
                                >
                                    <TechIcon className="w-8 h-8" />
                                    <span className="text-[11px] font-medium leading-none">
                                        {tech.name}
                                    </span>
                                    {!tech.available && (
                                        <span className="absolute -top-1.5 -right-1 text-[9px] bg-muted text-muted-foreground px-1 py-0.5 rounded font-medium border border-border">
                                            Soon
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {selectedTech && selectedConfig?.available && (
                    <div className="border rounded-xl bg-card overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
                            {Icon && <Icon className="w-5 h-5" />}
                            <span className="font-medium text-sm">
                                {selectedConfig.name} Project
                            </span>
                        </div>
                        <div className="p-5">{renderCreateForm()}</div>
                    </div>
                )}

                {selectedTech && !selectedConfig?.available && (
                    <div className="rounded-xl border border-dashed bg-muted/20 p-10 text-center">
                        <p className="text-sm font-medium mb-1">Coming Soon</p>
                        <p className="text-xs text-muted-foreground">
                            {selectedConfig?.name} support is on the roadmap and will be available
                            soon.
                        </p>
                    </div>
                )}

                {!selectedTech && (
                    <div className="rounded-xl border border-dashed bg-muted/10 p-10 text-center">
                        <p className="text-sm text-muted-foreground">
                            Select a technology above to configure your project
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}