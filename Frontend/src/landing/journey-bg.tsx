"use client";

import { useEffect, useRef } from "react";
import { clamp01, subscribeScroll } from "./scroll-sync";

const FRAME_COUNT = 259;
const DIR = "/media/journey-frames";

function frameSrc(index: number) {
  const n = String(Math.min(FRAME_COUNT, Math.max(1, index))).padStart(3, "0");
  return `${DIR}/frame-${n}.jpg`;
}

const cache = new Map<number, HTMLImageElement>();

function loadFrame(index: number) {
  const existing = cache.get(index);
  if (existing) return existing;
  const image = new Image();
  image.decoding = "async";
  image.src = frameSrc(index);
  cache.set(index, image);
  return image;
}

function preloadAround(index: number, radius = 10) {
  const start = Math.max(1, index - radius);
  const end = Math.min(FRAME_COUNT, index + radius);
  for (let i = start; i <= end; i += 1) loadFrame(i);
}

export function JourneyBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let lastDrawn = 0;
    let idleId = 0;

    function resize() {
      const node = canvasRef.current;
      if (!node || !context) return;
      const bounds = node.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(bounds.width * dpr));
      const height = Math.max(1, Math.round(bounds.height * dpr));
      if (node.width !== width || node.height !== height) {
        node.width = width;
        node.height = height;
        lastDrawn = 0;
        // Frames are keyed with `screen`, so bare canvas must be black.
        context.fillStyle = "#000000";
        context.fillRect(0, 0, width, height);
      }
    }

    function paint(image: HTMLImageElement) {
      const node = canvasRef.current;
      if (!node || !context) return;
      const { width, height } = node;
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const dw = image.naturalWidth * scale;
      const dh = image.naturalHeight * scale;
      context.fillStyle = "#000000";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, width - dw, (height - dh) / 2, dw, dh);
    }

    function draw(index: number) {
      const image = loadFrame(index);
      if (!image.complete || image.naturalWidth === 0) {
        image.onload = () => {
          if (frameRef.current === index) draw(index);
        };
        const fallback = lastDrawn ? cache.get(lastDrawn) : undefined;
        if (fallback?.complete) paint(fallback);
        return;
      }
      paint(image);
      lastDrawn = index;
    }

    function sync() {
      const section = document.getElementById("protocol");
      const wrap = wrapRef.current;
      if (!section || !wrap) return;
      resize();

      const vh = window.innerHeight;
      const rect = section.getBoundingClientRect();

      // The sequence runs out as the final step settles at mid-screen, so the
      // machine never bleeds into the section below.
      const last = section.querySelector("[data-journey-last]");
      const lastRect = last?.getBoundingClientRect();
      const lastCenter = lastRect
        ? lastRect.top + lastRect.height / 2
        : rect.bottom;

      const fadeZone = vh * 0.18;
      const offsetToLast = lastCenter - rect.top;

      const start = vh * 0.7;
      const end = vh * 0.5 + fadeZone - offsetToLast;
      const progress = clamp01((start - rect.top) / Math.max(1, start - end));

      const index = 1 + Math.round(progress * (FRAME_COUNT - 1));
      frameRef.current = index;
      preloadAround(index);
      draw(index);

      const opacity = clamp01((lastCenter - vh * 0.5) / Math.max(1, fadeZone));
      wrap.style.opacity = String(opacity);
    }

    loadFrame(1);
    const unsub = subscribeScroll(sync);

    let next = 1;
    const pump = () => {
      for (let i = 0; i < 8 && next <= FRAME_COUNT; i += 1) {
        loadFrame(next);
        next += 1;
      }
      if (next <= FRAME_COUNT) {
        idleId = window.requestIdleCallback
          ? window.requestIdleCallback(pump)
          : window.setTimeout(pump, 24);
      }
    };
    pump();

    return () => {
      unsub();
      if (idleId) {
        if (window.cancelIdleCallback) window.cancelIdleCallback(idleId);
        else window.clearTimeout(idleId);
      }
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="landing-journey-frames pointer-events-none sticky top-0 z-0 -mb-[100svh] h-[100svh] w-full overflow-hidden"
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
