"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Boxes,
  Braces,
  Cuboid,
  LayoutDashboard,
  Network,
  Orbit,
} from "lucide-react";

const surfaces = [
  {
    title: "Platform",
    copy: "For businesses that want the full stack.",
    features: ["Payment links", "Checkout", "Treasury", "Settlement", "Disclosure"],
    icon: LayoutDashboard,
  },
  {
    title: "API",
    copy: "For products that already have a payment experience.",
    features: ["Your app", "Hypertron API", "Private checkout", "Webhooks"],
    icon: Braces,
  },
  {
    title: "Protocol",
    copy: "For developers who want the privacy primitive itself.",
    features: ["Direct integration", "Client libraries", "Privacy pools"],
    icon: Cuboid,
  },
] as const;

const rails = [
  {
    title: "SPP",
    copy: "Legacy privacy infrastructure",
    icon: Orbit,
  },
  {
    title: "Hypertron pools",
    copy: "Shared liquidity for private settlement",
    icon: Boxes,
  },
  {
    title: "Future systems",
    copy: "Next-generation privacy infrastructure",
    icon: Network,
  },
] as const;

export function EcosystemDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeSurface, setActiveSurface] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fadeUp = (delay: number): CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.55s ease ${delay}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  });

  const interfaceCopy =
    activeSurface === null
      ? "A unified interface for shielding, routing, settlement, and selective disclosure."
      : `${surfaces[activeSurface].title} connects through the same shielding, settlement, and disclosure interface.`;

  return (
    <div
      ref={ref}
      className="eco-architecture flex min-w-0 flex-col items-stretch"
      onPointerLeave={() => setActiveSurface(null)}
    >
      <div style={fadeUp(0)} className="text-center">
        <p className="text-[10px] tracking-[0.22em] text-[#8a93a3] uppercase">
          Applications
        </p>
      </div>

      <svg
        aria-hidden
        className="h-10 w-full overflow-visible"
        viewBox="0 0 720 40"
        preserveAspectRatio="none"
      >
        <path
          className="eco-architecture-line"
          d="M360 0V15H120V40M360 15V40M360 15H600V40"
        />
        {[120, 360, 600].map((x, index) => (
          <path
            key={x}
            className={`eco-architecture-line-active ${
              activeSurface === index ? "eco-architecture-line-active--shown" : ""
            }`}
            d={`M360 0V15H${x}V40`}
          />
        ))}
      </svg>

      <div
        style={fadeUp(60)}
        className="grid gap-px bg-[#b8cce4] sm:grid-cols-3"
      >
        {surfaces.map((surface, index) => {
          const Icon = surface.icon;
          const active = activeSurface === index;

          return (
          <button
            key={surface.title}
            type="button"
            aria-pressed={active}
            onPointerEnter={() => setActiveSurface(index)}
            onFocus={() => setActiveSurface(index)}
            onClick={() => setActiveSurface(active ? null : index)}
            className={`group flex min-w-0 flex-col text-left transition-colors focus-visible:outline-none ${
              active ? "bg-[#dce9f8]" : "bg-[#eef4fb] hover:bg-[#e4eef9]"
            }`}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(8px)",
              transition: `opacity 0.5s ease ${80 + index * 60}ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${80 + index * 60}ms, background-color 0.25s ease`,
            }}
          >
            <div className="flex min-h-44 flex-1 gap-4 px-5 py-5">
              <span className="flex size-12 shrink-0 items-center justify-center border border-[#b8cce4] bg-[#e0ebf7] text-[#5b7aa3] transition-colors group-hover:border-blue/40 group-hover:text-blue">
                <Icon className="size-5" strokeWidth={1.25} />
              </span>
              <span className="min-w-0">
                <span className="text-[9px] tracking-[0.18em] text-blue/60">
                  0{index + 1}
                </span>
                <span className="landing-hero-title mt-2 block text-[17px] tracking-[-0.02em] text-[#1c2433]">
                  {surface.title}
                </span>
                <span className="mt-2 block text-[12px] leading-relaxed text-[#6d7889]">
                  {surface.copy}
                </span>
              </span>
            </div>

            <span className="grid w-full grid-cols-2 gap-px border-t border-[#b8cce4] bg-[#b8cce4]">
              {surface.features.map((feature) => (
                <span
                  key={feature}
                  className="truncate bg-[#e4eef9] px-2 py-2 text-center text-[8px] tracking-[0.04em] text-[#5b7aa3]"
                >
                  {feature}
                </span>
              ))}
            </span>
          </button>
          );
        })}
      </div>

      <svg
        aria-hidden
        className="h-9 w-full overflow-visible"
        viewBox="0 0 720 36"
        preserveAspectRatio="none"
      >
        <path
          className="eco-architecture-line"
          d="M120 0V15H360V36M360 0V36M600 0V15H360"
        />
        {[120, 360, 600].map((x, index) => (
          <path
            key={x}
            className={`eco-architecture-line-active ${
              activeSurface === index ? "eco-architecture-line-active--shown" : ""
            }`}
            d={`M${x} 0V15H360V36`}
          />
        ))}
      </svg>

      <div style={fadeUp(340)} className="eco-interface relative px-7 py-7 sm:px-10">
        <div aria-hidden className="eco-interface-pixels eco-interface-pixels-left" />
        <div aria-hidden className="eco-interface-pixels eco-interface-pixels-right" />
        <div className="relative grid items-center gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
          <div className="hidden size-16 items-center justify-center border border-white/10 text-white/45 sm:flex">
            <Boxes className="size-7" strokeWidth={1} />
          </div>
          <div>
            <p className="text-[9px] tracking-[0.24em] text-[#9ec5ff] uppercase">
              Hypertron
            </p>
            <p className="landing-hero-title mt-2 text-[22px] tracking-[-0.03em] text-white">
              Privacy interface
            </p>
            <p
              key={activeSurface ?? "default"}
              className="eco-interface-copy mt-2 max-w-md text-[12px] leading-relaxed text-white/55"
            >
              {interfaceCopy}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto h-8 w-px bg-[repeating-linear-gradient(180deg,#8db8f4_0_2px,transparent_2px_6px)] opacity-60" />

      <div
        style={fadeUp(500)}
        className="grid gap-px border border-[#b8cce4] bg-[#b8cce4] sm:grid-cols-3"
      >
        {rails.map((rail) => {
          const Icon = rail.icon;
          return (
            <div
              key={rail.title}
              className="flex min-w-0 items-center gap-3 bg-[#eef4fb] px-4 py-4"
            >
              <Icon className="size-6 shrink-0 text-blue/55" strokeWidth={1.15} />
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-[0.05em] text-[#334155] uppercase">
                  {rail.title}
                </p>
                <p className="mt-1 text-[9px] leading-snug text-[#5b7aa3]">
                  {rail.copy}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto h-8 w-px bg-[repeating-linear-gradient(180deg,#8db8f4_0_2px,transparent_2px_6px)] opacity-60" />

      <div style={fadeUp(640)}>
        <div className="flex items-center justify-center gap-3 border border-[#b8cce4] bg-[#e4eef9] px-5 py-4">
          <img
            src="/media/solana.png"
            alt=""
            className="size-5 rounded-full object-cover"
          />
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[#1c2433] uppercase">
              Solana
            </p>
            <p className="mt-0.5 text-[9px] text-[#5b7aa3]">Settlement layer</p>
          </div>
        </div>
      </div>
    </div>
  );
}
