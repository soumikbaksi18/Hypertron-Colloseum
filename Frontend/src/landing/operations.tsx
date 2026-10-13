import { OPERATIONS } from "./constants";

export function LandingOperations() {
  return (
    <section id="operations" className="relative bg-[#f7fafe] text-[#102340]">
      <div className="landing-pad relative mx-auto w-full pt-20 pb-20 sm:pt-28 sm:pb-28">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-24 xl:gap-28">
          <div>
            <div className="lg:sticky lg:top-32">
              <p className="text-[11px] font-medium tracking-[0.2em] text-[#ffe500] uppercase">
                Merchant operations
              </p>
              <h2 className="landing-hero-title mt-4 text-[clamp(2.2rem,4.5vw,3.6rem)] leading-[0.96] tracking-[-0.035em] text-[#102340]">
                Your payment is
                <br />
                only the beginning.
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#506987]">
                The workspace is built so a finance team can run the business.
                Links, treasury, claims, and disclosure live in one place.
              </p>
            </div>
          </div>

          <div className="grid gap-px bg-[#cfdcf0]">
            {OPERATIONS.map((item, index) => (
              <article
                key={item.title}
                data-sfx=""
                className="group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-5 bg-[#f7fafe] px-6 py-7 transition-colors duration-300 hover:bg-[#e6edf8] sm:gap-6 sm:px-8 sm:py-8"
              >
                <div className="flex size-11 shrink-0 items-center justify-center bg-[#e6edf8] text-[13px] font-medium text-[#3e639b] sm:size-12 sm:text-[14px]">
                  0{index + 1}
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 className="landing-hero-title text-[17px] leading-tight tracking-[-0.02em] text-[#102340] sm:text-[18px]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#506987] sm:text-[15px]">
                    {item.copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
