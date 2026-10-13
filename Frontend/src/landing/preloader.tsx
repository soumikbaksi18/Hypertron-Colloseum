import { useEffect, useState } from "react";

const WORD = "Hypertron Private Payments";
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&*";
const MIN_MS = 2100;
const IMAGE_CAP_MS = 3200;

const FIELD = [
  ["7%", "9%"],
  ["14%", "78%"],
  ["22%", "31%"],
  ["31%", "88%"],
  ["46%", "6%"],
  ["58%", "92%"],
  ["71%", "18%"],
  ["79%", "64%"],
  ["88%", "11%"],
  ["18%", "54%"],
] as const;

function glyph() {
  return CHARSET[Math.floor(Math.random() * CHARSET.length)];
}

function scramble(text: string, revealed: number) {
  return text
    .split("")
    .map((char, index) => {
      if (char === "." || char === " " || index < revealed) return char;
      return glyph();
    })
    .join("");
}

export function LandingPreloader() {
  const [live, setLive] = useState(true);
  if (live && typeof document !== "undefined") {
    document.documentElement.dataset.preloading = "true";
  }
  const [leaving, setLeaving] = useState(false);
  const [shown, setShown] = useState(() => scramble(WORD, 0));
  const [count, setCount] = useState(0);
  const [field, setField] = useState(() => FIELD.map(() => glyph()));

  useEffect(() => {
    if (!live) return;
    const root = document.documentElement;
    root.dataset.preloading = "true";
    const block = (event: Event) => {
      event.preventDefault();
    };
    window.addEventListener("wheel", block, { passive: false, capture: true });
    window.addEventListener("touchmove", block, { passive: false, capture: true });
    return () => {
      delete root.dataset.preloading;
      window.removeEventListener("wheel", block, true);
      window.removeEventListener("touchmove", block, true);
    };
  }, [live]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let exitTimer = 0;
    let openTimer = 0;
    let goneTimer = 0;
    const revealHero = () => {
      window.dispatchEvent(new Event("hypertron:open"));
    };
    const started = performance.now();

    const image = new Image();
    let imageReady = false;
    image.onload = () => {
      imageReady = true;
    };
    image.onerror = () => {
      imageReady = true;
    };
    image.src = "/media/image2.png";
    if (image.complete) imageReady = true;

    if (reduce) {
      setShown(WORD);
      setCount(100);
      exitTimer = window.setTimeout(() => {
        revealHero();
        setLeaving(true);
      }, 280);
      goneTimer = window.setTimeout(() => setLive(false), 620);
    } else {
      let lastFlip = 0;
      const tick = (now: number) => {
        const elapsed = now - started;
        const ratio = Math.min(1, elapsed / MIN_MS);
        const eased = 1 - (1 - ratio) ** 3;
        const revealed = Math.floor(eased * WORD.length);
        setCount(Math.round(eased * 100));
        if (now - lastFlip >= 48) {
          setShown(scramble(WORD, revealed));
          setField(FIELD.map(() => glyph()));
          lastFlip = now;
        }

        const ready = imageReady || elapsed >= IMAGE_CAP_MS;
        if (ratio >= 1 && ready) {
          setShown(WORD);
          setCount(100);
          exitTimer = window.setTimeout(() => setLeaving(true), 220);
          openTimer = window.setTimeout(revealHero, 220 + 560);
          goneTimer = window.setTimeout(() => setLive(false), 1180);
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(exitTimer);
      window.clearTimeout(openTimer);
      window.clearTimeout(goneTimer);
    };
  }, []);

  if (!live) return null;

  return (
    <div
      className={`landing-preloader${leaving ? " is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Hypertron Private Payments"
    >
      <div className="landing-preloader-field" aria-hidden>
        {field.map((char, index) => (
          <span
            key={FIELD[index].join("-")}
            style={{ top: FIELD[index][0], left: FIELD[index][1] }}
          >
            {char}
          </span>
        ))}
      </div>

      <div className="landing-preloader-meta">
        <span>{String(count).padStart(3, "0")}</span>
      </div>

      <p className="landing-preloader-word" aria-hidden>
        {WORD.split("").map((char, index) => {
          const visible = char === " " ? "\u00A0" : shown[index];
          return (
            <span className="landing-preloader-char" key={`${char}-${index}`}>
              <span className="landing-preloader-char-sizer">
                {char === " " ? "\u00A0" : char}
              </span>
              <span className="landing-preloader-char-glyph">{visible}</span>
            </span>
          );
        })}
      </p>

      <div className="landing-preloader-track" aria-hidden>
        <span style={{ transform: `scaleX(${count / 100})` }} />
      </div>
    </div>
  );
}
