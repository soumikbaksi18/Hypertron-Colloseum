import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { PhantomSignupDialog } from "../components/PhantomSignupDialog";
import { EncryptedHoverText } from "./encrypted-text";
import { ScrollFade } from "./reveal";

export function LandingCta() {
  return (
    <section id="start" className="landing-paper relative overflow-hidden">
      <div className="landing-pad relative mx-auto w-full py-8">
        <ScrollFade>
          <div className="border-t border-[#cfdcf0] py-24 sm:py-32">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
              <div>
                <p className="text-[11px] font-medium tracking-[0.2em] text-[#ffe500] uppercase">
                  Get started
                </p>
                <h2 className="landing-hero-title mt-4 max-w-2xl text-[clamp(2.4rem,5vw,4.2rem)] leading-[0.94] tracking-[-0.04em] text-[#102340]">
                  Build private payments
                  <br />
                  into your product.
                </h2>
                <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#506987]">
                  Start with the platform, integrate the infrastructure, or
                  connect through the API. One rail on Solana.
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end lg:pb-2">
                <PhantomSignupDialog
                  triggerLabel={<EncryptedHoverText text="Launch app" />}
                  triggerClassName="inline-flex h-12 items-center rounded-none bg-[#02050c] px-7 text-[11px] font-semibold tracking-[0.16em] text-white uppercase hover:bg-black"
                />
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/app/developers"
                    className="inline-flex h-11 items-center gap-2 border border-[#c6d6ec] px-5 text-[11px] font-medium tracking-[0.15em] text-[#102340] uppercase transition hover:border-[#102340] hover:text-[#02050c]"
                  >
                    Read API docs
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <a
                    href="#ecosystem"
                    className="inline-flex h-11 items-center gap-2 border border-[#c6d6ec] px-5 text-[11px] font-medium tracking-[0.15em] text-[#102340] uppercase transition hover:border-[#102340] hover:text-[#02050c]"
                  >
                    Explore protocol
                    <ArrowRight className="size-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </ScrollFade>
      </div>
    </section>
  );
}
