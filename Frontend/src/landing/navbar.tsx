"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EncryptedHoverText } from "./encrypted-text";
import { clamp01, subscribeScroll } from "./scroll-sync";

const links = [
  { href: "#ways", label: "Product", current: true },
  { href: "#ways", label: "Build" },
  { href: "#protocol", label: "How it works" },
  { href: "#privacy", label: "Privacy" },
  { href: "/app/developers", label: "Docs" },
] as const;

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
  const home = document.getElementById("home");
  const protocol = document.getElementById("protocol");
  const journey = document.querySelector(".landing-journey-span");
  const privacy = document.querySelector(".landing-privacy-span");

  if (home && covers(home, y)) {
    applyTone("void");
    return;
  }

  if (protocol && covers(protocol, y)) {
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

function Chevron() {
  return (
    <svg width="11" height="7" viewBox="0 0 11 7" aria-hidden="true">
      <path
        d="M.7.7 5.5 5.3 10.3.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
      <path
        d="M.5.5 3.5 3.5.5 6.5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    const unsub = subscribeScroll(syncNavTone);
    return () => {
      unsub();
      delete document.documentElement.dataset.landing;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const panel = document.getElementById(panelId);
    panel?.querySelector<HTMLElement>("a")?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointer(event: MouseEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, panelId]);

  return (
    <header ref={headerRef} className={`landing-nav fixed inset-x-0 top-0 z-50${open ? " is-open" : ""}`}>
      <a href="#home" className="landing-logo-pill" aria-label="Hypertron home">
        <img
          src="/media/logo_white.png"
          alt=""
          className="landing-logo-mark"
          width={34}
          height={34}
        />
        <span className="landing-logo-word">Hypertron</span>
      </a>

      <button
        ref={buttonRef}
        type="button"
        className="landing-menu"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
      </button>

      <div className="landing-nav-cluster">
        <nav id={panelId} className="landing-nav-pill" aria-label="Primary">
          {links.map((link) =>
            link.href.startsWith("/") ? (
              <Link
                key={link.label}
                to={link.href}
                className="landing-nav-link"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className={`landing-nav-link${"current" in link && link.current ? " is-current" : ""}`}
                aria-current={"current" in link && link.current ? "true" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
                {"current" in link && link.current ? <Chevron /> : null}
              </a>
            ),
          )}
        </nav>
        <Link to="/app" className="landing-partner-pill" onClick={() => setOpen(false)}>
          <EncryptedHoverText text="Launch app" />
          <span className="landing-pill-disc">
            <Arrow />
          </span>
        </Link>
      </div>
    </header>
  );
}
