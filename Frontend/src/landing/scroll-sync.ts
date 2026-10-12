type Listener = () => void;

const listeners = new Set<Listener>();
let attached = false;
let ticking = false;

function flush() {
  ticking = false;
  listeners.forEach((listener) => listener());
}

function onWindowChange() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(flush);
}

function attach() {
  if (attached || typeof window === "undefined") return;
  attached = true;
  window.addEventListener("scroll", onWindowChange, { passive: true });
  window.addEventListener("resize", onWindowChange);
}

export function subscribeScroll(listener: Listener) {
  attach();
  listeners.add(listener);
  listener();
  return () => {
    listeners.delete(listener);
  };
}

export function notifyScroll() {
  onWindowChange();
}

export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}
