import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { WAYS } from "./constants";
import { ScrollFade } from "./reveal";

const accentColors = ["#3b82f6", "#6366f1", "#0ea5e9"] as const;

export function LandingWays() {
  return (
    <section id="ways" className="relative">
      <div className="relative mx-auto w-full px-5 py-8 sm:px-10 sm:py-12 lg:px-16">
        <ScrollFade className="max-w-2xl pt-16">
          <p className="text-[11px] font-medium tracking-[0.2em] text-[#7b8696] uppercase">
            Three ways to build
          </p>
          <h2 className="landing-hero-title mt-4 text-[clamp(2rem,4vw,3.4rem)] leading-[0.96] tracking-[-0.035em] text-[#1c2433]">
            Use Hypertron your way.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[#5c6778]">
            Hypertron is a stack with different entry points. Start from the
            workspace, the privacy layer, or the API.
          </p>
        </ScrollFade>

        <div className="mt-16 grid gap-px bg-[#d5dce6] lg:grid-cols-3">
          {WAYS.map((way, index) => (
            <ScrollFade key={way.title} lag={index * 0.08}>
              <article
                className="group flex h-full flex-col bg-white px-7 py-10 transition-colors duration-300 hover:bg-[#f8fafc] sm:px-9 sm:py-12"
                style={{ "--way-accent": accentColors[index] } as CSSProperties}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className="text-[11px] font-semibold tracking-[0.18em] uppercase"
                    style={{ color: accentColors[index] }}
                  >
                    0{index + 1}
                  </span>
                  <span
                    aria-hidden
                    className="size-1 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: accentColors[index] }}
                  />
                </div>

                <p className="mt-6 text-[10px] tracking-[0.18em] text-[#8a93a3] uppercase">
                  {way.title}
                </p>
                <h3 className="landing-hero-title mt-3 text-[21px] leading-[1.18] tracking-[-0.03em] text-[#111827]">
                  {way.headline}
                </h3>
                <p className="mt-4 text-[14px] leading-[1.65] text-[#5c6778]">
                  {way.copy}
                </p>

                <ul className="mt-6 flex flex-wrap gap-1.5">
                  {way.tags.map((tag) => (
                    <li
                      key={tag}
                      className="bg-[#f1f5f9] px-2.5 py-1 text-[10px] tracking-[0.1em] text-[#64748b] uppercase"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex items-end justify-between gap-4 pt-10">
                  <p className="text-[11px] tracking-[0.14em] text-[#8a93a3] uppercase">
                    {way.audience}
                  </p>
                  {way.href.startsWith("/") ? (
                    <Link
                      to={way.href}
                      className="inline-flex shrink-0 items-center gap-1.5 text-[10px] tracking-[0.16em] text-[#111827] uppercase transition-opacity hover:opacity-60"
                    >
                      {way.cta}
                      <ArrowRight className="size-3" />
                    </Link>
                  ) : (
                    <a
                      href={way.href}
                      className="inline-flex shrink-0 items-center gap-1.5 text-[10px] tracking-[0.16em] text-[#111827] uppercase transition-opacity hover:opacity-60"
                    >
                      {way.cta}
                      <ArrowRight className="size-3" />
                    </a>
                  )}
                </div>
              </article>
            </ScrollFade>
          ))}
        </div>
      </div>
    </section>
  );
}
