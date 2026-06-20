import { useEffect, useRef } from "react";

import { motion } from "framer-motion";

import { DockerIcon } from "@/components/icons/DockerIcon";
import { NextjsIcon } from "@/components/icons/NextjsIcon";
import { PhpIcon } from "@/components/icons/PhpIcon";
import { ReactIcon } from "@/components/icons/ReactIcon";
import { ViteIcon } from "@/components/icons/ViteIcon";
import { VueIcon } from "@/components/icons/VueIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Step1IntroProps {
    onNext: () => void;
}

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

export function Step1Intro({ onNext }: Step1IntroProps) {
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

    useEffect(() => {
        const canvas = document.createElement("canvas");
        canvas.style.cssText =
            "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50";
        document.body.appendChild(canvas);
        const ctx = canvas.getContext("2d")!;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const W = () => canvas.width;
        const H = () => canvas.height;
        const NUM_BEES = 14;

        type Bee = {
            x: number;
            y: number;
            sx: number;
            sy: number;
            tx: number;
            ty: number;
            angle: number;
            wingPhase: number;
            t: number;
            delay: number;
            done: boolean;
            wandering: boolean;
            wanderAngle: number;
            wanderSpeed: number;
            size: number;
            cp1x: number;
            cp1y: number;
            cp2x: number;
            cp2y: number;
            exiting: boolean;
            exitAngle: number;
        };

        const makeBee = (delay: number): Bee => {
            const side = Math.floor(Math.random() * 4);
            let sx = 0,
                sy = 0;
            if (side === 0) {
                sx = Math.random() * W();
                sy = -40;
            } else if (side === 1) {
                sx = W() + 40;
                sy = Math.random() * H();
            } else if (side === 2) {
                sx = Math.random() * W();
                sy = H() + 40;
            } else {
                sx = -40;
                sy = Math.random() * H();
            }
            const tx = W() * 0.2 + Math.random() * W() * 0.6;
            const ty = H() * 0.2 + Math.random() * H() * 0.6;
            return {
                x: sx,
                y: sy,
                sx,
                sy,
                tx,
                ty,
                angle: Math.atan2(ty - sy, tx - sx),
                wingPhase: Math.random() * Math.PI * 2,
                t: 0,
                delay,
                done: false,
                wandering: false,
                wanderAngle: Math.random() * Math.PI * 2,
                wanderSpeed: 0.6 + Math.random() * 0.5,
                size: 0.8 + Math.random() * 0.5,
                cp1x: sx + (Math.random() - 0.5) * 200,
                cp1y: sy + (Math.random() - 0.5) * 200,
                cp2x: tx + (Math.random() - 0.5) * 200,
                cp2y: ty + (Math.random() - 0.5) * 200,
                exiting: false,
                exitAngle: Math.random() * Math.PI * 2,
            };
        };

        const bees: Bee[] = Array.from({ length: NUM_BEES }, (_, i) => makeBee(i * 160 + 200));

        const drawBee = (b: Bee, now: number) => {
            const wing = Math.sin(now * 0.03 + b.wingPhase);
            const s = b.size;
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.angle + Math.PI / 2);
            ctx.scale(s, s);
            ctx.save();
            ctx.rotate(-0.4 + wing * 0.3);
            ctx.beginPath();
            ctx.ellipse(-7, -6, 9, 5, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(147,197,253,0.7)";
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.rotate(0.4 - wing * 0.3);
            ctx.beginPath();
            ctx.ellipse(7, -6, 9, 5, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(147,197,253,0.7)";
            ctx.fill();
            ctx.restore();
            ctx.beginPath();
            ctx.ellipse(0, 0, 7, 11, 0, 0, Math.PI * 2);
            ctx.fillStyle = "#1c1917";
            ctx.fill();
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.rect(-6, -5 + i * 4, 12, 2.5);
                ctx.fillStyle = "#f59e0b";
                ctx.fill();
            }
            ctx.beginPath();
            ctx.ellipse(0, -10, 5, 7, 0, 0, Math.PI * 2);
            ctx.fillStyle = "#f59e0b";
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, -15, 3, 0, Math.PI * 2);
            ctx.fillStyle = "#1c1917";
            ctx.fill();
            ctx.restore();
        };

        const bez = (t: number, p0: number, p1: number, p2: number, p3: number) => {
            const u = 1 - t;
            return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
        };

        let start: number | null = null;
        let beeRaf: number;
        const DURATION = 8000;
        const EXIT_START = 6000;

        const draw = (now: number) => {
            if (!start) start = now;
            const elapsed = now - start;
            ctx.clearRect(0, 0, W(), H());

            bees.forEach((b) => {
                if (elapsed < b.delay) return;
                const lt = elapsed - b.delay;

                if (!b.done) {
                    b.t = Math.min(lt / 1800, 1);
                    b.x = bez(b.t, b.sx, b.cp1x, b.cp2x, b.tx);
                    b.y = bez(b.t, b.sy, b.cp1y, b.cp2y, b.ty);
                    if (b.t < 1) {
                        const nx = bez(b.t + 0.01, b.sx, b.cp1x, b.cp2x, b.tx);
                        const ny = bez(b.t + 0.01, b.sy, b.cp1y, b.cp2y, b.ty);
                        b.angle = Math.atan2(ny - b.y, nx - b.x);
                    }
                    if (b.t >= 1) {
                        b.done = true;
                        b.wandering = true;
                    }
                }

                if (b.wandering && !b.exiting) {
                    if (elapsed > EXIT_START) {
                        b.exiting = true;
                        b.exitAngle = Math.atan2(
                            (b.y > H() / 2 ? H() + 100 : -100) - b.y,
                            (b.x > W() / 2 ? W() + 100 : -100) - b.x
                        );
                    } else {
                        b.wanderAngle += (Math.random() - 0.5) * 0.12;
                        b.x += Math.cos(b.wanderAngle) * b.wanderSpeed;
                        b.y += Math.sin(b.wanderAngle) * b.wanderSpeed;
                        b.angle = b.wanderAngle;
                    }
                }

                if (b.exiting) {
                    b.exitAngle += (Math.random() - 0.5) * 0.05;
                    b.x += Math.cos(b.exitAngle) * (b.wanderSpeed + 2.5);
                    b.y += Math.sin(b.exitAngle) * (b.wanderSpeed + 2.5);
                    b.angle = b.exitAngle;
                }

                const offscreen = b.x < -80 || b.x > W() + 80 || b.y < -80 || b.y > H() + 80;
                if (!offscreen) drawBee(b, now);
            });

            if (elapsed < DURATION) {
                beeRaf = requestAnimationFrame(draw);
            } else {
                ctx.clearRect(0, 0, W(), H());
                canvas.remove();
            }
        };

        beeRaf = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(beeRaf);
            window.removeEventListener("resize", resize);
            canvas.remove();
        };
    }, []);

    useEffect(() => {
        const audio = new Audio("/sounds/351920_3450800-lq.mp3");
        audio.volume = 0.3;
        audio.play().catch(() => {});
        const timeout = setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
        }, 8000);
        return () => {
            clearTimeout(timeout);
            audio.pause();
            audio.currentTime = 0;
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex min-h-screen items-center justify-center"
        >
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-full max-w-2xl px-4"
            >
                <Card className="w-full shadow-2xl border-amber-200 dark:border-amber-800 backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90">
                    <CardHeader className="text-center">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.6, type: "spring", bounce: 0.3 }}
                            className="flex justify-center mb-6"
                        >
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
                                            const a =
                                                (i / TECHS.length) * Math.PI * 2 - Math.PI / 2;
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
                                <motion.img
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
                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                    transition={{ type: "spring", bounce: 0.4 }}
                                />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                        >
                            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                                Welcome to Hive 🐝
                            </CardTitle>
                            <CardDescription className="text-lg mt-2 text-foreground/70">
                                Your local development environment, perfected.
                            </CardDescription>
                        </motion.div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="space-y-4 text-center text-muted-foreground">
                            {[
                                "⚡ Built with Tauri — Blazing fast and lightweight",
                                "📦 Zero dependencies. Zero headaches.",
                                "🚀 One-click PHP, Node.js, and Database management",
                                "🔗 Automatic `.test` domains for all your projects",
                            ].map((text, i) => (
                                <p key={i}>{text}</p>
                            ))}
                        </div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.8, duration: 0.4 }}
                        >
                            <Button
                                onClick={onNext}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Get Started
                                <motion.span
                                    animate={{ x: [0, 4, 0] }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 1.5,
                                        ease: "easeInOut",
                                    }}
                                    className="ml-2"
                                >
                                    →
                                </motion.span>
                            </Button>
                        </motion.div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
