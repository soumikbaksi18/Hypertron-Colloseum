import { useEffect, useRef } from "react";

const INK = "#9DB6DA";
const GLYPHS = "!<>-_/\\[]{}=+*^?#%&$:;.";
const BLOCKS = "█▓▒░";
const MAX_PARTICLES = 140;
const STEP = 14;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ch: string;
  born: number;
  life: number;
  size: number;
  square: boolean;
};

function randChar() {
  if (Math.random() < 0.22) return BLOCKS[(Math.random() * BLOCKS.length) | 0];
  return GLYPHS[(Math.random() * GLYPHS.length) | 0];
}

export function HeroCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = [];
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    let last: { x: number; y: number } | null = null;
    let carry = 0;
    let running = false;
    let frame = 0;
    let prevT = 0;
    let alive = true;

    function resize() {
      const rect = host!.getBoundingClientRect();
      const nextW = Math.max(1, Math.round(rect.width));
      const nextH = Math.max(1, Math.round(rect.height));
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      if (nextW === cssW && nextH === cssH && nextDpr === dpr) return;
      cssW = nextW;
      cssH = nextH;
      dpr = nextDpr;
      canvas!.width = Math.round(cssW * dpr);
      canvas!.height = Math.round(cssH * dpr);
    }

    function spawn(x: number, y: number, speed: number, now: number) {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const big = speed > 2.2 && Math.random() < 0.25;
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14 - 6,
        ch: randChar(),
        born: now,
        life: 500 + Math.random() * 350,
        size: big ? 22 : 12 + Math.random() * 6,
        square: Math.random() < 0.12,
      });
    }

    function tick(now: number) {
      if (!alive) return;
      const dt = Math.min(50, now - prevT);
      prevT = now;
      resize();

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, cssW, cssH);
      ctx!.textBaseline = "middle";
      ctx!.textAlign = "center";

      let living = 0;
      for (const particle of particles) {
        const age = now - particle.born;
        if (age >= particle.life) continue;
        living += 1;
        const k = age / particle.life;
        particle.x += (particle.vx * dt) / 1000;
        particle.y += (particle.vy * dt) / 1000;
        if (Math.random() < 0.06 + k * 0.3) particle.ch = randChar();

        ctx!.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        ctx!.fillStyle = INK;
        if (particle.square || (k > 0.55 && Math.random() < 0.3)) {
          const s = Math.max(3, particle.size * 0.55 * (1 - k * 0.4));
          ctx!.fillRect(particle.x - s / 2, particle.y - s / 2, s, s);
        } else {
          ctx!.font = `${particle.size}px "Cascadia Mono", ui-monospace, monospace`;
          ctx!.fillText(particle.ch, particle.x, particle.y);
        }
      }
      ctx!.globalAlpha = 1;

      if (living * 2 < particles.length) {
        const kept = particles.filter((particle) => now - particle.born < particle.life);
        particles.length = 0;
        particles.push(...kept);
      }

      if (living) {
        frame = requestAnimationFrame(tick);
      } else {
        particles.length = 0;
        running = false;
        ctx!.clearRect(0, 0, cssW, cssH);
      }
    }

    function ensureLoop(now: number) {
      if (running || !particles.length) return;
      running = true;
      prevT = now;
      frame = requestAnimationFrame(tick);
    }

    function onPointerMove(event: PointerEvent | MouseEvent) {
      if ("pointerType" in event && event.pointerType && event.pointerType !== "mouse") return;
      const box = host!.getBoundingClientRect();
      const inside =
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom;
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      if (!inside) {
        last = null;
        carry = 0;
        return;
      }
      const now = performance.now();
      if (!last) {
        last = { x, y };
        return;
      }
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) return;
      const count = Math.floor((dist + carry) / STEP);
      carry = dist + carry - count * STEP;
      for (let i = 1; i <= count; i += 1) {
        const t = (i * STEP - carry) / dist;
        spawn(last.x + dx * t, last.y + dy * t, dist / 16, now);
      }
      last = { x, y };
      ensureLoop(now);
    }

    function onLeave() {
      last = null;
      carry = 0;
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerleave", onLeave);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="landing-hero-cursor" aria-hidden />;
}
