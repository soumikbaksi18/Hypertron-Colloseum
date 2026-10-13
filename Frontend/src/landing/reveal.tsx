"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { clamp01, subscribeScroll } from "./scroll-sync";

export function ScrollFade({
  children,
  className,
  from = 0.96,
  to = 0.32,
  lag = 0,
}: {
  children: ReactNode;
  className?: string;
  from?: number;
  to?: number;
  lag?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setProgress(1);
      return;
    }

    return subscribeScroll(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * from;
      const end = vh * to;
      setProgress(clamp01((start - rect.top) / Math.max(1, start - end) - lag));
    });
  }, [from, lag, reduceMotion, to]);

  const style: CSSProperties | undefined = reduceMotion
    ? undefined
    : {
        opacity: progress,
        transform: `translate3d(0, ${(1 - progress) * 36}px, 0)`,
      };

  return (
    <div
      ref={ref}
      className={["will-change-[opacity,transform]", className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}
