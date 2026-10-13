import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Accordion, AccordionItem } from "./accordion";
import { BOOK_DEMO, FAQS, MERCHANT_FAQS } from "./constants";
import { ScrollFade } from "./reveal";

function FaqExtras({
  item,
}: {
  item: (typeof FAQS)[number];
}) {
  return (
    <div className="max-w-2xl space-y-4">
      {item.answer.map((paragraph) => (
        <p
          key={paragraph}
          className="text-[14px] leading-relaxed text-[#506987] sm:text-[15px]"
        >
          {paragraph}
        </p>
      ))}

      {"roles" in item && item.roles ? (
        <ul className="grid gap-4 pt-1 sm:grid-cols-3">
          {item.roles.map((role) => (
            <li key={role.title} className="border border-[#cfdcf0] px-4 py-4">
              <p className="text-[11px] tracking-[0.14em] text-[#6d86ac] uppercase">
                {role.title}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#506987]">
                {role.copy}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {"path" in item && item.path ? (
        <p className="pt-1 text-[12px] tracking-[0.16em] text-[#102340] uppercase">
          {item.path.join(" → ")}
        </p>
      ) : null}

      {"stack" in item && item.stack ? (
        <div className="pt-2 text-[12px] leading-relaxed tracking-[0.04em] text-[#506987]">
          <p className="tracking-[0.16em] text-[#102340] uppercase">
            Application
          </p>
          <p className="mt-2 pl-4">Hypertron Platform</p>
          <p className="pl-4">Hypertron API</p>
          <p className="pl-4">Hypertron Protocol</p>
          <p className="mt-2 tracking-[0.16em] text-[#102340] uppercase">
            Privacy infrastructure
          </p>
          <p className="mt-2 tracking-[0.16em] text-[#102340] uppercase">
            Solana
          </p>
        </div>
      ) : null}

      {"link" in item && item.link ? (
        item.link.href.startsWith("/") ? (
          <Link
            to={item.link.href}
            className="inline-flex items-center gap-2 pt-1 text-[10px] tracking-[0.18em] text-[#102340] uppercase"
          >
            {item.link.label}
            <ArrowRight className="size-3.5" />
          </Link>
        ) : (
          <a
            href={item.link.href}
            className="inline-flex items-center gap-2 pt-1 text-[10px] tracking-[0.18em] text-[#102340] uppercase"
            {...("external" in item.link && item.link.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {item.link.label}
            <ArrowRight className="size-3.5" />
          </a>
        )
      ) : null}
    </div>
  );
}

export function LandingFaq() {
  return (
    <section id="faq" className="landing-faq relative">
      <div className="landing-pad relative mx-auto w-full py-20 sm:py-28">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(10rem,0.28fr)_minmax(0,1fr)] lg:gap-16 xl:gap-24">
          <ScrollFade>
            <h2 className="landing-hero-title text-[clamp(2.8rem,5vw,4.6rem)] leading-none tracking-[-0.04em] text-[#102340]">
              FAQ
            </h2>
          </ScrollFade>

          <div>
            <div className="mb-8 flex flex-wrap items-center justify-end gap-3 sm:mb-10 sm:gap-4">
              <p className="text-[11px] tracking-[0.18em] text-[#ffe500] uppercase">
                Got more questions?
              </p>
              <a
                href={BOOK_DEMO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-stretch"
              >
                <span className="inline-flex items-center bg-[#e6edf8] px-4 text-[11px] font-medium tracking-[0.16em] text-[#102340] uppercase">
                  Reach us
                </span>
                <span
                  aria-hidden
                  className="grid size-9 place-items-center bg-[#102340] text-white"
                >
                  <ArrowRight className="size-3.5" />
                </span>
              </a>
            </div>

            <Accordion>
              <div className="border-t border-[#cfdcf0]">
                {FAQS.map((item, index) => (
                  <ScrollFade
                    key={item.question}
                    lag={Math.min(index * 0.03, 0.18)}
                  >
                    <AccordionItem
                      question={item.question}
                      index={index + 1}
                      variant="faq"
                    >
                      <FaqExtras item={item} />
                    </AccordionItem>
                  </ScrollFade>
                ))}
              </div>

              <p className="mt-12 mb-4 text-[11px] tracking-[0.18em] text-[#ffe500] uppercase">
                For merchants
              </p>
              <div className="border-t border-[#cfdcf0]">
                {MERCHANT_FAQS.map((item, index) => (
                  <ScrollFade
                    key={item.question}
                    lag={Math.min((FAQS.length + index) * 0.03, 0.18)}
                  >
                    <AccordionItem
                      question={item.question}
                      index={FAQS.length + index + 1}
                      variant="faq"
                    >
                      <p className="max-w-2xl text-[14px] leading-relaxed text-[#506987] sm:text-[15px]">
                        {item.answer}
                      </p>
                    </AccordionItem>
                  </ScrollFade>
                ))}
              </div>
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
