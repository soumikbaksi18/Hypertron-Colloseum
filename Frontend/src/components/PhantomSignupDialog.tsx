import { useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Download,
  Loader2,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';

import { useWalletSession } from '../context/WalletContext';
import { PHANTOM_INSTALL_URL } from '../lib/phantom-sign-in';

type Step = 'choose' | 'connecting';

const FLOW_STEPS = [
  { match: 'Connecting', label: 'Connect wallet' },
  { match: 'Requesting challenge', label: 'Request challenge' },
  { match: 'Sign in Phantom', label: 'Sign the challenge' },
  { match: 'Verifying', label: 'Verify signature' },
] as const;

export function PhantomSignupDialog({
  triggerLabel,
  triggerClassName,
  redirectTo = '/dashboard',
  eyebrow = 'Create account',
  title = 'Sign up with Phantom',
  description = 'Connect your Solana wallet and sign a one-time challenge to continue.',
}: {
  triggerLabel: ReactNode;
  triggerClassName?: string;
  redirectTo?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  const { session, signIn } = useWalletSession();
  const navigate = useNavigate();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('choose');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsInstall, setNeedsInstall] = useState(false);

  const connecting = step === 'connecting';
  const activeIndex = FLOW_STEPS.findIndex((flowStep) =>
    (status ?? '').startsWith(flowStep.match),
  );

  function close() {
    if (connecting) return;
    setOpen(false);
    setStep('choose');
    setStatus(null);
    setError(null);
    setNeedsInstall(false);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, connecting]);

  async function handlePhantomSignIn() {
    setStep('connecting');
    setError(null);
    setNeedsInstall(false);
    setStatus('Connecting…');

    const result = await signIn(setStatus);
    if (!result.ok) {
      setNeedsInstall(Boolean(result.needsInstall));
      setError(result.error);
      setStep('choose');
      setStatus(null);
      return;
    }

    setOpen(false);
    setStep('choose');
    setStatus(null);
    navigate(redirectTo);
  }

  if (session) {
    return (
      <Link to={redirectTo} className={triggerClassName}>
        {triggerLabel}
      </Link>
    );
  }

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      {open
        ? createPortal(
        <div className="landing-auth-overlay fixed inset-0 z-[80] bg-black/55 backdrop-blur-[2px]">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="landing-auth-dialog landing-auth-panel fixed top-1/2 left-1/2 z-[81] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 border border-white/10 text-white shadow-2xl shadow-black/60"
          >
            <span aria-hidden className="absolute top-0 left-0 size-1.5 bg-blue" />

            <div className="relative border-b border-white/10 px-7 pt-7 pb-6 text-left">
              {!connecting ? (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={close}
                  className="absolute top-6 right-6 flex size-8 items-center justify-center border border-white/10 text-white/40 transition-colors hover:border-white/30 hover:text-white"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}

              <p className="text-[10px] font-medium tracking-[0.2em] text-white/40 uppercase">
                {eyebrow}
              </p>
              <h2
                id={titleId}
                className="landing-hero-title mt-3 pr-10 text-[24px] leading-[1.05] tracking-[-0.03em] text-white"
              >
                {title}
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-white/50">{description}</p>
            </div>

            <div className="relative px-7 py-7">
              {!connecting ? (
                <div className="grid gap-5">
                  <div>
                    <p className="mb-3 text-[10px] tracking-[0.2em] text-white/30 uppercase">
                      Choose a wallet
                    </p>
                    <button
                      type="button"
                      onClick={() => void handlePhantomSignIn()}
                      className="group flex w-full items-center gap-4 border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04] text-blue transition-colors group-hover:border-blue/40">
                        <Wallet className="size-5" strokeWidth={1.5} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium text-white">Phantom</span>
                        <span className="mt-1 block text-[12px] text-white/40">
                          Solana browser wallet
                        </span>
                      </span>
                      <span className="flex size-8 shrink-0 items-center justify-center border border-white/10 text-white/40 transition-colors group-hover:border-white/30 group-hover:text-white">
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </button>
                  </div>

                  {error ? (
                    <div className="border border-red-400/25 bg-red-500/[0.08] px-4 py-3">
                      <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-red-200">
                        <AlertCircle className="mt-px size-4 shrink-0" />
                        {error}
                      </p>
                      {needsInstall ? (
                        <a
                          href={PHANTOM_INSTALL_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2 border border-red-400/30 px-3 py-1.5 text-[10px] tracking-[0.16em] text-red-100 uppercase transition-colors hover:bg-red-500/15"
                        >
                          <Download className="size-3.5" />
                          Install Phantom
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  <p className="flex items-center gap-2.5 border-t border-white/10 pt-5 text-[12px] leading-relaxed text-white/35">
                    <ShieldCheck className="size-4 shrink-0 text-blue/70" />
                    Signature only — Hypertron never sees your secret key.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5">
                  <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase">
                    Connecting
                  </p>

                  <ol className="grid gap-3">
                    {FLOW_STEPS.map((flowStep, index) => {
                      const done = activeIndex > index;
                      const active = activeIndex === index;
                      return (
                        <li key={flowStep.match} className="flex items-center gap-3.5">
                          <span
                            className={
                              done || active
                                ? 'flex size-6 shrink-0 items-center justify-center border border-blue/40 bg-blue/10 text-blue'
                                : 'flex size-6 shrink-0 items-center justify-center border border-white/10 text-white/30'
                            }
                          >
                            {done ? (
                              <Check className="size-3.5" strokeWidth={2.5} />
                            ) : active ? (
                              <Loader2 className="landing-auth-spin size-3.5" />
                            ) : (
                              <span className="size-1 bg-current" />
                            )}
                          </span>
                          <span
                            className={
                              done || active
                                ? 'text-[14px] text-white'
                                : 'text-[14px] text-white/35'
                            }
                          >
                            {flowStep.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>

                  <p className="border-t border-white/10 pt-5 text-[13px] leading-relaxed text-white/45">
                    Approve each Phantom prompt to continue. Keep this window open.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
