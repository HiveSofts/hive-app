import { useEffect } from "react";

import { ArrowLeft, Bug, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
    const navigate = useNavigate();

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
            };
        };

        const bees: Bee[] = Array.from({ length: 14 }, (_, i) => makeBee(i * 160 + 200));

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

                if (b.wandering) {
                    if (elapsed > EXIT_START) {
                        b.wanderAngle += (Math.random() - 0.5) * 0.05;
                        b.x += Math.cos(b.wanderAngle) * (b.wanderSpeed + 2.5);
                        b.y += Math.sin(b.wanderAngle) * (b.wanderSpeed + 2.5);
                        b.angle = b.wanderAngle;
                    } else {
                        b.wanderAngle += (Math.random() - 0.5) * 0.12;
                        b.x += Math.cos(b.wanderAngle) * b.wanderSpeed;
                        b.y += Math.sin(b.wanderAngle) * b.wanderSpeed;
                        b.angle = b.wanderAngle;
                    }
                }

                const offscreen = b.x < -80 || b.x > W() + 80 || b.y < -80 || b.y > H() + 80;
                if (!offscreen) drawBee(b, now);
            });

            if (elapsed < DURATION) beeRaf = requestAnimationFrame(draw);
            else {
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
