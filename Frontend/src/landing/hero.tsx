import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, Play } from "lucide-react";
import { AsciiGlobe } from "./ascii-globe";

const RAIL = ["Solana", "Stablecoins", "Privacy", "For business"] as const;

export function LandingHero() {
  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#05060c] text-white"
    >
      <AsciiGlobe />
      <div className="landing-hero-scrim pointer-events-none absolute inset-0" />

      <aside className="pointer-events-none absolute top-1/2 right-6 z-10 hidden -translate-y-1/2 lg:flex lg:items-stretch lg:gap-4 xl:right-10">
        <span className="w-px self-stretch bg-white/30" />
        <div className="flex flex-col gap-1 text-[10px] font-medium tracking-[0.22em] text-white/55 uppercase">
          {RAIL.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </aside>

      <div className="relative z-10 flex min-h-[100svh] flex-col px-5 pt-24 pb-7 sm:px-10 lg:px-14 xl:px-16">
        <div className="max-w-[44rem] pt-[clamp(2.2rem,8vh,6rem)]">
          <p className="hero-enter text-[11px] font-medium tracking-[0.22em] text-[#b7a6ff] uppercase">
            Private payments on Solana
          </p>
          <h1 className="landing-hero-title hero-enter hero-enter-delay-1 mt-5 text-[clamp(2.7rem,5vw,5.05rem)] leading-[0.96] font-medium tracking-[-0.04em]">
            Private payments,
            <br />
            built for <span className="landing-hero-gradient">business.</span>
          </h1>
          <p className="hero-enter hero-enter-delay-2 mt-6 max-w-[26rem] text-[15px] leading-[1.55] text-white/60 sm:text-[16px]">
            Onboard, settle, and operate on Solana{" "}
            <span className="sm:block">without exposing your business on-chain.</span>
          </p>
          <div className="hero-enter hero-enter-delay-3 mt-8 flex flex-wrap items-center gap-2.5">
            <Link
              to="/app/developers"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-medium text-[#101218] transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7c9ff]"
            >
              Explore docs
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              to="/app"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 text-[13.5px] font-medium text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7c9ff]"
            >
              <span className="landing-live-dot size-1.5 rounded-full bg-[#3ee08a]" />
              Live on testnet
              <ArrowRight className="size-3.5 text-white/70" />
            </Link>
          </div>
          <Link
            to="/slides"
            className="hero-enter hero-enter-delay-4 mt-7 inline-flex items-center gap-3 text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7c9ff]"
          >
            <span className="flex size-8 items-center justify-center rounded-full border border-white/25">
              <Play className="ml-0.5 size-3 fill-current" />
            </span>
            <span className="text-[14px] font-medium">Watch demo</span>
            <span className="text-[13px] text-white/40">2 min</span>
          </Link>
        </div>

        <div className="mt-auto flex items-end justify-between gap-6 pt-16">
          <a
            href="#product"
            className="inline-flex items-center gap-3 text-[10px] font-medium tracking-[0.2em] text-white/45 uppercase transition hover:text-white/75"
          >
            <span className="flex flex-col items-center text-white/40">
              <span className="mb-1.5 h-10 w-px bg-white/25" />
              <ArrowDown className="size-3.5" strokeWidth={1.5} />
            </span>
            <span className="leading-[1.35]">
              Scroll
              <br />
              to explore
            </span>
          </a>
          <p className="hidden text-[10px] font-medium tracking-[0.22em] text-white/40 uppercase sm:block">
            Pay · Settle · Operate · Onchain
          </p>
        </div>
      </div>
    </section>
  );
}
