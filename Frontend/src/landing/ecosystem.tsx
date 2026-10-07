import { ArrowRight } from "lucide-react";
import { EcosystemDiagram } from "./ecosystem-diagram";
import { ScrollFade } from "./reveal";

export function LandingEcosystem() {
  return (
    <section id="ecosystem" className="landing-paper relative">
      <div className="relative mx-auto w-full px-5 py-8 sm:px-10 sm:py-12 lg:px-16">
        <div className="grid gap-16 border-t border-[#d5dce6] pt-20 lg:grid-cols-[minmax(16rem,0.34fr)_minmax(0,1fr)] lg:items-start lg:gap-16 xl:gap-24">
          <ScrollFade>
            <div className="lg:sticky lg:top-28">
              <p className="text-[11px] font-medium tracking-[0.2em] text-[#7b8696] uppercase">
                Ecosystem
              </p>
              <h2 className="landing-hero-title mt-4 text-[clamp(1.85rem,3.4vw,2.85rem)] leading-[0.98] tracking-[-0.035em] text-[#1c2433]">
                Privacy infrastructure
                <br />
                should be
                <br />
                composable.
              </h2>
              <p className="mt-5 max-w-[15rem] text-[13px] leading-relaxed text-[#5c6778]">
                One interface for businesses and developers — platform, API, or
                protocol.
              </p>
              <a
                href="#ways"
                className="mt-8 inline-flex items-center gap-2 text-[10px] font-medium tracking-[0.17em] text-blue uppercase transition-opacity hover:opacity-60"
              >
                Explore the ecosystem
                <ArrowRight className="size-3.5" />
              </a>
            </div>
          </ScrollFade>

          <ScrollFade lag={0.1}>
            <EcosystemDiagram />
          </ScrollFade>
        </div>
      </div>
    </section>
  );
}
