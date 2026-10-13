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

function orbitTilted(points: Particle[], rx: number, ry: number, tilt: number, count: number) {
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * rx;
    const y = Math.sin(angle) * ry;
    push(points, x * cos - y * sin, x * sin + y * cos, Math.sin(angle) * 0.08, 1.05, 0.55);
  }
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
  const width = 0.9;
  const height = 0.58;
  const radius = 0.16;
  const dot = (x: number, y: number, alpha = 0.8) => {
    push(points, x, y, (Math.random() - 0.5) * 0.04, 1.15, alpha);
  };

  for (let i = 0; i <= 42; i += 1) {
    const along = -width + radius + (i / 42) * (width * 2 - radius * 2);
    dot(along, height);
    dot(along, -height);
  }
  for (let i = 0; i <= 24; i += 1) {
    const along = height - radius - (i / 24) * (height * 2 - radius * 2);
    dot(width, along);
    dot(-width, along);
  }
  for (let i = 1; i < 7; i += 1) {
    const angle = (i / 7) * (Math.PI / 2);
    dot(width - radius + Math.cos(angle) * radius, height - radius + Math.sin(angle) * radius);
    dot(width - radius + Math.cos(angle) * radius, -height + radius - Math.sin(angle) * radius);
    dot(-width + radius - Math.cos(angle) * radius, height - radius + Math.sin(angle) * radius);
    dot(-width + radius - Math.cos(angle) * radius, -height + radius - Math.sin(angle) * radius);
  }

  const seam = height * 0.28;
  for (let i = 0; i <= 34; i += 1) {
    const along = -width + 0.08 + (i / 34) * (width * 2 - 0.16);
    dot(along, seam, 0.62);
  }

  const claspX = width * 0.38;
  const claspY = -height * 0.22;
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    push(points, claspX + Math.cos(angle) * 0.085, claspY + Math.sin(angle) * 0.085, 0.05, 1.15, 0.9);
  }

  for (let i = 0; i < 36; i += 1) {
    const x = (Math.random() - 0.5) * width * 1.45;
    const y = -Math.random() * (height - 0.12);
    if (Math.abs(x) > width - 0.14 || y > seam - 0.08) continue;
    push(points, x, y, 0, 1, 0.2);
  }

  orbitTilted(points, 1.22, 0.78, -0.42, 64);
  orbitTilted(points, 0.98, 0.52, 0.62, 42);
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
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let elapsed = 0;
    let last = performance.now();
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

    function draw(now: number) {
      if (!running) return;
      frame = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce.matches && visible) elapsed += dt;
      if (!visible && !pointer.inside) return;

      const width = canvas!.clientWidth;
      const height = canvas!.clientHeight;
      const dpr = canvas!.width / Math.max(1, width);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.imageSmoothingEnabled = false;
      ctx!.clearRect(0, 0, width, height);

      const spin = elapsed * 0.055;
      const cos = Math.cos(spin);
      const sin = Math.sin(spin);
      const cx = width * 0.5;
      const cy = height * 0.5;
      const scale = Math.min(width, height) * 0.4;
      let settling = false;

      for (const particle of particles) {
        const x = particle.x * cos - particle.y * sin;
        const y = particle.x * sin + particle.y * cos;
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
        const alpha = Math.min(0.55, (0.16 + particle.alpha * 0.34) * (0.82 + depth * 0.18));
        const widthPx = Math.max(3, Math.round(particle.size * 2.7 * (0.92 + depth * 0.16)));
        const heightPx = Math.max(2, Math.round(widthPx * 0.55));
        const lift = particle.alpha;
        const green = Math.round(198 + lift * 26);
        const blue = Math.round(18 + (1 - lift) * 28);
        ctx!.fillStyle = `rgba(255, ${green}, ${blue}, ${alpha})`;
        ctx!.fillRect(Math.round(sx + particle.ox), Math.round(sy + particle.oy), widthPx, heightPx);
      }

      if (visible && (!reduce.matches || pointer.inside || settling)) frame = requestAnimationFrame(draw);
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
