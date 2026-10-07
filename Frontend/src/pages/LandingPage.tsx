import { useEffect } from 'react';

import { LandingCta } from '../landing/cta';
import { LandingEcosystem } from '../landing/ecosystem';
import { LandingFaq } from '../landing/faq';
import { LandingFooter } from '../landing/footer';
import { LandingHero } from '../landing/hero';
import { LandingNavbar } from '../landing/navbar';
import { LandingOperations } from '../landing/operations';
import { LandingPrivacy } from '../landing/privacy';
import { LandingProcess } from '../landing/process';
import { LandingProduct } from '../landing/product';
import { SmoothScroll } from '../landing/smooth-scroll';
import { LandingWays } from '../landing/ways';
import '../landing/landing.css';

export function LandingPage() {
  useEffect(() => {
    const root = document.documentElement;
    const previousTitle = document.title;
    const previousSize = root.style.fontSize;
    document.title = 'Hypertron: Privacy infrastructure for payments';
    root.style.fontSize = '16px';

    return () => {
      document.title = previousTitle;
      root.style.fontSize = previousSize;
      delete root.dataset.landing;
    };
  }, []);

  return (
    <div className="landing-root relative flex min-h-svh flex-1 flex-col overflow-x-clip">
      <SmoothScroll />
      <LandingNavbar />

      <main className="relative z-10 flex flex-1 flex-col">
        <LandingHero />
        <LandingProduct />
        <div className="landing-journey-span">
          <LandingWays />
          <LandingProcess />
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
