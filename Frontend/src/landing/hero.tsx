"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, Link2, SlidersHorizontal } from "lucide-react";
import { PhantomSignupDialog } from "../components/PhantomSignupDialog";
import { AsciiDither } from "./ascii-dither";
import { clamp01, easeInOutCubic, lerp, subscribeScroll } from "./scroll-sync";
import {
  BOOK_DEMO,
  PRODUCT_COPY,
  PRODUCT_EYEBROW,
  PRODUCT_FEATURES,
} from "./constants";

const HERO_VIDEO = "/media/hero-bg-mirrored.mp4";

export function LandingHero() {
  const pinRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frame, setFrame] = useState({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
    radius: 0,
    pinned: true,
    reveal: 0,
    mask: 0,
    features: [0, 0, 0] as [number, number, number],
  });
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    return subscribeScroll(() => {
      const pin = pinRef.current;
      if (!pin) return;

      const rect = pin.getBoundingClientRect();
      const travel = Math.max(1, pin.offsetHeight - window.innerHeight);
      const raw = clamp01(-rect.top / travel);
      const shrink = easeInOutCubic(clamp01(raw / 0.46));
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const compact = vw < 768;
      const targetW = compact ? Math.min(330, vw * 0.84) : Math.min(540, vw * 0.38);
      const targetH = compact ? Math.min(520, vh * 0.7) : Math.min(820, vh * 0.86);
      const width = lerp(vw, targetW, shrink);
      const height = lerp(vh, targetH, shrink);
      const featureProgress = clamp01((raw - 0.64) / 0.36);

      setFrame({
        width,
        height,
        left: (vw - width) / 2,
        top: (vh - height) / 2,
        radius: lerp(0, 6, shrink),
        pinned: raw < 1,
        mask: clamp01(raw / 0.28),
        reveal: clamp01((raw - 0.56) / 0.08),
        features: [0, 1, 2].map((index) =>
          clamp01((featureProgress - index / 3) / (1 / 3)),
        ) as [number, number, number],
      });
    });
  }, [reduceMotion]);

  return (
    <section id="home" className="relative">
      <div
        ref={pinRef}
        data-hero-pin
        className={reduceMotion ? "relative" : "relative h-[340vh]"}
      >
        <div
          className="landing-hero-stage flex h-[100svh] w-full items-stretch justify-center"
          style={
            reduceMotion
              ? undefined
              : frame.pinned
                ? { position: "fixed", inset: 0, zIndex: 20 }
                : { position: "absolute", bottom: 0, left: 0, right: 0 }
          }
        >
          <div
            id="product"
            className="landing-product-flank pointer-events-none absolute z-10 hidden px-5 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-x-12 sm:px-10 lg:px-16"
            style={{
              top: frame.height ? frame.top : "12vh",
              height: frame.height || "56vh",
              left: 0,
              right: 0,
              opacity: reduceMotion ? 0 : frame.reveal,
              visibility: !reduceMotion && frame.reveal > 0 ? "visible" : "hidden",
              transform: `translate3d(0, ${(1 - frame.reveal) * 16}px, 0)`,
            }}
          >
            <div className="flex h-full flex-col justify-between border-r border-dashed border-[#d4d9e2] pr-8">
              <div>
                <p className="text-[12px] tracking-[0.2em] text-blue uppercase">
                  {PRODUCT_EYEBROW}
                </p>
                <h2 className="landing-hero-title mt-4 text-[clamp(2.2rem,3.4vw,3.5rem)] leading-[1.02] tracking-[-0.035em] text-[#111827]">
                  Private payments
                  <br />
                  need more than
                  <br />
                  a protocol.
                </h2>
                <p className="mt-6 max-w-[16.5rem] text-[13px] leading-relaxed text-[#6b7280]">
                  {PRODUCT_COPY}
                </p>
              </div>
              <a
                href="#ways"
                className="pointer-events-auto inline-flex items-center gap-2 text-[10px] tracking-[0.18em] text-[#111827] uppercase"
              >
                Explore the platform
                <ArrowRight className="size-3.5" />
              </a>
            </div>

            <div
              aria-hidden
              style={{ width: frame.width ? frame.width : 520 }}
            />

            <div className="grid h-full grid-rows-3 border-l border-dashed border-[#d4d9e2] pl-10">
              {PRODUCT_FEATURES.map((item, index) => (
                <article
                  key={item.title}
                  className="flex items-center justify-between gap-4 border-b border-dashed border-[#d4d9e2] px-6 last:border-b-0"
                  style={{
                    opacity: frame.features[index] ?? 0,
                    transform: `translate3d(${(1 - (frame.features[index] ?? 0)) * 36}px, 0, 0)`,
                  }}
                >
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-[0.14em] text-[#111827]">
                      <span className="size-1 rounded-full bg-[#111827]" />
                      0{index + 1}
                    </span>
                    <h3 className="landing-hero-title mt-3 text-[17px] font-medium tracking-tight text-[#111827]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 max-w-[13.5rem] text-[12px] leading-relaxed text-[#6b7280]">
                      {item.copy}
                    </p>
                  </div>
                  {(() => {
                    const icons = [Link2, SlidersHorizontal, Eye] as const;
                    const Icon = icons[index];
                    return (
                      <span
                        aria-hidden
                        className="flex size-10 shrink-0 items-center justify-center border border-[#dce3ec] bg-[#f4f7fb] text-blue"
                      >
                        <Icon className="size-5" strokeWidth={1.5} />
                      </span>
                    );
                  })()}
                </article>
              ))}
            </div>
          </div>

          <div
            className={
              reduceMotion
                ? "landing-hero-frame relative h-[100svh] overflow-hidden"
                : "landing-hero-frame absolute z-20 overflow-hidden"
            }
            style={
              reduceMotion
                ? undefined
                : {
                    width: frame.width || "100%",
                    height: frame.height || "100%",
                    left: frame.width ? frame.left : 0,
                    top: frame.height ? frame.top : 0,
                    right: "auto",
                    bottom: "auto",
                    borderRadius: frame.radius,
                    willChange: frame.pinned ? "left, top, width, height" : undefined,
                  }
            }
          >
            <div
              aria-hidden
              className="landing-hero-mask pointer-events-none absolute inset-0 z-30"
              style={{ opacity: reduceMotion ? 0 : frame.mask }}
            />

            <AsciiDither
              videoRef={videoRef}
              opacity={reduceMotion ? 0 : frame.mask}
            />

            <div
              className="landing-hero-scene"
              style={
                reduceMotion
                  ? undefined
                  : {
                      width: "100vw",
                      height: "100svh",
                      left: frame.width ? -frame.left : 0,
                      top: frame.height ? -frame.top : 0,
                      right: "auto",
                      bottom: "auto",
                    }
              }
            >
            <video
              className="landing-hero-video-fill"
              src={HERO_VIDEO}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden
            />
            <video
              ref={videoRef}
              className="landing-hero-video"
              src={HERO_VIDEO}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden
            />

            <div className="landing-hero-veil pointer-events-none absolute inset-0" />

            <div className="relative z-10 flex h-full flex-col justify-between px-5 pt-28 pb-8 sm:px-10 sm:pt-32 sm:pb-10 lg:px-16 lg:pt-36">
              <div className="max-w-3xl">
                <h1 className="landing-hero-title hero-enter hero-enter-delay-1 bg-gradient-to-br from-white via-[#e8f1ff] to-[#9ec5ff] bg-clip-text text-[clamp(2.9rem,6vw,5rem)] leading-[0.94] tracking-[-0.04em] text-transparent text-balance">
                  Private payments,
                  <br />
                  built for business.
                </h1>
                <p className="hero-enter hero-enter-delay-2 mt-5 max-w-xl text-[16px] leading-snug text-white/75 sm:text-[18px]">
                  Hypertron is the private payment rail for businesses and
                  developers. Onboard, settle, and operate on one layer.
                </p>
                <div className="hero-enter hero-enter-delay-3 mt-8 flex w-fit flex-wrap items-center gap-2.5">
                  <PhantomSignupDialog
                    triggerLabel={
                      <>
                        Start building
                        <ArrowRight
                          className="size-3.5 shrink-0 translate-y-[1px]"
                          strokeWidth={2}
                        />
                      </>
                    }
                    triggerClassName="inline-flex h-10 items-center gap-2 rounded-none bg-white px-4 text-[11px] leading-none font-semibold tracking-[0.14em] text-black uppercase transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
                  />
                  <Link
                    to="/app/developers"
                    className="inline-flex h-10 items-center justify-center rounded-none border border-white/20 bg-white/5 px-4 text-[11px] font-semibold tracking-[0.14em] text-white uppercase backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
                  >
                    Explore docs
                  </Link>
                </div>
              </div>

              <div className="hero-enter hero-enter-delay-4 grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)_minmax(28rem,40rem)] sm:items-end">
                <p className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.2em] text-white/55 uppercase">
                  <img
                    src="/media/solana.png"
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 rounded-full object-cover"
                  />
                  Built on Solana
                </p>
                <span aria-hidden className="hidden sm:block" />
                <a
                  href={BOOK_DEMO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col justify-between bg-[#05070c]/50 px-6 py-4 backdrop-blur-md transition hover:bg-[#05070c]/60 sm:px-7 sm:py-4"
                >
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 size-1.5 bg-blue"
                  />
                  <p className="text-[10px] tracking-[0.18em] text-white uppercase">
                    Live on testnet
                  </p>
                  <div className="mt-2.5 max-w-none">
                    <p className="text-[16px] leading-snug text-white sm:text-[17px]">
                      Walk through onboarding to settlement on a live workspace.
                    </p>
                  </div>
                  <div className="mt-3.5 flex items-center justify-between gap-6">
                    <p className="text-[10px] tracking-[0.16em] text-white/50 uppercase">
                      Book a walkthrough
                    </p>
                    <span className="flex size-9 shrink-0 items-center justify-center bg-white/10 text-white transition group-hover:bg-white/20">
                      <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </a>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
