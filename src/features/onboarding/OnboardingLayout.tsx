import { ReactNode, useEffect, useRef } from "react";

interface OnboardingLayoutProps {
    children: ReactNode;
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const SIZE = 34;
        const HEX_H = SIZE * Math.sqrt(3);
        const HEX_W = SIZE * 2;
        const COL_W = HEX_W * 0.75;
        const ROW_H = HEX_H;

        type Hex = {
            cx: number;
            cy: number;
            phase: number;
            speed: number;
            baseOpacity: number;
            glowOpacity: number;
            glowing: boolean;
            glowTimer: number;
            glowDuration: number;
        };

        let hexes: Hex[] = [];

        const buildHexes = () => {
            const W = canvas.width;
            const H = canvas.height;
            const cols = Math.ceil(W / COL_W) + 2;
            const rows = Math.ceil(H / ROW_H) + 2;
            hexes = [];
            for (let col = -1; col < cols; col++) {
                for (let row = -1; row < rows; row++) {
                    hexes.push({
                        cx: col * COL_W,
                        cy: row * ROW_H + (col % 2 === 0 ? 0 : ROW_H / 2),
                        phase: Math.random() * Math.PI * 2,
                        speed: 0.4 + Math.random() * 0.6,
                        baseOpacity: 0.04 + Math.random() * 0.06,
                        glowOpacity: 0,
                        glowing: false,
                        glowTimer: 0,
                        glowDuration: 600 + Math.random() * 300,
                    });
                }
            }
        };
        buildHexes();
        window.addEventListener("resize", buildHexes);

        const hexPath = (cx: number, cy: number, s: number) => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 180) * (60 * i - 30);
                const x = cx + s * Math.cos(angle);
                const y = cy + s * Math.sin(angle);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
        };

        const triggerRipple = () => {
            const src = hexes[Math.floor(Math.random() * hexes.length)];
            hexes.forEach((h) => {
                const dist = Math.sqrt((h.cx - src.cx) ** 2 + (h.cy - src.cy) ** 2);
                setTimeout(() => {
                    h.glowing = true;
                    h.glowOpacity = 0;
                    h.glowTimer = 0;
                }, dist * 2.5);
            });
        };

        triggerRipple();
        const rippleInterval = setInterval(triggerRipple, 3500);

        let last = performance.now();
        let raf: number;

        const draw = (now: number) => {
            const dt = now - last;
            last = now;
            const W = canvas.width;
            const H = canvas.height;

            ctx.clearRect(0, 0, W, H);

            hexes.forEach((h) => {
                const breathe = Math.sin(now * 0.001 * h.speed + h.phase);
                const baseA = h.baseOpacity + breathe * 0.03;

                if (h.glowing) {
                    h.glowTimer += dt;
                    const t = h.glowTimer / h.glowDuration;
                    if (t < 0.3) h.glowOpacity = t / 0.3;
                    else if (t < 0.7) h.glowOpacity = 1;
                    else if (t < 1) h.glowOpacity = 1 - (t - 0.7) / 0.3;
                    else {
                        h.glowing = false;
                        h.glowOpacity = 0;
                    }
                }

                hexPath(h.cx, h.cy, SIZE - 1);
                ctx.fillStyle = `rgba(251,191,36,${baseA + h.glowOpacity * 0.18})`;
                ctx.fill();
                ctx.strokeStyle = `rgba(251,191,36,${0.25 + h.glowOpacity * 0.5})`;
                ctx.lineWidth = 1 + h.glowOpacity * 0.8;
                ctx.stroke();
            });

            raf = requestAnimationFrame(draw);
        };

        raf = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(raf);
            clearInterval(rippleInterval);
            window.removeEventListener("resize", resize);
            window.removeEventListener("resize", buildHexes);
        };
    }, []);

    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -z-10" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}
