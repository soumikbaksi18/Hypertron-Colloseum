import { useEffect, type RefObject } from "react";

import { playLandingSound } from "./sound";

const INTERACTIVE = "a, button, [data-sfx]";

export function useLandingSound(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function targetOf(event: Event) {
      const node = event.target;
      if (!(node instanceof Element)) return null;
      const el = node.closest(INTERACTIVE);
      if (!el || !root!.contains(el)) return null;
      return el;
    }

    function onOver(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      const el = targetOf(event);
      if (!el) return;
      if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return;
      playLandingSound("hover");
    }

    function onDown(event: PointerEvent) {
      const el = targetOf(event);
      if (!el) return;
      const expanded = el.getAttribute("aria-expanded");
      if (expanded === "false") playLandingSound("open");
      else if (expanded === "true") playLandingSound("close");
      else playLandingSound("press");
    }

    root.addEventListener("pointerover", onOver);
    root.addEventListener("pointerdown", onDown);
    return () => {
      root.removeEventListener("pointerover", onOver);
      root.removeEventListener("pointerdown", onDown);
    };
  }, [rootRef]);
}
