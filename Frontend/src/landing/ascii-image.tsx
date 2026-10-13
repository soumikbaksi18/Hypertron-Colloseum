import { useEffect, useRef } from "react";

const IMAGE_SRC = "/media/hero-ascii-bg.jpg";

export function AsciiImage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = imageRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let cancelled = false;
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    let source: HTMLImageElement | null = null;

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;
      source = img;
      paint();
    };
    img.src = IMAGE_SRC;

    function sizeCanvas() {
      const rect = host!.getBoundingClientRect();
      const nextW = Math.max(1, Math.round(rect.width));
      const nextH = Math.max(1, Math.round(rect.height));
      const nextDpr = Math.min(1.5, window.devicePixelRatio || 1);
      if (nextW === cssW && nextH === cssH && nextDpr === dpr) return false;
      cssW = nextW;
      cssH = nextH;
      dpr = nextDpr;
      canvas!.width = Math.round(cssW * dpr);
      canvas!.height = Math.round(cssH * dpr);
      canvas!.style.width = `${cssW}px`;
      canvas!.style.height = `${cssH}px`;
      return true;
    }

    function paint() {
      if (!source) return;
      sizeCanvas();
      const width = canvas!.width;
      const height = canvas!.height;
      const imgW = source.naturalWidth;
      const imgH = source.naturalHeight;
      const imgAspect = imgW / imgH;
      const canvasAspect = width / height;
      let drawW: number;
      let drawH: number;
      let drawX: number;
      let drawY: number;
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
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.fillStyle = "#03080b";
      ctx!.fillRect(0, 0, width, height);
      ctx!.drawImage(source, drawX, drawY, drawW, drawH);
    }

    const observer = new ResizeObserver(() => {
      if (sizeCanvas() && source) paint();
    });
    observer.observe(host);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <canvas ref={imageRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
