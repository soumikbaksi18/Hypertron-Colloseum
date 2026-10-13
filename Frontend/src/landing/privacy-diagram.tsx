"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Shield, Store, UserRound } from "lucide-react";
import gsap from "gsap";
import { PRIVACY_ROLES } from "./constants";

const ROLE_ICONS = [UserRound, Store, Eye] as const;

export function PrivacyDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [activeRole, setActiveRole] = useState<number | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const context = gsap.context(() => {
      if (reduceMotion) return;

      gsap.fromTo(
        "[data-privacy-node]",
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: "power3.out",
        },
      );
      gsap.fromTo(
        "[data-privacy-line]",
        { strokeDashoffset: 120 },
        {
          strokeDashoffset: 0,
          duration: 1.25,
          stagger: 0.08,
          ease: "power2.out",
          delay: 0.25,
        },
      );
    }, root);

    const fieldX = fieldRef.current
      ? gsap.quickTo(fieldRef.current, "x", {
          duration: 0.8,
          ease: "power3.out",
        })
      : null;
    const fieldY = fieldRef.current
      ? gsap.quickTo(fieldRef.current, "y", {
          duration: 0.8,
          ease: "power3.out",
        })
      : null;
    const layerX = layerRef.current
      ? gsap.quickTo(layerRef.current, "x", {
          duration: 0.9,
          ease: "power3.out",
        })
      : null;

    function onPointerMove(event: PointerEvent) {
      if (reduceMotion) return;
      const rect = root!.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      fieldX?.(x * 10);
      fieldY?.(y * 7);
      layerX?.(x * -7);
      root!.style.setProperty("--privacy-x", `${(x + 0.5) * 100}%`);
      root!.style.setProperty("--privacy-y", `${(y + 0.5) * 100}%`);
    }

    root.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      root.removeEventListener("pointermove", onPointerMove);
      context.revert();
    };
  }, []);

  const activeCopy =
    activeRole === null
      ? "Shield, route, and disclose."
      : PRIVACY_ROLES[activeRole].copy;

  return (
    <div
      ref={ref}
      className="privacy-system relative mx-auto flex w-full max-w-[38rem] flex-col items-center"
      onPointerLeave={() => setActiveRole(null)}
    >
      <p
        data-privacy-node
        className="text-[10px] tracking-[0.24em] text-[#EEF4FF]/45 uppercase"
      >
        Public ledger
      </p>

      <div
        ref={fieldRef}
        data-privacy-node
        className="privacy-ledger-field relative mt-4 flex h-20 w-full items-center justify-center"
      >
        <div className="privacy-dot-field absolute inset-0" />
        <div className="relative z-10 flex size-12 items-center justify-center border border-dashed border-[#C3D0E8]/30 bg-[#03080b] text-[#EEF4FF]/60">
          <Shield className="size-5" strokeWidth={1.25} />
        </div>
      </div>

      <div className="privacy-spine h-10 w-px" />

      <div data-privacy-node className="w-full max-w-[30rem] text-center">
        <p className="mb-3 text-[10px] tracking-[0.22em] text-[#EEF4FF]/45 uppercase">
          Settlement
        </p>
        <div className="border border-dashed border-[#C3D0E8]/30 bg-white/[0.025] px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2.5">
            <img
              src="/media/solana.png"
              alt=""
              className="size-5 rounded-full object-cover"
            />
            <p className="landing-hero-title text-[18px] tracking-[-0.02em] text-[#EEF4FF]/80">
              Solana
            </p>
          </div>
        </div>
      </div>

      <div className="privacy-spine h-12 w-px" />

      <div
        ref={layerRef}
        data-privacy-node
        className="privacy-layer relative w-full max-w-[30rem] px-7 py-7 text-center"
      >
        <div aria-hidden className="privacy-particles privacy-particles-left" />
        <div aria-hidden className="privacy-particles privacy-particles-right" />
        <p className="text-[10px] tracking-[0.26em] text-[#c3d0e8] uppercase">
          Hypertron
        </p>
        <p className="landing-hero-title mt-2 text-[24px] tracking-[-0.035em] text-[#EEF4FF]">
          Privacy layer
        </p>
        <p
          key={activeRole ?? "default"}
          className="privacy-copy mt-2 min-h-10 text-[12px] leading-relaxed text-[#EEF4FF]/50"
        >
          {activeCopy}
        </p>
      </div>

      <svg
        aria-hidden
        className="mt-0 h-20 w-full max-w-[30rem] overflow-visible"
        viewBox="0 0 360 80"
        preserveAspectRatio="none"
      >
        <path
          data-privacy-line
          className="privacy-branch"
          d="M180 0V28H45V80M180 28V80M180 28H315V80"
        />
        {[45, 180, 315].map((x, index) => (
          <path
            key={x}
            className={`privacy-branch-active ${
              activeRole === index ? "privacy-branch-active--shown" : ""
            }`}
            d={`M180 0V28H${x}V80`}
          />
        ))}
      </svg>

      <div
        data-privacy-node
        className="grid w-full max-w-[36rem] grid-cols-3 gap-3 sm:gap-7"
      >
        {PRIVACY_ROLES.map((role, index) => {
          const Icon = ROLE_ICONS[index];
          const active = activeRole === index;

          return (
            <button
              key={role.title}
              type="button"
              aria-pressed={active}
              onPointerEnter={() => setActiveRole(index)}
              onFocus={() => setActiveRole(index)}
              onClick={() => setActiveRole(active ? null : index)}
              className={`group flex min-w-0 flex-col items-center text-center focus-visible:outline-none ${
                active ? "text-[#EEF4FF]" : "text-[#EEF4FF]/55"
              }`}
            >
              <span
                className={`flex size-12 items-center justify-center border border-dashed transition-all duration-300 sm:size-14 ${
                  active
                    ? "border-[#c3d0e8] bg-[#c3d0e8]/10 text-[#c3d0e8] shadow-[0_0_24px_rgba(158,197,255,0.18)]"
                    : "border-[#C3D0E8]/25 bg-white/[0.025] group-hover:border-[#C3D0E8]/50 group-hover:text-[#EEF4FF]"
                }`}
              >
                <Icon className="size-5" strokeWidth={1.25} />
              </span>
              <span className="mt-4 text-[9px] tracking-[0.2em] text-[#c3d0e8]/75">
                0{index + 1}
              </span>
              <span className="mt-2 text-[10px] tracking-[0.16em] uppercase sm:text-[11px]">
                {role.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
