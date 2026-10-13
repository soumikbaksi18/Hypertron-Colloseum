import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BOOK_DEMO } from "./constants";
import { EncryptedHoverText } from "./encrypted-text";
import { HeroCursor } from "./hero-cursor";
import { HeroMesh } from "./hero-mesh";

function Arrow() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
      <path
        d="M.6.6 4 4 .6 7.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const revealEase = [0.22, 1, 0.36, 1] as const;

const TICKER = [
  "Private payments on Solana",
  "Shielded settlement",
  "Selective disclosure",
  "Shared privacy pool",
  "No public payment trail",
  "Merchant checkout",
  "Treasury and reconciliation",
  "Stripe-like API",
  "Audit when you choose",
] as const;

function useHeroOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !document.documentElement.dataset.preloading) {
      setOpen(true);
      return;
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("hypertron:open", onOpen);
    return () => window.removeEventListener("hypertron:open", onOpen);
  }, []);

  return open;
}

function RevealLine({
  children,
  open,
  delay,
}: {
  children: ReactNode;
  open: boolean;
  delay: number;
}) {
  return (
    <span className="landing-hero-reveal">
      <motion.span
        initial={false}
        animate={{ y: open ? "0%" : "115%" }}
        transition={{ duration: open ? 0.9 : 0, ease: revealEase, delay: open ? delay : 0 }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function LandingHero() {
  const open = useHeroOpen();

  return (
    <section id="home" className="landing-hero">
      <img
        src="/media/image2.png"
        alt=""
        className="landing-hero-bg"
        aria-hidden
      />
      <div className="landing-hero-scrim" aria-hidden />
      <HeroMesh />
      <HeroCursor />
      <div className="landing-hero-copy">
        <h1 className="landing-hero-title">
          <RevealLine open={open} delay={0.02}>
            Private
          </RevealLine>
          <RevealLine open={open} delay={0.1}>
            Payments,
          </RevealLine>
          <RevealLine open={open} delay={0.18}>
            Built For <em>Business.</em>
          </RevealLine>
        </h1>
        <p className="landing-hero-lede">
          <RevealLine open={open} delay={0.32}>
            Onboard, settle, and operate on Solana
          </RevealLine>
          <RevealLine open={open} delay={0.4}>
            without exposing your business on-chain.
          </RevealLine>
        </p>
        <motion.div
          className="landing-hero-actions"
          initial={false}
          animate={{ opacity: open ? 1 : 0, y: open ? 0 : 12 }}
          transition={{ duration: 0.6, ease: revealEase, delay: open ? 0.5 : 0 }}
        >
          <a
            href={BOOK_DEMO}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-cta-pill"
          >
            <EncryptedHoverText text="Book a demo" />
            <span className="landing-pill-disc">
              <Arrow />
            </span>
          </a>
          <Link to="/app/developers" className="landing-text-link">
            Explore docs
          </Link>
        </motion.div>
      </div>

      <div className="landing-hero-ticker" aria-hidden>
        <div className="landing-hero-ticker-track">
          {[0, 1].map((copy) => (
            <div key={copy}>
              {TICKER.map((item) => (
                <span key={`${copy}-${item}`}>
                  {item}
                  <i />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <motion.a
        href="#ways"
        className="landing-scroll"
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.5, delay: open ? 0.62 : 0 }}
      >
        Scroll for details
        <svg width="11" height="7" viewBox="0 0 11 7" aria-hidden="true">
          <path
            d="M.7.7 5.5 5.3 10.3.7"
            fill="none"
            stroke="#C3D0E8"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.a>
    </section>
  );
}
