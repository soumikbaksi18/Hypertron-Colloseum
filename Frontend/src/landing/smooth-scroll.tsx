"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { notifyScroll } from "./scroll-sync";

export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      allowNestedScroll: true,
      respectReducedMotion: true,
    });

    lenis.on("scroll", notifyScroll);

    return () => {
      lenis.off("scroll", notifyScroll);
      lenis.destroy();
    };
  }, []);

  return null;
}
