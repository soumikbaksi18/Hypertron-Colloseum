import { useEffect, useRef } from "react";

export type CardParticleShape = "wallet" | "flower" | "glass";

type Particle = {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
  spark: number;
  ox: number;
  oy: number;
};

const SHAPES: CardParticleShape[] = ["wallet", "flower", "glass"];

export function cardParticleShape(index: number): CardParticleShape {
  return SHAPES[index] ?? "wallet";
}

function push(points: Particle[], x: number, y: number, z: number, size: number, alpha: number, spark = 0) {
  points.push({ x, y, z, size, alpha, spark, ox: 0, oy: 0 });
}

function orbit(points: Particle[], rx: number, ry: number, rz: number, count: number, yShift: number) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const spark = i % 9 === 0 ? Math.random() * 6 : 0;
    push(
      points,
      Math.cos(angle) * rx,
      Math.sin(angle) * ry + yShift,
      Math.sin(angle) * rz,
      spark ? 1.7 : 1.05,
      spark ? 0.95 : 0.42,
      spark,
    );
  }
}

function buildWallet() {
  const points: Particle[] = [];
  const width = 1.05;
  const height = 0.72;
  for (let i = 0; i < 320; i += 1) {
    const t = i / 320;
    const side = Math.floor(t * 4);
    const u = (t * 4) % 1;
    const radius = 0.16;
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = -width + radius + u * (width * 2 - radius * 2);
      y = height;
    } else if (side === 1) {
      x = width;
      y = height - radius - u * (height * 2 - radius * 2);
    } else if (side === 2) {
      x = width - radius - u * (width * 2 - radius * 2);
      y = -height;
    } else {
      x = -width;
      y = -height + radius + u * (height * 2 - radius * 2);
    }
    push(points, x, y, (Math.random() - 0.5) * 0.08, 1.45, 0.9);
    if (i % 4 === 0) push(points, x, y, 0.16, 1.1, 0.35);
  }
  for (let i = 0; i < 180; i += 1) {
    const x = (Math.random() - 0.5) * width * 1.85;
    const y = (Math.random() - 0.5) * height * 1.75;
    if (Math.abs(x) > width - 0.05 || Math.abs(y) > height - 0.05) continue;
    push(points, x, y, (Math.random() - 0.5) * 0.1, 1.05, 0.28);
  }
  for (let i = 0; i < 36; i += 1) {
    const angle = (i / 36) * Math.PI * 2;
    push(points, 0.62 + Math.cos(angle) * 0.09, 0.02 + Math.sin(angle) * 0.09, 0.2, 1.3, 0.95);
  }
  orbit(points, 1.45, 0.38, 0.62, 150, -0.05);
  orbit(points, 1.05, 0.22, 0.4, 80, 0.35);
  return points;
}

function buildFlower() {
  const points: Particle[] = [];
  for (let i = 0; i < 980; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const petal = Math.abs(Math.cos(2 * theta));
    if (petal < 0.12) continue;
    const edge = Math.random() > 0.42;
    const radius = (edge ? 0.78 + Math.random() * 0.22 : Math.random() ** 0.65) * petal;
    push(
      points,
      Math.cos(theta) * radius * 1.2,
      Math.sin(theta) * radius * 1.2,
      (Math.random() - 0.5) * 0.2 * petal,
      edge ? 1.45 : 1.05,
      edge ? 0.92 : 0.22 + petal * 0.35,
    );
  }
  for (let i = 0; i < 50; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.12;
    push(points, Math.cos(angle) * radius, Math.sin(angle) * radius, 0.08, 1.5, 1, 2);
  }
  orbit(points, 1.25, 0.34, 0.5, 70, 0);
  return points;
}

function buildGlass() {
  const points: Particle[] = [];
  for (let i = 0; i < 280; i += 1) {
    const angle = (i / 280) * Math.PI * 2;
    const radius = 0.62 + (Math.random() - 0.5) * 0.03;
    push(points, Math.cos(angle) * radius, Math.sin(angle) * radius + 0.12, (Math.random() - 0.5) * 0.06, 1.5, 0.95);
  }
  for (let i = 0; i < 90; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.5;
    push(points, Math.cos(angle) * radius, Math.sin(angle) * radius + 0.12, (Math.random() - 0.5) * 0.05, 1, 0.22);
  }
  for (let i = 0; i < 70; i += 1) {
    const t = i / 70;
    push(points, 0.4 + t * 0.62, -0.28 - t * 0.62, (Math.random() - 0.5) * 0.04, 1.35, 0.85);
  }
  orbit(points, 1.15, 0.36, 0.7, 120, 0.12);
  orbit(points, 0.85, 0.2, 0.45, 60, 0.55);
  return points;
}

const BUILDERS = {
  wallet: buildWallet,
  flower: buildFlower,
  glass: buildGlass,
};

export function CardParticles({ shape }: { shape: CardParticleShape }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles = BUILDERS[shape]();
    const pointer = { x: 0, y: 0, inside: false };
    let frame = 0;
    let running = true;
    let visible = true;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.max(1, Math.round(rect.width * dpr));
      canvas!.height = Math.max(1, Math.round(rect.height * dpr));
      if (!frame) frame = requestAnimationFrame(draw);
    }

    function onMove(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.inside = true;
      if (!frame) frame = requestAnimationFrame(draw);
    }

    function onLeave() {
      pointer.inside = false;
      if (!frame) frame = requestAnimationFrame(draw);
    }

    function draw() {
      if (!running) return;
      frame = 0;
      if (!visible && !pointer.inside) return;

      const width = canvas!.clientWidth;
      const height = canvas!.clientHeight;
      const dpr = canvas!.width / Math.max(1, width);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.imageSmoothingEnabled = false;
      ctx!.clearRect(0, 0, width, height);

      const cx = width * 0.62;
      const cy = height * 0.4;
      const scale = Math.min(width, height) * 0.52;
      let settling = false;

      for (const particle of particles) {
        const x = particle.x;
        const y = particle.y;
        const z = particle.z;
        const perspective = 2.8 / (2.8 + z);
        const sx = cx + x * scale * perspective;
        const sy = cy - y * scale * perspective;

        particle.ox *= 0.9;
        particle.oy *= 0.9;
        if (pointer.inside) {
          const dx = sx - pointer.x;
          const dy = sy - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 34 && dist > 0.001) {
            const force = (1 - dist / 34) * 1.6;
            particle.ox += (dx / dist) * force;
            particle.oy += (dy / dist) * force;
          }
        }
        const nudge = Math.hypot(particle.ox, particle.oy);
        if (nudge > 6) {
          particle.ox *= 6 / nudge;
          particle.oy *= 6 / nudge;
        }
        if (nudge > 0.2) settling = true;

        const depth = Math.max(0, Math.min(1, (z + 1.3) / 2.2));
        const alpha = Math.min(1, (0.72 + particle.alpha * 0.28) * (0.85 + depth * 0.15));
        const widthPx = Math.max(5, Math.round(particle.size * 3.8 * (0.92 + depth * 0.2)));
        const heightPx = Math.max(3, Math.round(widthPx * 0.52));
        const lift = 0.35 + particle.alpha * 0.65;
        const green = Math.round(246 + lift * 8);
        const blue = Math.round(176 + lift * 58);
        ctx!.fillStyle = `rgba(255, ${green}, ${blue}, ${alpha})`;
        ctx!.fillRect(Math.round(sx + particle.ox), Math.round(sy + particle.oy), widthPx, heightPx);
      }

      if ((pointer.inside || settling) && visible) frame = requestAnimationFrame(draw);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const view = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible && !frame) frame = requestAnimationFrame(draw);
    });
    view.observe(canvas);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    if (!frame) frame = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      view.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [shape]);

  return <canvas ref={canvasRef} className="landing-card-particles" aria-hidden />;
}
