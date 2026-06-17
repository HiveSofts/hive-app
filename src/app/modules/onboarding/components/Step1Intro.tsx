import { DockerIcon, NextjsIcon, PhpIcon, ReactIcon, ViteIcon, VueIcon } from "@/app/components/icons";
import { Button } from "@/app/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Card } from "@solar-icons/react";
import { useEffect, useRef } from "react";


const TECHS = [
    { name: "PHP", icon: PhpIcon, color: "#777BB4" },
    { name: "React", icon: ReactIcon, color: "#61DAFB" },
    { name: "Vue", icon: VueIcon, color: "#2C3E50" },
    { name: "Next.js", icon: NextjsIcon, color: "#615f5f" },
    { name: "Vite", icon: ViteIcon, color: "#BD34FE" },
    { name: "Docker", icon: DockerIcon, color: "#0091e2" },
];

const R = 95;
const C = 130;
const SIZE = 260;

export function Step1Intro({ onNext }: { onNext: () => void }) {
    const groupRef = useRef<SVGGElement>(null);
    const angleRef = useRef(0);
    const rafRef = useRef(0);

    useEffect(() => {
        const step = () => {
            angleRef.current += 0.004;
            if (groupRef.current) {
                groupRef.current.setAttribute(
                    "transform",
                    `rotate(${(angleRef.current * 180) / Math.PI}, ${C}, ${C})`
                );
                groupRef.current.querySelectorAll<SVGGElement>("[data-counter]").forEach((el) => {
                    el.setAttribute("transform", `rotate(${(-angleRef.current * 180) / Math.PI})`);
                });
            }
            rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-white dark:from-zinc-950 dark:to-zinc-900">
            <Card className="w-full max-w-2xl shadow-2xl border-amber-200 dark:border-amber-800">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-6">
                        <div style={{ position: "relative", width: SIZE, height: SIZE }}>
                            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                                <circle
                                    cx={C}
                                    cy={C}
                                    r={R}
                                    fill="none"
                                    stroke="rgba(180,150,80,0.25)"
                                    strokeWidth="1"
                                    strokeDasharray="4 5"
                                />

                                <g ref={groupRef}>
                                    {TECHS.map((tech, i) => {
                                        const a = (i / TECHS.length) * Math.PI * 2 - Math.PI / 2;
                                        const x = C + R * Math.cos(a);
                                        const y = C + R * Math.sin(a);
                                        const IconComponent = tech.icon;
                                        return (
                                            <g key={tech.name}>
                                                <line
                                                    x1={C}
                                                    y1={C}
                                                    x2={x}
                                                    y2={y}
                                                    stroke="rgba(180,150,80,0.2)"
                                                    strokeWidth="0.8"
                                                    strokeDasharray="3 4"
                                                />
                                                <g transform={`translate(${x},${y})`}>
                                                    <rect
                                                        x="-16"
                                                        y="-16"
                                                        width="32"
                                                        height="32"
                                                        rx="7"
                                                        fill={tech.color}
                                                    />
                                                    <g data-counter="">
                                                        <foreignObject
                                                            x="-12"
                                                            y="-12"
                                                            width="24"
                                                            height="24"
                                                        >
                                                            <IconComponent className="w-6 h-6 text-white" />
                                                        </foreignObject>
                                                    </g>
                                                </g>
                                            </g>
                                        );
                                    })}
                                </g>
                            </svg>

                            <img
                                src="/hive.png"
                                alt="Hive"
                                style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%,-50%)",
                                    width: 72,
                                    height: 72,
                                    borderRadius: 14,
                                    zIndex: 10,
                                }}
                            />
                        </div>
                    </div>

                    <CardTitle className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                        Welcome to Hive 🐝
                    </CardTitle>
                    <CardDescription className="text-lg mt-2">
                        Your local development environment, perfected.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="space-y-4 text-center text-muted-foreground">
                        <p>⚡ Built with Tauri — Blazing fast and lightweight</p>
                        <p>📦 Zero dependencies. Zero headaches.</p>
                        <p>🚀 One-click PHP, Node.js, and Database management</p>
                        <p>🔗 Automatic `.test` domains for all your projects</p>
                    </div>
                    <Button
                        onClick={onNext}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        Get Started →
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
