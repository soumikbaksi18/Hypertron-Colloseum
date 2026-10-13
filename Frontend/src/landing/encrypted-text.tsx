import { useEffect, useRef, useState } from "react";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*<>?/\\";

export function EncryptedHoverText({
  text,
  revealDelayMs = 48,
  flipDelayMs = 32,
}: {
  text: string;
  revealDelayMs?: number;
  flipDelayMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);
  const [revealCount, setRevealCount] = useState(text.length);
  const [glyphs, setGlyphs] = useState<string[]>(() => text.split(""));

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const enter = () => setActive(true);
    const leave = () => setActive(false);
    parent.addEventListener("pointerenter", enter);
    parent.addEventListener("pointerleave", leave);
    parent.addEventListener("focus", enter);
    parent.addEventListener("blur", leave);
    return () => {
      parent.removeEventListener("pointerenter", enter);
      parent.removeEventListener("pointerleave", leave);
      parent.removeEventListener("focus", enter);
      parent.removeEventListener("blur", leave);
    };
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!active || reduce) {
      setRevealCount(text.length);
      setGlyphs(text.split(""));
      return;
    }

    let start = 0;
    let lastFlip = 0;
    let frame = 0;
    const next = text.split("");

    const tick = (now: number) => {
      if (!start) start = now;
      const revealed = Math.min(text.length, Math.floor((now - start) / revealDelayMs));
      if (now - lastFlip >= flipDelayMs) {
        for (let i = revealed; i < text.length; i += 1) {
          if (text[i] === " ") continue;
          next[i] = CHARSET[Math.floor(Math.random() * CHARSET.length)];
        }
        lastFlip = now;
        setGlyphs([...next]);
      }
      setRevealCount(revealed);
      if (revealed < text.length) frame = requestAnimationFrame(tick);
    };

    for (let i = 0; i < text.length; i += 1) {
      if (text[i] === " ") continue;
      next[i] = CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
    setGlyphs([...next]);
    setRevealCount(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, flipDelayMs, revealDelayMs, text]);

  return (
    <span ref={ref} className="inline-grid whitespace-nowrap">
      <span className="invisible col-start-1 row-start-1">{text}</span>
      <span aria-hidden className="col-start-1 row-start-1">
        {text.split("").map((char, index) => {
          const revealed = char === " " || index < revealCount;
          return (
            <span key={index} className={revealed ? "opacity-100" : "opacity-45"}>
              {revealed ? char : glyphs[index]}
            </span>
          );
        })}
      </span>
    </span>
  );
}
