import { JOURNEY } from "./constants";
import { JourneyBg } from "./journey-bg";
import { ScrollFade } from "./reveal";

export function LandingProcess() {
  return (
    <section id="protocol" className="landing-journey relative">
      <JourneyBg />
      <div className="relative z-10 mx-auto w-full px-5 pt-8 pb-32 sm:px-10 sm:pt-10 sm:pb-40 lg:px-16">
        <ScrollFade>
          <div className="max-w-2xl pb-20">
            <p className="text-[11px] font-medium tracking-[0.2em] text-white/55 uppercase">
              How it works
            </p>
            <h2 className="landing-hero-title mt-4 text-[clamp(2.2rem,4.4vw,3.8rem)] leading-[0.96] tracking-[-0.035em] text-white">
              From payment request
              <br />
              to settlement.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
              The merchant journey, without the cryptography. Follow a payment
              through the rail.
            </p>
          </div>
        </ScrollFade>

        <ol className="max-w-3xl lg:max-w-[52rem] xl:max-w-[58rem]">
          {JOURNEY.map((step, index) => (
            <ScrollFade key={step.label} lag={index * 0.05}>
              <li
                data-journey-last={
                  index === JOURNEY.length - 1 ? "" : undefined
                }
                className="group grid gap-x-24 gap-y-2 border-t border-dashed border-white/15 py-14 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-baseline sm:gap-x-36 sm:py-20 lg:gap-x-44"
              >
                <div className="flex items-baseline gap-3 sm:flex-col sm:gap-2">
                  <span className="tabular-nums text-[11px] tracking-[0.22em] text-white/45 uppercase">
                    0{index + 1}
                  </span>
                  <h3 className="landing-hero-title text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[1.02] tracking-[-0.035em] text-white">
                    {step.label}
                  </h3>
                </div>
                <p className="max-w-lg text-[16px] leading-[1.7] text-white/70 sm:pt-1 sm:text-[17px]">
                  {step.copy}
                </p>
              </li>
            </ScrollFade>
          ))}
        </ol>
      </div>
    </section>
  );
}
