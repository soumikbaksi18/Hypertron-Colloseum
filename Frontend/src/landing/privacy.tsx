import { PRIVACY_ROLES } from "./constants";
import { PrivacyDiagram } from "./privacy-diagram";
import { ScrollFade } from "./reveal";

export function LandingPrivacy() {
  return (
    <section id="privacy" className="relative">
      <div className="relative mx-auto w-full px-5 pt-20 pb-28 sm:px-10 sm:pt-28 sm:pb-36 lg:px-16">
        <div className="grid gap-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-24 lg:items-start">
          <ScrollFade>
            <p className="text-[11px] font-medium tracking-[0.2em] text-white/40 uppercase">
              Selective disclosure
            </p>
            <h2 className="landing-hero-title mt-4 text-[clamp(2rem,4vw,3.6rem)] leading-[0.96] tracking-[-0.035em] text-white">
              Private doesn&apos;t
              <br />
              mean invisible.
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/60">
              Payments still settle on a public ledger. Hypertron sits in
              between, so only the people who need a record can open one.
            </p>

            <div className="mt-16 grid gap-px sm:grid-cols-3">
              {PRIVACY_ROLES.map((role, index) => (
                <article
                  key={role.title}
                  className="flex flex-col border border-white/15 bg-white/[0.03] px-6 py-8 transition-colors hover:bg-white/[0.06]"
                >
                  <span className="text-[11px] tracking-[0.18em] text-[#9ec5ff] uppercase">
                    0{index + 1}
                  </span>
                  <h3 className="landing-hero-title mt-5 text-[20px] tracking-[-0.02em] text-white">
                    {role.title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-[1.65] text-white/55">
                    {role.copy}
                  </p>
                </article>
              ))}
            </div>
          </ScrollFade>

          <ScrollFade lag={0.1}>
            <PrivacyDiagram />
          </ScrollFade>
        </div>
      </div>
    </section>
  );
}
