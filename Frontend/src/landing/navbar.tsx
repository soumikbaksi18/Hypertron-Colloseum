"use client";

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { PhantomSignupDialog } from "../components/PhantomSignupDialog";
import { clamp01, easeInOutCubic, subscribeScroll } from "./scroll-sync";

const links = [
  { href: "#product", label: "Product" },
  { href: "#ways", label: "Build" },
  { href: "#protocol", label: "How it works" },
  { href: "#privacy", label: "Privacy" },
  { href: "/app/developers", label: "Docs" },
  { href: "#about", label: "About" },
] as const;

function LogoMark() {
  return (
    <span aria-hidden className="landing-nav-logo relative inline-flex size-7 shrink-0 items-center justify-center">
      <img
        src="/media/logo_white.png"
        alt=""
        width={28}
        height={28}
        className="landing-nav-logo-light absolute inset-0 size-full object-contain"
      />
      <img
        src="/media/logo_black.png"
        alt=""
        width={28}
        height={28}
        className="landing-nav-logo-dark absolute inset-0 size-full object-contain"
      />
    </span>
  );
}

function covers(el: Element | null, y: number) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.top <= y && rect.bottom > y;
}

function progressAt(el: Element, y: number) {
  const rect = el.getBoundingClientRect();
  return clamp01((y - rect.top) / Math.max(1, rect.height));
}

function applyTone(tone: "paper" | "void") {
  const root = document.documentElement;
  if (root.dataset.landing === tone) return;
  root.dataset.landing = tone;
}

function syncNavTone() {
  const y = 40;
  const pin = document.querySelector("[data-hero-pin]");
  const home = document.getElementById("home");
  const protocol = document.getElementById("protocol");
  const journey = document.querySelector(".landing-journey-span");
  const privacy = document.querySelector(".landing-privacy-span");

  if (pin instanceof HTMLElement && home && covers(home, y)) {
    const travel = Math.max(1, pin.offsetHeight - window.innerHeight);
    if (travel > window.innerHeight * 0.5) {
      const raw = clamp01(-pin.getBoundingClientRect().top / travel);
      const shrink = easeInOutCubic(clamp01(raw / 0.46));
      applyTone(shrink > 0.02 ? "paper" : "void");
      return;
    }
    applyTone("void");
    return;
  }

  if (protocol && covers(protocol, y)) {
    // The journey section is mid-blue from its top edge and only darkens.
    applyTone(progressAt(protocol, y) > 0.04 ? "void" : "paper");
    return;
  }

  if (journey && covers(journey, y)) {
    applyTone("paper");
    return;
  }

  if (privacy && covers(privacy, y)) {
    applyTone(progressAt(privacy, y) < 0.64 ? "void" : "paper");
    return;
  }

  applyTone("paper");
}

export function LandingNavbar() {
  useEffect(() => {
    const unsub = subscribeScroll(syncNavTone);
    return () => {
      unsub();
      delete document.documentElement.dataset.landing;
    };
  }, []);

  return (
    <header className="landing-nav fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 w-full items-center justify-between px-5 sm:px-10 lg:px-16">
        <a
          href="#home"
          className="landing-nav-ink inline-flex items-center gap-2.5 font-display text-[15px] font-medium tracking-[0.14em] uppercase"
        >
          <LogoMark />
          Hypertron
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) =>
            link.href.startsWith("/") ? (
              <Link
                key={`${link.href}-${link.label}`}
                to={link.href}
                className="landing-nav-ink text-[11px] font-medium tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={`${link.href}-${link.label}`}
                href={link.href}
                className="landing-nav-ink text-[11px] font-medium tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        <div className="landing-launch">
          <PhantomSignupDialog triggerLabel="Launch app" />
          <ArrowUpRight
            aria-hidden
            className="landing-launch-arrow pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2"
          />
        </div>
      </div>
    </header>
  );
}
