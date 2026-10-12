"use client";

import { useEffect, useRef, useState } from "react";
import { OPERATIONS } from "./constants";
import { ScrollFade } from "./reveal";
import { subscribeScroll } from "./scroll-sync";

export function LandingOperations() {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [ink, setInk] = useState<"light" | "dark">("light");

  useEffect(() => {
    return subscribeScroll(() => {
      const sticky = stickyRef.current;
      const span = document.querySelector(".landing-privacy-span");
      if (!(sticky instanceof HTMLElement) || !(span instanceof HTMLElement)) {
        return;
      }

      const spanRect = span.getBoundingClientRect();
      const stickyRect = sticky.getBoundingClientRect();
      const sampleY = stickyRect.top + stickyRect.height * 0.35;
      const progress =
        (sampleY - spanRect.top) / Math.max(1, spanRect.height);

      // Privacy-span gradient turns mid-blue around ~68% and pale by ~78%.
      setInk(progress >= 0.68 ? "dark" : "light");
    });
  }, []);

  const dark = ink === "dark";

  return (
    <section id="operations" ref={sectionRef} className="relative">
      <div className="relative mx-auto w-full px-5 pt-8 pb-20 sm:px-10 sm:pt-10 sm:pb-28 lg:px-16">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-24 xl:gap-28">
          <ScrollFade>
            <div ref={stickyRef} className="lg:sticky lg:top-32">
              <p
                className={`text-[11px] font-medium tracking-[0.2em] uppercase transition-colors duration-300 ${
                  dark ? "text-[#7b8696]" : "text-white/45"
                }`}
              >
                Merchant operations
              </p>
              <h2
                className={`landing-hero-title mt-4 text-[clamp(2.2rem,4.5vw,3.6rem)] leading-[0.96] tracking-[-0.035em] transition-colors duration-300 ${
                  dark ? "text-[#111827]" : "text-white"
                }`}
              >
                Your payment is
                <br />
                only the beginning.
              </h2>
              <p
                className={`mt-6 max-w-md text-[15px] leading-relaxed transition-colors duration-300 ${
                  dark ? "text-[#5c6778]" : "text-white/65"
                }`}
              >
                The workspace is built so a finance team can run the business.
                Links, treasury, claims, and disclosure live in one place.
              </p>
            </div>
          </ScrollFade>

          <div className="grid gap-1">
            {OPERATIONS.map((item, index) => {
              // Gradient lightens through this list — switch ink earlier than before.
              const tone =
                index >= 3 ? "dark" : index === 2 ? "mid" : "light";
              return (
                <ScrollFade key={item.title} lag={index * 0.035}>
                  <article
                    className={`group relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-5 rounded-lg px-6 py-7 transition-all duration-300 sm:gap-6 sm:px-8 sm:py-8 ${
                      tone === "light"
                        ? "bg-white/[0.03] hover:bg-white/[0.06]"
                        : tone === "mid"
                          ? "bg-white/[0.07] hover:bg-white/[0.1]"
                          : "bg-[#111827]/[0.04] hover:bg-[#111827]/[0.07]"
                    }`}
                  >
                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-md text-[13px] font-medium transition-all duration-300 sm:size-12 sm:text-[14px] ${
                        tone === "light"
                          ? "bg-white/10 text-white/90 group-hover:bg-white/[0.15]"
                          : tone === "mid"
                            ? "bg-white/[0.14] text-white/90 group-hover:bg-white/[0.2]"
                            : "bg-[#111827]/[0.08] text-[#1c2433] group-hover:bg-[#111827]/[0.12]"
                      }`}
                    >
                      0{index + 1}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <h3
                        className={`landing-hero-title text-[17px] leading-tight tracking-[-0.02em] transition-colors duration-300 sm:text-[18px] ${
                          tone === "light"
                            ? "text-white"
                            : tone === "mid"
                              ? "text-white/95"
                              : "text-[#1c2433]"
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p
                        className={`mt-2 text-[14px] leading-relaxed transition-colors duration-300 sm:text-[15px] ${
                          tone === "light"
                            ? "text-white/60 group-hover:text-white/70"
                            : tone === "mid"
                              ? "text-white/65 group-hover:text-white/75"
                              : "text-[#5c6778]"
                        }`}
                      >
                        {item.copy}
                      </p>
                    </div>
                  </article>
                </ScrollFade>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
