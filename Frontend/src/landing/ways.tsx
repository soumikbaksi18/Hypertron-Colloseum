import { motion, useReducedMotion } from "framer-motion";
import { CardParticles, cardParticleShape } from "./card-particles";
import { WAYS } from "./constants";

const ease = [0.22, 1, 0.36, 1] as const;

export function LandingWays() {
  const reduce = useReducedMotion();

  return (
    <motion.section
      id="ways"
      className="landing-ways-sheet flex min-h-dvh flex-col"
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.28 }}
    >
      <div className="landing-ways-cornice" aria-hidden>
        <svg>
          <defs>
            <pattern id="ways-arcade" width="56" height="42" patternUnits="userSpaceOnUse">
              <path d="M0 42V18A28 16 0 0 1 56 18" />
            </pattern>
          </defs>
          <rect width="100%" height="42" fill="url(#ways-arcade)" />
        </svg>
      </div>
      <div className="landing-pad relative mx-auto flex w-full flex-1 flex-col pt-8 pb-20 sm:pt-12 sm:pb-28">
        <motion.div
          className="max-w-2xl pt-28 sm:pt-36"
          variants={{
            hidden: { opacity: 0, y: 28 },
            show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
          }}
        >
          <p className="text-[11px] font-medium tracking-[0.2em] text-[#ffe500] uppercase">
            Three ways to build
          </p>
          <h2 className="landing-hero-title mt-4 text-[clamp(2rem,4vw,3.4rem)] leading-[0.96] tracking-[-0.035em] text-[#EEF4FF]">
            Use Hypertron your way.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[#EEF4FF]/70">
            Hypertron is a stack with different entry points. Start from the
            workspace, the privacy layer, or the API.
          </p>
        </motion.div>

        <div className="mt-auto pt-16">
          <div className="flex flex-col lg:flex-row">
            {WAYS.map((way, index) => (
              <motion.article
                key={way.title}
                className={`relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.35rem] border border-[#C3D0E8]/45 px-7 py-12 sm:px-9 lg:px-10 lg:py-16${
                  index > 0 ? " -mt-px lg:mt-0 lg:-ml-px" : ""
                }`}
                variants={{
                  hidden: { opacity: 0, y: 40 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.75, ease, delay: 0.16 + index * 0.1 },
                  },
                }}
              >
                <h3 className="landing-hero-title max-w-[11ch] text-[clamp(1.7rem,2.2vw,2.35rem)] leading-[1.05] tracking-[-0.03em] text-[#EEF4FF]">
                  {way.headline}
                </h3>
                <CardParticles shape={cardParticleShape(index)} />
                <div className="mt-auto pt-16">
                  <p className="inline-flex items-center gap-2 rounded-full border border-[#C3D0E8]/45 bg-transparent px-3 py-1 text-[11px] tracking-[0.14em] text-[#C3D0E8] uppercase">
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[#C3D0E8]" />
                    {way.title}
                  </p>
                  <p className="mt-3 max-w-sm text-[14px] leading-[1.65] text-[#C3D0E8]/55">
                    {way.copy}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
