import { useState } from "react";

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
    DataBaseIcon,
    FastApiIcon,
    Html5Icon,
    NginxIcon,
    NodejsIcon,
    WordpressIcon,
} from "@/components/icons";
import { DjangoIcon } from "@/components/icons/DjangoIcon";
import { DockerIcon } from "@/components/icons/DockerIcon";
import { LaravelIcon } from "@/components/icons/LaravelIcon";
import { NextjsIcon } from "@/components/icons/NextjsIcon";
import { PhpIcon } from "@/components/icons/PhpIcon";
import { ReactIcon } from "@/components/icons/ReactIcon";
import { ViteIcon } from "@/components/icons/ViteIcon";
import { VueIcon } from "@/components/icons/VueIcon";
import { Button } from "@/components/ui/button";
import { CreateDataBaseProject } from "@/pages/projects/components/CreateProjects/database/CreateDataBaseProject.tsx";
import { CreateNextJsProject } from "@/pages/projects/components/CreateProjects/nextjs/CreateNextJsProject.tsx";
import { CreateNodejsProject } from "@/pages/projects/components/CreateProjects/nodejs/CreateNodejsProject.tsx";
import { CreatePhpProject } from "@/pages/projects/components/CreateProjects/php/CreatePhpProject.tsx";
import { CreateReactProject } from "@/pages/projects/components/CreateProjects/react/CreateReactProject.tsx";
import { CreateStaticProject } from "@/pages/projects/components/CreateProjects/static/CreateStaticProject.tsx";
import { CreateViteProject } from "@/pages/projects/components/CreateProjects/vite/CreateViteProject.tsx";
import { CreateVueProject } from "@/pages/projects/components/CreateProjects/vue/CreateVueProject.tsx";
import { CreateWordPressProject } from "@/pages/projects/components/CreateProjects/wordpress/CreateWordPressProject.tsx";

import { CreateLaravelProject } from "./components/CreateProjects/laravel/CreateLaravelProject.tsx";

const TECHNOLOGIES = [
    {
        id: "laravel",
        name: "Laravel",
        icon: LaravelIcon,
        color: "border-red-500/40 hover:border-red-500/80 hover:bg-red-500/5",
        selectedColor: "border-red-500 bg-red-500/10 ring-1 ring-red-500/50",
        available: true,
    },
    {
        id: "php",
        name: "PHP",
        icon: PhpIcon,
        color: "border-indigo-500/40 hover:border-indigo-500/80 hover:bg-indigo-500/5",
        selectedColor: "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50",
        available: true,
    },
    {
        id: "wordpress",
        name: "WordPress",
        icon: WordpressIcon,
        color: "border-sky-500/40 hover:border-sky-500/80 hover:bg-sky-500/5",
        selectedColor: "border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/50",
        available: true,
    },
    {
        id: "nodejs",
        name: "Node.js",
        icon: NodejsIcon,
        color: "border-lime-500/40 hover:border-lime-500/80 hover:bg-lime-500/5",
        selectedColor: "border-lime-500 bg-lime-500/10 ring-1 ring-lime-500/50",
        available: true,
    },
    {
        id: "database",
        name: "Database",
        icon: DataBaseIcon,
        color: "border-amber-500/40 hover:border-amber-500/80 hover:bg-amber-500/5",
        selectedColor: "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50",
        available: true,
    },
    {
        id: "html5",
        name: "HTML5",
        icon: Html5Icon,
        color: "border-orange-500/40 hover:border-orange-500/80 hover:bg-orange-500/5",
        selectedColor: "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/50",
        available: true,
    },
    {
        id: "react",
        name: "React",
        icon: ReactIcon,
        color: "border-cyan-500/40 hover:border-cyan-500/80 hover:bg-cyan-500/5",
        selectedColor: "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/50",
        available: true,
    },
    {
        id: "vue",
        name: "Vue",
        icon: VueIcon,
        color: "border-emerald-500/40 hover:border-emerald-500/80 hover:bg-emerald-500/5",
        selectedColor: "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50",
        available: true,
    },
    {
        id: "nextjs",
        name: "Next.js",
        icon: NextjsIcon,
        color: "border-zinc-500/40 hover:border-zinc-500/80 hover:bg-zinc-500/5",
        selectedColor: "border-zinc-500 bg-zinc-500/10 ring-1 ring-zinc-500/50",
        available: true,
    },
    {
        id: "vite",
        name: "Vite",
        icon: ViteIcon,
        color: "border-purple-500/40 hover:border-purple-500/80 hover:bg-purple-500/5",
        selectedColor: "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/50",
        available: true,
    },
    {
        id: "docker",
        name: "Docker",
        icon: DockerIcon,
        color: "border-blue-500/40 hover:border-blue-500/80 hover:bg-blue-500/5",
        selectedColor: "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50",
        available: false,
        soon: true,
    },
    {
        id: "django",
        name: "Django",
        icon: DjangoIcon,
        color: "border-indigo-500/40 hover:border-indigo-500/80 hover:bg-indigo-500/5",
        selectedColor: "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50",
        available: false,
        soon: true,
    },
    {
        id: "nginx",
        name: "Nginx",
        icon: NginxIcon,
        color: "border-green-500/40 hover:border-green-500/80 hover:bg-green-500/5",
        selectedColor: "border-green-500 bg-green-500/10 ring-1 ring-green-500/50",
        available: false,
        soon: true,
    },
    {
        id: "fastapi",
        name: "FastAPI",
        icon: FastApiIcon,
        color: "border-teal-500/40 hover:border-teal-500/80 hover:bg-teal-500/5",
        selectedColor: "border-teal-500 bg-teal-500/10 ring-1 ring-teal-500/50",
        available: false,
        soon: true,
    },
];

export default function CreateProjectPage() {
    const navigate = useNavigate();
    const [selectedTech, setSelectedTech] = useState<string | null>(null);

    const handleProjectCreated = () => {
        navigate("/projects");
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
            case "database":
                return <CreateDataBaseProject onSuccess={handleProjectCreated} />;
            case "html5":
                return <CreateStaticProject onSuccess={handleProjectCreated} />;
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
