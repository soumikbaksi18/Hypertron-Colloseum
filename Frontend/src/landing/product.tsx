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
    <section id="product" className="landing-hero-stage relative scroll-mt-20">
      <div className="mx-auto grid w-full gap-12 px-5 py-20 sm:px-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-stretch lg:gap-0 lg:px-16 lg:py-28">
        <div className="flex flex-col justify-between lg:border-r lg:border-dashed lg:border-[#cfdcf0] lg:pr-14">
          <ScrollFade>
            <p className="text-[12px] tracking-[0.2em] text-blue uppercase">
              {PRODUCT_EYEBROW}
            </p>
            <h2 className="landing-hero-title mt-4 text-[clamp(2.3rem,4vw,3.5rem)] leading-[1.02] tracking-[-0.035em] text-[#102340]">
              Private payments
              <br />
              need more than
              <br />
              a protocol.
            </h2>
            <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-[#506987]">
              {PRODUCT_COPY}
            </p>
          </ScrollFade>
          <a
            href="#protocol"
            className="mt-8 inline-flex items-center gap-2 text-[10px] tracking-[0.18em] text-[#102340] uppercase"
          >
            See how it works
            <ArrowRight className="size-3.5" />
          </a>
        </div>

        <div className="lg:border-l lg:border-dashed lg:border-[#cfdcf0] lg:pl-14">
          {PRODUCT_FEATURES.map((item, index) => {
            const Icon = FEATURE_ICONS[index];
            return (
              <ScrollFade key={item.title}>
                <article className="flex items-center justify-between gap-4 border-t border-dashed border-[#cfdcf0] py-7 lg:border-t-0 lg:border-b lg:px-2 lg:py-8 lg:first:pt-0">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-[0.14em] text-[#102340]">
                      <span className="size-1 rounded-full bg-[#102340]" />
                      0{index + 1}
                    </span>
                    <h3 className="landing-hero-title mt-3 text-[17px] font-medium tracking-tight text-[#102340]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-[#506987]">
                      {item.copy}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="flex size-11 shrink-0 items-center justify-center border border-[#e4d9c8] bg-[#f7fafe] text-blue"
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
