"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";

/** Density ramp, sparse → solid. */
const RAMP = " .·:-=+*ø#%@";

const SAMPLE_FPS = 30;

export function AsciiDither({
  videoRef,
  opacity,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  opacity: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const opacityRef = useRef(opacity);
  const pointer = useRef({ x: 0.5, y: 0.5, strength: 0 });
  const reveal = useRef({ v: 0 });

  useEffect(() => {
    opacityRef.current = opacity;
  }, [opacity]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext("2d");
    const sampler = document.createElement("canvas");
    const sctx = sampler.getContext("2d", { willReadFrequently: true });
    if (!ctx || !sctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let cols = 0;
    let rows = 0;
    let cellW = 0;
    let cellH = 0;
    let cssW = 0;
    let cssH = 0;

    function layout() {
      const rect = host!.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return;
      if (
        Math.abs(rect.width - cssW) < 1 &&
        Math.abs(rect.height - cssH) < 1
      ) {
        return;
      }

      cssW = rect.width;
      cssH = rect.height;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(cssW * dpr);
      canvas!.height = Math.round(cssH * dpr);
      canvas!.style.width = `${cssW}px`;
      canvas!.style.height = `${cssH}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.max(24, Math.min(74, Math.round(cssW / 10)));
      cellW = cssW / cols;
      rows = Math.max(10, Math.ceil(cssH / (cellW * 1.55)));
      cellH = cssH / rows;

      sampler.width = cols;
      sampler.height = rows;
    }

    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(host);

    // Pointer is eased by GSAP so the lens trails the cursor.
    const toX = gsap.quickTo(pointer.current, "x", {
      duration: 0.5,
      ease: "power3.out",
    });
    const toY = gsap.quickTo(pointer.current, "y", {
      duration: 0.5,
      ease: "power3.out",
    });
    const toStrength = gsap.quickTo(pointer.current, "strength", {
      duration: 0.7,
      ease: "power2.out",
    });

    function onPointerMove(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return;

      const nx = (event.clientX - rect.left) / rect.width;
      const ny = (event.clientY - rect.top) / rect.height;
      const inside = nx >= -0.15 && nx <= 1.15 && ny >= -0.15 && ny <= 1.15;

      toX(Math.min(1.2, Math.max(-0.2, nx)));
      toY(Math.min(1.2, Math.max(-0.2, ny)));
      toStrength(inside ? 1 : 0);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const revealTween = reduceMotion
      ? null
      : gsap.to(reveal.current, {
          v: 1,
          duration: 1.8,
          ease: "power2.out",
          delay: 0.15,
        });
    if (reduceMotion) reveal.current.v = 1;

    function render() {
      const video = videoRef.current;
      if (
        !video ||
        video.readyState < 2 ||
        !video.videoWidth ||
        cols < 2 ||
        rows < 2
      ) {
        return;
      }

      // Cover-crop the source so a 16:9 video isn't squashed into a
      // portrait grid.
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const target = cssW / cssH;
      let sw = vw;
      let sh = vh;
      if (vw / vh > target) sw = vh * target;
      else sh = vw / target;

      sctx!.drawImage(
        video,
        (vw - sw) / 2,
        (vh - sh) / 2,
        sw,
        sh,
        0,
        0,
        cols,
        rows,
      );
      const { data } = sctx!.getImageData(0, 0, cols, rows);

      ctx!.clearRect(0, 0, cssW, cssH);
      ctx!.font = `${(cellH * 0.94).toFixed(2)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.fillStyle = "#ffffff";

      const px = pointer.current.x * cols;
      const py = pointer.current.y * rows;
      const strength = pointer.current.strength;
      const radius = cols * 0.24;
      const aspect = cellH / cellW;
      const rev = reveal.current.v;

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          // Diagonal wipe for the intro.
          if ((x / cols) * 0.45 + (y / rows) * 0.55 > rev) continue;

          const i = (y * cols + x) * 4;
          let lum =
            (data[i]! * 0.2126 + data[i + 1]! * 0.7152 + data[i + 2]! * 0.0722) /
            255;

          if (strength > 0.002) {
            const dx = x - px;
            const dy = (y - py) * aspect;
            const falloff = 1 - Math.sqrt(dx * dx + dy * dy) / radius;
            if (falloff > 0) lum += falloff * falloff * strength * 0.9;
          }

          if (lum <= 0.06) continue;

          const glyph =
            RAMP[
              Math.min(
                RAMP.length - 1,
                Math.round(Math.min(1, lum) * (RAMP.length - 1)),
              )
            ]!;
          if (glyph === " ") continue;

          ctx!.globalAlpha = 0.28 + 0.72 * Math.min(1, lum);
          ctx!.fillText(glyph, x * cellW + cellW / 2, y * cellH + cellH / 2);
        }
      }

      ctx!.globalAlpha = 1;
    }

    let raf = 0;
    let last = 0;
    const interval = 1000 / SAMPLE_FPS;

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      if (now - last < interval) return;
      last = now;
      if (opacityRef.current < 0.02) return;
      render();
    }

    if (reduceMotion) {
      const once = () => render();
      videoRef.current?.addEventListener("loadeddata", once);
      const timer = window.setTimeout(once, 400);
      return () => {
        observer.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
        videoRef.current?.removeEventListener("loadeddata", once);
        window.clearTimeout(timer);
      };
    }

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      revealTween?.kill();
      gsap.killTweensOf(pointer.current);
    };
  }, [videoRef]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="landing-ascii pointer-events-none absolute inset-0 z-40"
      style={{ opacity }}
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
