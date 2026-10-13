import { useEffect, useRef } from 'react';

import { LandingCta } from '../landing/cta';
import { LandingEcosystem } from '../landing/ecosystem';
import { LandingFaq } from '../landing/faq';
import { LandingFooter } from '../landing/footer';
import { LandingHero } from '../landing/hero';
import { LandingNavbar } from '../landing/navbar';
import { LandingPreloader } from '../landing/preloader';
import { LandingOperations } from '../landing/operations';
import { LandingPrivacy } from '../landing/privacy';
import { LandingProcess } from '../landing/process';
import { SmoothScroll } from '../landing/smooth-scroll';
import { LandingWays } from '../landing/ways';
import { useLandingSound } from '../landing/use-landing-sound';
import '../landing/landing.css';

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useLandingSound(rootRef);

  useEffect(() => {
    const root = document.documentElement;
    const previousTitle = document.title;
    const previousSize = root.style.fontSize;
    document.title = 'Hypertron. Private payments, built for business.';
    root.style.fontSize = '16px';

    return () => {
      document.title = previousTitle;
      root.style.fontSize = previousSize;
      delete root.dataset.landing;
    };
  }, []);

  return (
    <div ref={rootRef} className="landing-root relative flex min-h-svh flex-1 flex-col">
      <LandingPreloader />
      <SmoothScroll />
      <LandingNavbar />

      <main className="relative flex flex-1 flex-col">
        <div className="landing-hero-stack">
          <LandingHero />
          <LandingWays />
          <div className="landing-journey-span">
            <LandingProcess />
          </div>
        </div>
        <div className="landing-privacy-span">
          <LandingPrivacy />
          <LandingOperations />
        </div>
        <LandingEcosystem />
        <LandingCta />
        <LandingFaq />
      </main>

      <div className="relative z-10">
        <LandingFooter />
      </div>
    </div>
  );
}
