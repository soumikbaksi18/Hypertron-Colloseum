"use client";

import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { BOOK_DEMO } from "./constants";

const NAV_PRIMARY = [
  { href: "#home", label: "Home" },
  { href: "#product", label: "Capabilities" },
  { href: "#ways", label: "Platform" },
  { href: "#protocol", label: "How it works" },
];

const NAV_SECONDARY = [
  { href: "#operations", label: "Operations" },
  { href: "#privacy", label: "Privacy" },
  { href: "/app/developers", label: "Docs" },
  { href: "#ecosystem", label: "Ecosystem" },
  { href: "#faq", label: "FAQ" },
];

const SOCIAL = [
  { href: "https://x.com/hypertronhq", label: "Twitter" },
  { href: "https://github.com/Hypertron-HQ", label: "GitHub" },
  { href: BOOK_DEMO, label: "Book a demo" },
];

export function LandingFooter() {
  return (
    <footer id="about" className="landing-footer relative overflow-hidden">
      <div className="relative mx-auto w-full px-5 sm:px-10 lg:px-16">
        {/* light-to-dark fade band above the content */}
        <div className="h-40 sm:h-52" />

        <div className="relative border-t border-white/10">
          {/* column grid lines */}
          <div
            aria-hidden
            className="absolute inset-0 grid grid-cols-1 lg:grid-cols-3"
          >
            <div />
            <div className="hidden border-x border-white/10 lg:block" />
            <div />
          </div>

          {/* main row */}
          <div className="relative grid gap-12 py-14 lg:grid-cols-3 lg:gap-0">
            <div className="lg:pr-10">
              <span
                aria-hidden
                className="mb-6 block size-1.5 bg-white/70"
              />
              <p className="font-display text-[20px] leading-snug font-medium tracking-tight text-white">
                Private payments,
                <br />
                production ready.
              </p>
              <p className="mt-5 max-w-[15rem] text-[13px] leading-relaxed text-white/50">
                One stack on Solana for merchants, application developers, and
                protocol teams.
              </p>
              <p className="mt-8 inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-white/45 uppercase">
                <img
                  src="/media/solana.png"
                  alt=""
                  width={16}
                  height={16}
                  className="size-4 rounded-full object-cover"
                />
                Built on Solana
              </p>
            </div>

            <div className="lg:pl-10">
              <p className="text-[10px] tracking-[0.2em] text-white/45 uppercase">
                Navigation
              </p>
              <div className="mt-5 flex gap-12">
                <div className="flex flex-col gap-2.5">
                  {NAV_PRIMARY.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-[14px] text-white/70 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <div className="flex flex-col gap-2.5">
                  {NAV_SECONDARY.map((link) =>
                    link.href.startsWith("/") ? (
                      <Link
                        key={link.label}
                        to={link.href}
                        className="text-[14px] text-white/70 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        key={link.label}
                        href={link.href}
                        className="text-[14px] text-white/70 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between lg:pl-10">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-white/45 uppercase">
                  Social
                </p>
                <div className="mt-5 flex flex-col gap-2.5">
                  {SOCIAL.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] text-white/70 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] tracking-[0.2em] text-white/45 uppercase">
                  Back to top
                </p>
                <button
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  aria-label="Back to top"
                  className="mt-4 inline-flex size-9 items-center justify-center border border-white/20 text-white/60 transition-colors hover:border-white/50 hover:text-white"
                >
                  <ArrowUp className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* legal row */}
          <div className="relative border-t border-white/10 py-6">
            <p className="text-[10px] tracking-[0.14em] text-white/40 uppercase lg:text-right">
              © {new Date().getFullYear()} Hypertron Labs. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* oversized metallic wordmark, cropped at the bottom */}
      <p aria-hidden className="landing-footer-wordmark">
        Hypertron
      </p>
    </footer>
  );
}
