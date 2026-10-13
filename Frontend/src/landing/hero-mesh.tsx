import { useEffect, useRef } from "react";

const IMAGE_W = 1672;
const IMAGE_H = 941;

type Landmark = {
  nx: number;
  ny: number;
  label?: boolean;
  eye?: boolean;
};

const LANDMARKS: Landmark[] = [
  { nx: 0.781, ny: 0.09 },
  { nx: 0.792, ny: 0.236 },
  { nx: 0.723, ny: 0.313 },
  { nx: 0.625, ny: 0.382 },
  { nx: 0.801, ny: 0.356, eye: true },
  { nx: 0.84, ny: 0.348 },
  { nx: 0.889, ny: 0.434 },
  { nx: 0.879, ny: 0.503 },
  { nx: 0.85, ny: 0.59 },
  { nx: 0.781, ny: 0.451 },
  { nx: 0.732, ny: 0.538 },
  { nx: 0.703, ny: 0.694 },
  { nx: 0.684, ny: 0.851 },
  { nx: 0.76, ny: 0.78 },
  { nx: 0.868, ny: 0.285 },
];

const EDGES = buildEdges(LANDMARKS);
const ASCII_RAMP = " .:-=+*#%@";
const HERO_SRC = "/media/image2.png";

function buildEdges(marks: Landmark[]): Array<[number, number]> {
  const edges: Array<[number, number]> = [];
  const seen = new Set<string>();

  for (let i = 0; i < marks.length; i++) {
    const dists = marks
      .map((mark, j) => ({
        j,
        d: Math.hypot(mark.nx - marks[i].nx, mark.ny - marks[i].ny),
      }))
      .filter((item) => item.j !== i)
      .sort((a, b) => a.d - b.d);

    const links = [
      ...dists.filter((item) => item.d < 0.18).slice(0, 4),
      ...dists.filter((item) => item.d >= 0.18 && item.d < 0.3).slice(0, 1),
    ];

    for (const link of links) {
      const a = Math.min(i, link.j);
      const b = Math.max(i, link.j);
      const key = `${a}-${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([a, b]);
    }
  }

  return edges;
}

type Node = Landmark & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  freq: number;
  amp: number;
  seed: number;
};

function coverRightCenter(boxW: number, boxH: number, imgW: number, imgH: number) {
  const imgAspect = imgW / imgH;
  const boxAspect = boxW / boxH;
  if (boxAspect > imgAspect) {
    const w = boxW;
    const h = boxW / imgAspect;
    return { x: 0, y: (boxH - h) / 2, w, h };
  }
  const h = boxH;
  const w = boxH * imgAspect;
  return { x: boxW - w, y: 0, w, h };
}

function createNodes(): Node[] {
  return LANDMARKS.map((mark, i) => ({
    ...mark,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    phase: i * 0.73,
    freq: 0.22 + (i % 5) * 0.05,
    amp: mark.eye ? 4.4 : 7.2 + (i % 3) * 2.1,
    seed: 1800 + i * 347,
  }));
}

export function HeroMesh() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glitterRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const glitter = glitterRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !glitter || !host) return;

    const ctx = canvas.getContext("2d");
    const glitterCtx = glitter.getContext("2d");
    if (!ctx || !glitterCtx) return;

    const nodes = createNodes();
    const mouse = { x: 0, y: 0, inside: false, active: 0 };
    const luma = { data: null as Float32Array | null, w: 0, h: 0 };
    let specks: Speck[] = [];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = reduce.matches;
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    let frame = 0;
    let last = performance.now();
    let elapsed = 0;
    let running = true;

    const onReduce = () => {
      reduceMotion = reduce.matches;
    };
    reduce.addEventListener("change", onReduce);

    function sizeCanvas() {
      const rect = host!.getBoundingClientRect();
      const nextW = Math.max(1, Math.round(rect.width));
      const nextH = Math.max(1, Math.round(rect.height));
      const nextDpr = Math.min(2, window.devicePixelRatio || 1);
      if (nextW === cssW && nextH === cssH && nextDpr === dpr) return;
      cssW = nextW;
      cssH = nextH;
      dpr = nextDpr;
      const width = Math.round(cssW * dpr);
      const height = Math.round(cssH * dpr);
      canvas!.width = width;
      canvas!.height = height;
      canvas!.style.width = `${cssW}px`;
      canvas!.style.height = `${cssH}px`;
      glitter!.width = width;
      glitter!.height = height;
      glitter!.style.width = `${cssW}px`;
      glitter!.style.height = `${cssH}px`;
    }

    function imageRect() {
      const img = host!.querySelector<HTMLImageElement>(".landing-hero-bg");
      const imgW = img?.naturalWidth || IMAGE_W;
      const imgH = img?.naturalHeight || IMAGE_H;
      return coverRightCenter(cssW, cssH, imgW, imgH);
    }

    function homeOf(node: Node, rect: ReturnType<typeof imageRect>) {
      return {
        x: rect.x + node.nx * rect.w,
        y: rect.y + node.ny * rect.h,
      };
    }

    function sampleLuma(nx: number, ny: number) {
      if (!luma.data || !luma.w || !luma.h) return 0;
      const x = Math.max(0, Math.min(luma.w - 1, Math.floor(nx * luma.w)));
      const y = Math.max(0, Math.min(luma.h - 1, Math.floor(ny * luma.h)));
      return luma.data[y * luma.w + x] ?? 0;
    }

    const source = new Image();
    source.decoding = "async";
    source.onload = () => {
      if (!running) return;
      const w = 256;
      const h = Math.max(1, Math.round((w * IMAGE_H) / IMAGE_W));
      const probe = document.createElement("canvas");
      probe.width = w;
      probe.height = h;
      const probeCtx = probe.getContext("2d", { willReadFrequently: true });
      if (!probeCtx) return;
      probeCtx.drawImage(source, 0, 0, w, h);
      const pixels = probeCtx.getImageData(0, 0, w, h).data;
      const data = new Float32Array(w * h);
      for (let i = 0; i < data.length; i++) {
        const o = i * 4;
        data[i] = (pixels[o] * 0.2126 + pixels[o + 1] * 0.7152 + pixels[o + 2] * 0.0722) / 255;
      }
      luma.data = data;
      luma.w = w;
      luma.h = h;
      specks = buildSpecks(data, w, h);
    };
    source.src = HERO_SRC;

    function onPointerMove(event: PointerEvent) {
      const box = host!.getBoundingClientRect();
      mouse.x = event.clientX - box.left;
      mouse.y = event.clientY - box.top;
      mouse.inside =
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom;
    }

    function onPointerLeave() {
      mouse.inside = false;
    }

    function covered() {
      const sheet = document.querySelector(".landing-ways-sheet");
      if (!sheet) return false;
      return sheet.getBoundingClientRect().top < window.innerHeight * 0.18;
    }

    function tick(now: number) {
      if (!running) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      elapsed += dt;

      if (document.hidden || covered()) {
        frame = requestAnimationFrame(tick);
        return;
      }

      sizeCanvas();
      const rect = imageRect();
      const reach = Math.max(130, Math.min(cssW, cssH) * 0.22);
      mouse.active += ((mouse.inside ? 1 : 0) - mouse.active) * Math.min(1, dt * 8);

      for (const node of nodes) {
        const home = homeOf(node, rect);
        const idle = reduceMotion
          ? 0
          : Math.sin(elapsed * node.freq + node.phase) +
            Math.sin(elapsed * (node.freq * 2.15) + node.phase * 0.6) * 0.38;
        const idleY = reduceMotion
          ? 0
          : Math.cos(elapsed * (node.freq * 0.82) + node.phase * 1.3) +
            Math.sin(elapsed * (node.freq * 1.7) + node.seed) * 0.32;
        node.x = home.x + idle * node.amp;
        node.y = home.y + idleY * node.amp * 0.8;
      }

      glitterCtx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      glitterCtx!.clearRect(0, 0, cssW, cssH);
      drawDitherField(glitterCtx!, specks, rect, elapsed, reduceMotion);

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, cssW, cssH);
      drawAsciiPatches(ctx!, nodes, mouse, reach, elapsed, rect, reduceMotion, sampleLuma);
      drawMesh(ctx!, nodes, mouse, elapsed, cssW);

      frame = requestAnimationFrame(tick);
    }

    sizeCanvas();
    const boot = imageRect();
    for (const node of nodes) {
      const home = homeOf(node, boot);
      node.x = home.x;
      node.y = home.y;
    }

    const observer = new ResizeObserver(() => sizeCanvas());
    observer.observe(host);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      reduce.removeEventListener("change", onReduce);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <>
      <canvas ref={glitterRef} className="landing-hero-glitter" aria-hidden />
      <canvas ref={canvasRef} className="landing-hero-mesh" aria-hidden />
    </>
  );
}

type Speck = {
  nx: number;
  ny: number;
  seed: number;
  luma: number;
};

function nearStone(data: Float32Array, w: number, h: number, x: number, y: number) {
  const radius = 4;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      if ((data[yy * w + xx] ?? 0) > 0.075) return true;
    }
  }
  return false;
}

function buildSpecks(data: Float32Array, w: number, h: number): Speck[] {
  const specks: Speck[] = [];
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const value = data[y * w + x] ?? 0;
      if (value < 0.003 || value > 0.032) continue;
      if (nearStone(data, w, h, x, y)) continue;
      const patch = hash2(Math.floor(x / 16), Math.floor(y / 12), 4);
      if (patch < 0.62) continue;
      const seed = hash2(x, y, 9);
      if (seed > 0.42) continue;
      specks.push({ nx: x / w, ny: y / h, seed, luma: value });
    }
  }
  return specks;
}

function drawDitherField(
  ctx: CanvasRenderingContext2D,
  specks: Speck[],
  rect: { x: number; y: number; w: number; h: number },
  elapsed: number,
  reduceMotion: boolean,
) {
  if (!specks.length || rect.w < 8) return;
  const shift = reduceMotion ? 0 : (elapsed * 0.22) % 1;
  for (const speck of specks) {
    const phase = (speck.seed + shift) % 1;
    if (!reduceMotion && phase > 0.42) continue;
    const x = rect.x + speck.nx * rect.w;
    const y = rect.y + speck.ny * rect.h;
    const fade = reduceMotion ? 1 : 1 - phase / 0.42;
    const alpha = (0.08 + speck.luma * 0.2) * fade;
    const icy = speck.seed > 0.55;
    ctx.fillStyle = icy
      ? `rgba(186, 214, 255, ${alpha})`
      : `rgba(232, 238, 246, ${alpha * 0.7})`;
    const size = speck.seed > 0.7 ? 1.8 : 1.1;
    ctx.fillRect(x, y, size, size);
  }
}

function hash2(x: number, y: number, seed: number) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 0.001) * 43758.5453;
  return n - Math.floor(n);
}

function drawAsciiPatches(
  ctx: CanvasRenderingContext2D,
  nodes: Node[],
  mouse: { x: number; y: number; active: number },
  reach: number,
  elapsed: number,
  rect: { x: number; y: number; w: number; h: number },
  reduceMotion: boolean,
  sample: (nx: number, ny: number) => number,
) {
  if (rect.w < 8 || rect.h < 8) return;

  const cell = 8;
  ctx.save();
  ctx.font = `${cell}px "Cascadia Mono", ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const node of nodes) {
    const near =
      mouse.active *
      Math.max(0, 1 - Math.hypot(mouse.x - node.x, mouse.y - node.y) / reach);
    const radius = (node.eye ? 44 : 34) + near * 14;
    const r2 = radius * radius;

    for (let gy = -radius; gy <= radius; gy += cell) {
      for (let gx = -radius; gx <= radius; gx += cell) {
        if (gx * gx + gy * gy > r2) continue;
        const nx = node.nx + gx / rect.w;
        const ny = node.ny + gy / rect.h;
        const value = sample(nx, ny);
        if (value < 0.045) continue;

        const n = hash2(gx, gy, node.seed);
        const flick = reduceMotion
          ? 0
          : Math.sin(elapsed * 5.4 + n * 18 + node.phase) > 0.72
            ? 1
            : 0;
        let idx = Math.floor(value * (ASCII_RAMP.length - 1) + flick);
        idx = Math.max(0, Math.min(ASCII_RAMP.length - 1, idx));
        const ch = ASCII_RAMP[idx];
        if (!ch || ch === " ") continue;

        const fade = 1 - Math.hypot(gx, gy) / radius;
        const tone = node.eye ? "214, 181, 138" : "195, 208, 232";
        ctx.fillStyle = `rgba(${tone}, ${0.1 + value * 0.18 + fade * 0.08 + near * 0.1})`;
        ctx.fillText(ch, node.x + gx, node.y + gy);
      }
    }
  }

  ctx.restore();
}

function drawMesh(
  ctx: CanvasRenderingContext2D,
  nodes: Node[],
  mouse: { x: number; y: number; active: number },
  elapsed: number,
  cssW: number,
) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (const [a, b] of EDGES) {
    const na = nodes[a];
    const nb = nodes[b];
    const midX = (na.x + nb.x) / 2;
    const midY = (na.y + nb.y) / 2;
    const near = Math.max(0, 1 - Math.hypot(mouse.x - midX, mouse.y - midY) / 160);
    const linked = mouse.active * near;
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.15 + a * 0.4 + b * 0.21);
    const alpha = (na.eye || nb.eye ? 0.07 : 0.045) + pulse * 0.02;
    ctx.strokeStyle = na.eye || nb.eye
      ? `rgba(214, 181, 138, ${alpha * (1 - linked) })`
      : `rgba(195, 208, 232, ${alpha * (1 - linked)})`;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  if (mouse.active > 0.04) {
    const reach = 190;
    const nearest = nodes
      .map((node) => ({
        node,
        d: Math.hypot(mouse.x - node.x, mouse.y - node.y),
      }))
      .filter((item) => item.d < reach)
      .sort((a, b) => a.d - b.d)
      .slice(0, 4);

    for (let i = 0; i < nearest.length; i++) {
      for (let j = i + 1; j < nearest.length; j++) {
        const left = nearest[i];
        const right = nearest[j];
        const span = Math.hypot(left.node.x - right.node.x, left.node.y - right.node.y);
        if (span > 320) continue;
        const t = mouse.active * (1 - Math.max(left.d, right.d) / reach);
        if (t < 0.04) continue;
        ctx.beginPath();
        ctx.moveTo(left.node.x, left.node.y);
        ctx.lineTo(right.node.x, right.node.y);
        const gold = left.node.eye || right.node.eye;
        ctx.strokeStyle = gold
          ? `rgba(214, 181, 138, ${0.15 + t * 0.55})`
          : `rgba(195, 208, 232, ${0.12 + t * 0.45})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
  }

  const showLabels = cssW >= 640;
  for (const node of nodes) {
    const pop = labelPop(elapsed, node.phase, node.seed);
    const color = node.eye ? "rgba(214, 181, 138, 0.72)" : "rgba(195, 208, 232, 0.48)";
    drawAnchor(ctx, node.x, node.y, (node.eye ? 8 : 6.5) + pop * 1.4, color);
    if (!showLabels || pop <= 0.02) continue;

    const tick = elapsed * 18 + node.seed;
    const text = `${(node.x * 4.17 + node.seed + Math.sin(tick) * 2.4).toFixed(5)},${(
      node.y * 5.04 +
      node.seed * 0.71 +
      Math.cos(tick * 0.87) * 1.8
    ).toFixed(5)}`;
    ctx.font = "10px 'Cascadia Mono', ui-monospace, monospace";
    ctx.fillStyle = `rgba(195, 208, 232, ${0.28 + pop * 0.34})`;
    const flip = node.nx > 0.87;
    const width = ctx.measureText(text).width;
    ctx.fillText(text, node.x + (flip ? -width - 8 : 10), node.y - 8);
  }
}

function labelPop(elapsed: number, phase: number, seed: number) {
  const hold = 0.85;
  const fade = 0.28;
  const gap = 4.6 + (seed % 5) * 0.35;
  const period = hold + fade * 2 + gap;
  const t = (elapsed + phase * 2.7 + seed * 0.013) % period;
  if (t < fade) return t / fade;
  if (t < fade + hold) return 1;
  if (t < fade * 2 + hold) return 1 - (t - fade - hold) / fade;
  return 0;
}

function drawAnchor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.9;
  ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  ctx.fillStyle = "rgba(195, 208, 232, 0.34)";
  ctx.fillRect(x - 1, y - 1, 2, 2);
}
