import { Link } from 'react-router-dom';

import './LandingPage.css';

const WAYS = [
  {
    label: 'Platform',
    title: 'Collect without an agent',
    copy: 'Create an invoice, send a payment link, and let your customer pay with Phantom. Policy and privacy still sit underneath.',
  },
  {
    label: 'API',
    title: 'Integrate the pool',
    copy: 'Issue an API key and call payment intents from your own app — same settlement spine, no dashboard required.',
  },
  {
    label: 'Agents',
    title: 'Pay via MCP',
    copy: 'Connect an agent with MCP. It requests payments under your limits; you approve anything above the line.',
  },
] as const;

const STEPS = [
  { title: 'Create invoice', copy: 'Amount, purpose, customer. Hypertron mints a link.' },
  { title: 'Send the link', copy: 'Your customer opens /pay and sees only this invoice.' },
  { title: 'They pay', copy: 'Phantom signs. You see paid; the public trail stays thin.' },
  { title: 'Or let software pay', copy: 'API keys and MCP create outbound intents under policy.' },
] as const;

export function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-atmosphere" aria-hidden="true" />

      <header className="landing-nav">
        <a className="landing-brand" href="#home">
          <img src="/media/logo_white.png" alt="" width={28} height={28} />
          <span>Hypertron</span>
        </a>
        <nav className="landing-nav-links" aria-label="Primary">
          <a href="#offerings">Offerings</a>
          <a href="#how">How it works</a>
          <Link to="/app" className="landing-nav-cta">
            Launch app
          </Link>
        </nav>
      </header>

      <main>
        <section id="home" className="landing-hero">
          <p className="landing-brand-hero">Hypertron</p>
          <h1 className="landing-headline">
            Private payments for businesses — and the{' '}
            <em>agents</em> that act for them.
          </h1>
          <p className="landing-lead">
            Create invoices, send a payment page, issue API keys, or let an
            agent spend under policy. Phantom is how you sign in. No agent
            required to collect.
          </p>
          <div className="landing-cta-row">
            <Link to="/app" className="landing-cta-primary">
              Launch app
            </Link>
            <a href="#offerings" className="landing-cta-secondary">
              See offerings
            </a>
          </div>
        </section>

        <section id="offerings" className="landing-section">
          <p className="landing-eyebrow">Onboard · Settle · Scale</p>
          <h2 className="landing-section-title">Three ways in</h2>
          <p className="landing-section-lead">
            Same private settlement layer. Pick the surface that matches how
            you work.
          </p>
          <div className="landing-offerings">
            {WAYS.map((item) => (
              <article key={item.label} className="landing-offering">
                <span className="landing-offering-label">{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="landing-section">
          <p className="landing-eyebrow">Collect first</p>
          <h2 className="landing-section-title">Invoice to receipt</h2>
          <ol className="landing-steps">
            {STEPS.map((step, index) => (
              <li key={step.title} className="landing-step">
                <span className="landing-step-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-close">
          <h2>Open the workspace</h2>
          <p>
            Connect Phantom, name the business, create a payment link. API keys
            and MCP wait in Developers when you need outbound spend.
          </p>
          <Link to="/app" className="landing-cta-primary">
            Connect Phantom
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-spectrum" aria-hidden="true" />
        <div className="landing-footer-row">
          <span>Hypertron</span>
          <span>Private payments under policy · Solana Colosseum</span>
        </div>
      </footer>
    </div>
  );
}
