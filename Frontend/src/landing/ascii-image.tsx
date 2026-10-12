import { useEffect, useRef } from "react";

const IMAGE_SRC = "/media/hero-ascii-bg.jpg";

/** Characters for animation overlay */
const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&*+=<>?!.:;'\"";

interface FloatingChar {
  x: number;
  y: number;
  char: string;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  size: number;
}

interface Spark {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  char: string;
  progress: number;
  speed: number;
  r: number;
  g: number;
  b: number;
}

export function AsciiImage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let cancelled = false;
    let raf = 0;
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    let sourceImage: HTMLImageElement | null = null;
    let imageData: ImageData | null = null;
    let sourceCanvas: HTMLCanvasElement | null = null;
    let sourceCtx: CanvasRenderingContext2D | null = null;
    
    const floatingChars: FloatingChar[] = [];
    const sparks: Spark[] = [];
    const pointer = { x: 0.5, y: 0.5 };

    const OVERLAY_CELL = 12;
    const FONT_SIZE = 10;

    // Load the source image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      sourceImage = img;
      sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = img.naturalWidth;
      sourceCanvas.height = img.naturalHeight;
      sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
      if (sourceCtx) {
        sourceCtx.drawImage(img, 0, 0);
        imageData = sourceCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
      }
      layout();
      raf = requestAnimationFrame(loop);
    };
    img.src = IMAGE_SRC;

    function layout() {
      const rect = host!.getBoundingClientRect();
      const nextW = Math.max(1, Math.round(rect.width));
      const nextH = Math.max(1, Math.round(rect.height));
      const nextDpr = Math.min(2, window.devicePixelRatio || 1);
      if (nextW === cssW && nextH === cssH && nextDpr === dpr) return;
      cssW = nextW;
      cssH = nextH;
      dpr = nextDpr;
      const pxW = Math.round(cssW * dpr);
      const pxH = Math.round(cssH * dpr);
      canvas!.width = pxW;
      canvas!.height = pxH;
      canvas!.style.width = `${cssW}px`;
      canvas!.style.height = `${cssH}px`;
    }

    function samplePixel(x: number, y: number): [number, number, number] {
      if (!imageData || !sourceImage) return [0, 0, 0];
      const imgX = Math.floor((x / cssW) * sourceImage.naturalWidth);
      const imgY = Math.floor((y / cssH) * sourceImage.naturalHeight);
      const idx = (Math.min(imgY, sourceImage.naturalHeight - 1) * sourceImage.naturalWidth + Math.min(imgX, sourceImage.naturalWidth - 1)) * 4;
      return [imageData.data[idx], imageData.data[idx + 1], imageData.data[idx + 2]];
    }

    function spawnFloatingChar(x: number, y: number, r: number, g: number, b: number) {
      if (floatingChars.length > 80) return;
      floatingChars.push({
        x: x * dpr,
        y: y * dpr,
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
        vx: (Math.random() - 0.5) * 1.5 * dpr,
        vy: (-Math.random() * 2 - 0.5) * dpr,
        life: 0,
        maxLife: 60 + Math.random() * 100,
        r, g, b,
        size: (8 + Math.random() * 4) * dpr,
      });
    }

    function spawnSpark(fromX: number, fromY: number, toX: number, toY: number, r: number, g: number, b: number) {
      if (sparks.length > 30) return;
      sparks.push({
        x: fromX * dpr,
        y: fromY * dpr,
        targetX: toX * dpr,
        targetY: toY * dpr,
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
        progress: 0,
        speed: 0.01 + Math.random() * 0.02,
        r, g, b,
      });
    }

    function draw(now: number) {
      if (!sourceImage || !ctx || cancelled) return;

      const width = canvas!.width;
      const height = canvas!.height;
      const time = now;
      const waveTime = time * 0.001;

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Draw the base image with cover scaling
      const imgW = sourceImage.naturalWidth;
      const imgH = sourceImage.naturalHeight;
      const imgAspect = imgW / imgH;
      const canvasAspect = width / height;

      let drawW: number, drawH: number, drawX: number, drawY: number;
      if (canvasAspect > imgAspect) {
        drawW = width;
        drawH = width / imgAspect;
        drawX = 0;
        drawY = (height - drawH) / 2;
      } else {
        drawH = height;
        drawW = height * imgAspect;
        drawX = (width - drawW) / 2;
        drawY = 0;
      }

      // Subtle parallax
      const parallaxX = (pointer.x - 0.5) * 15 * dpr;
      const parallaxY = (pointer.y - 0.5) * 8 * dpr;

      // Draw base image
      ctx.save();
      ctx.translate(parallaxX, parallaxY);
      
      // Subtle breathing
      const breathe = 1 + Math.sin(waveTime * 0.25) * 0.006;
      ctx.translate(width / 2, height / 2);
      ctx.scale(breathe, breathe);
      ctx.translate(-width / 2, -height / 2);
      
      ctx.drawImage(sourceImage, drawX - 8, drawY - 8, drawW + 16, drawH + 16);
      ctx.restore();

      // Animated ASCII overlay on bright areas
      const fontSize = Math.round(FONT_SIZE * dpr);
      const cols = Math.ceil(cssW / OVERLAY_CELL);
      const rows = Math.ceil(cssH / (OVERLAY_CELL * 1.2));

      ctx.font = `600 ${fontSize}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cssX = (col + 0.5) * OVERLAY_CELL;
          const cssY = (row + 0.5) * OVERLAY_CELL * 1.2;
          
          const [r, g, b] = samplePixel(cssX, cssY);
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

          // Only overlay on medium-bright to bright areas
          if (brightness < 0.15) continue;

          // Character cycling animation
          const cycle = Math.floor(time * 0.004 + col * 0.15 + row * 0.12);
          const charIndex = (cycle + col * 7 + row * 13) % CHARS.length;
          const char = CHARS[charIndex];

          // Position with wave animation
          const px = cssX * dpr;
          const py = cssY * dpr;
          const waveX = Math.sin(waveTime * 0.7 + row * 0.08 + col * 0.02) * 2 * dpr;
          const waveY = Math.cos(waveTime * 0.5 + col * 0.06) * 1.5 * dpr;

          // Shimmer effect
          const shimmer = Math.sin(time * 0.003 + col * 0.1 + row * 0.08) * 0.5 + 0.5;
          
          // Alpha based on brightness and shimmer
          const alpha = brightness * (0.25 + shimmer * 0.35);
          
          if (alpha < 0.08) continue;

          // Color with boost
          const boost = 1 + shimmer * 0.2;
          const cr = Math.min(255, r * boost);
          const cg = Math.min(255, g * boost);
          const cb = Math.min(255, b * boost);

          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
          ctx.fillText(char, px + waveX + parallaxX * 0.3, py + waveY + parallaxY * 0.3);

          // Spawn floating chars on very bright areas
          if (brightness > 0.5 && Math.random() < 0.0003) {
            spawnFloatingChar(cssX, cssY, r, g, b);
          }

          // Spawn sparks occasionally
          if (brightness > 0.6 && Math.random() < 0.00008) {
            const targetX = cssX + (Math.random() - 0.5) * 150;
            const targetY = cssY + (Math.random() - 0.5) * 100 - 50;
            spawnSpark(cssX, cssY, targetX, targetY, r, g, b);
          }
        }
      }

      // Draw floating characters
      ctx.font = `500 ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
      for (let i = floatingChars.length - 1; i >= 0; i--) {
        const fc = floatingChars[i];
        fc.life++;
        fc.x += fc.vx;
        fc.y += fc.vy;
        fc.vy *= 0.995;
        fc.vx *= 0.99;

        // Change character occasionally
        if (Math.random() < 0.03) {
          fc.char = CHARS[Math.floor(Math.random() * CHARS.length)];
        }

        if (fc.life > fc.maxLife) {
          floatingChars.splice(i, 1);
          continue;
        }

        const lifeRatio = 1 - fc.life / fc.maxLife;
        const fadeIn = Math.min(1, fc.life / 12);
        const alpha = lifeRatio * fadeIn * 0.9;

        ctx.font = `500 ${Math.round(fc.size)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = `rgba(${fc.r}, ${fc.g}, ${fc.b}, ${alpha})`;
        ctx.fillText(fc.char, fc.x, fc.y);
      }

      // Draw sparks (traveling characters)
      ctx.font = `600 ${Math.round(fontSize * 0.8)}px "JetBrains Mono", monospace`;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.progress += s.speed;

        if (s.progress >= 1) {
          sparks.splice(i, 1);
          continue;
        }

        // Ease out movement
        const ease = 1 - Math.pow(1 - s.progress, 3);
        const x = s.x + (s.targetX - s.x) * ease;
        const y = s.y + (s.targetY - s.y) * ease;

        // Fade in and out
        const alpha = Math.sin(s.progress * Math.PI) * 0.8;

        // Change char during travel
        if (Math.random() < 0.1) {
          s.char = CHARS[Math.floor(Math.random() * CHARS.length)];
        }

        ctx.fillStyle = `rgba(${s.r}, ${s.g}, ${s.b}, ${alpha})`;
        ctx.fillText(s.char, x, y);
      }

      // Glow effects
      ctx.globalCompositeOperation = "screen";

      // Main lotus glow
      const glowX = width * 0.68;
      const glowY = height * 0.32;
      const glowRadius = Math.min(width, height) * 0.35;
      const glowPulse = 0.1 + Math.sin(waveTime * 0.5) * 0.04;

      const gradient1 = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowRadius);
      gradient1.addColorStop(0, `rgba(255, 235, 200, ${glowPulse})`);
      gradient1.addColorStop(0.4, `rgba(255, 210, 160, ${glowPulse * 0.5})`);
      gradient1.addColorStop(1, "transparent");
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, width, height);

      // Left flowers glow
      const glow2X = width * 0.18;
      const glow2Y = height * 0.4;
      const glow2Radius = Math.min(width, height) * 0.25;
      const glow2Pulse = 0.06 + Math.sin(waveTime * 0.7 + 1.2) * 0.03;

      const gradient2 = ctx.createRadialGradient(glow2X, glow2Y, 0, glow2X, glow2Y, glow2Radius);
      gradient2.addColorStop(0, `rgba(255, 225, 180, ${glow2Pulse})`);
      gradient2.addColorStop(0.5, `rgba(255, 200, 140, ${glow2Pulse * 0.4})`);
      gradient2.addColorStop(1, "transparent");
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, width, height);

      // Water reflection
      const waterY = height * 0.8;
      const waterGlow = 0.05 + Math.sin(waveTime * 0.35) * 0.025;
      const gradient3 = ctx.createLinearGradient(0, waterY - 30, 0, height);
      gradient3.addColorStop(0, "transparent");
      gradient3.addColorStop(0.3, `rgba(255, 250, 230, ${waterGlow})`);
      gradient3.addColorStop(0.7, `rgba(220, 240, 255, ${waterGlow * 0.6})`);
      gradient3.addColorStop(1, "transparent");
      ctx.fillStyle = gradient3;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "source-over";

      // Vignette
      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.8
      );
      vignette.addColorStop(0, "transparent");
      vignette.addColorStop(1, "rgba(5, 6, 12, 0.4)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    }

    function loop(now: number) {
      draw(now);
      if (!cancelled && !document.hidden) {
        raf = requestAnimationFrame(loop);
      }
    }

    function onMove(event: PointerEvent) {
      const rect = canvas?.getBoundingClientRect();
      if (!rect) return;
      pointer.x = (event.clientX - rect.left) / rect.width;
      pointer.y = (event.clientY - rect.top) / rect.height;
    }

    function onVis() {
      if (cancelled) return;
      cancelAnimationFrame(raf);
      if (!document.hidden && sourceImage) {
        raf = requestAnimationFrame(loop);
      }
    }

    const observer = new ResizeObserver(() => layout());
    observer.observe(host);
    window.addEventListener("pointermove", onMove);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
