import { ArrowRight, Eye, Link2, SlidersHorizontal } from "lucide-react";
import {
  PRODUCT_COPY,
  PRODUCT_EYEBROW,
  PRODUCT_FEATURES,
} from "./constants";
import { ScrollFade } from "./reveal";

const FEATURE_ICONS = [Link2, SlidersHorizontal, Eye] as const;

export function LandingProduct() {
  return (
    <section className="landing-hero-stage relative lg:hidden">
      <div className="relative mx-auto w-full px-5 py-20 sm:px-10 lg:px-16">
        <ScrollFade>
          <p className="text-[12px] tracking-[0.2em] text-blue uppercase">
            {PRODUCT_EYEBROW}
          </p>
          <h2 className="landing-hero-title mt-4 text-[clamp(2.3rem,8vw,3.4rem)] leading-[1.02] tracking-[-0.035em] text-[#111827]">
            Private payments
            <br />
            need more than
            <br />
            a protocol.
          </h2>
          <p className="mt-6 max-w-sm text-[13px] leading-relaxed text-[#6b7280]">
            {PRODUCT_COPY}
          </p>
          <a
            href="#ways"
            className="mt-8 inline-flex items-center gap-2 text-[10px] tracking-[0.18em] text-[#111827] uppercase"
          >
            Explore the platform
            <ArrowRight className="size-3.5" />
          </a>
        </ScrollFade>

        <div className="mt-12 grid">
          {PRODUCT_FEATURES.map((item, index) => {
            const Icon = FEATURE_ICONS[index];
            return (
              <ScrollFade key={item.title}>
                <article className="flex items-center justify-between gap-4 border-t border-dashed border-[#d4d9e2] py-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-[0.14em] text-[#111827]">
                      <span className="size-1 rounded-full bg-[#111827]" />
                      0{index + 1}
                    </span>
                    <h3 className="landing-hero-title mt-3 text-[17px] font-medium tracking-tight text-[#111827]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-[#6b7280]">
                      {item.copy}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="flex size-11 shrink-0 items-center justify-center border border-[#dce3ec] bg-[#f4f7fb] text-blue"
                  >
                    <Icon className="size-5" strokeWidth={1.5} />
                  </span>
                </article>
              </ScrollFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}
