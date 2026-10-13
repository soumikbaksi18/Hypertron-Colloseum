import { useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Info,
  Shield,
  Upload,
} from 'lucide-react';

import { ExplorerTxLink } from '../components/ExplorerTxLink';
import { useWalletSession } from '../context/WalletContext';
import { openAuditorBooks } from '../lib/auditor-scan';
import { money } from '../lib/format';
import { ApiError } from '../lib/http';
import { downloadAuditorKey, loadShieldKeys } from '../lib/shield-keys';
import type { AuditorPayment } from '../lib/wallet';
import { cn } from './cn';

function maskSecret(value: string): string {
  if (value.length < 18) return '••••';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function kindLabel(kind: AuditorPayment['kind']): string {
  if (kind === 'invoice') return 'Invoice';
  if (kind === 'add_money') return 'Added money';
  return 'Private payment';
}

export function WorkspaceCompliance() {
  const { session } = useWalletSession();
  const keys = loadShieldKeys();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<'key' | 'file' | null>(null);
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booksFor, setBooksFor] = useState<string | null>(null);
  const [payments, setPayments] = useState<AuditorPayment[] | null>(null);

  if (!session) return null;
  const hypertronHandle = session.handle;

  async function copyViewingKey() {
    if (!keys) return;
    await navigator.clipboard.writeText(keys.viewSecret);
    setCopied('key');
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function onOpen(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const opened = await openAuditorBooks(pasted, hypertronHandle ?? null);
      setBooksFor(opened.handle);
      setPayments(opened.payments);
      if (!opened.payments.length) {
        setError('This key did not open any payments we can see.');
      }
    } catch (err) {
      setPayments(null);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not open those books.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dash-compliance flex w-full flex-col gap-4 pb-6">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-[#c9b56a] uppercase">
          Disclosure
        </p>
        <h1 className="mt-1 dash-display text-[clamp(2.2rem,4vw,3.2rem)] leading-[0.96] tracking-[-0.035em] text-[#EEF4FF]">
          Auditor
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[#EEF4FF]/70">
          Share your viewing key to see who sent how much to whom. A viewing key cannot spend.
        </p>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col">
      <div className="flex flex-col xl:flex-row">
        <form className="ov-card min-w-0 flex-1" onSubmit={(event) => void onOpen(event)}>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#c9b56a] uppercase">
            Paste a viewing key
          </p>
          <div className="relative mt-3">
            <textarea
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              placeholder="0x… or drop an auditor JSON file"
              spellCheck={false}
              className="min-h-[140px] w-full resize-y rounded-xl border border-[#C3D0E8]/35 bg-transparent px-4 py-3 pr-12 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
            />
            <button
              type="button"
              aria-label="Upload auditor file"
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-3 bottom-3 inline-flex size-8 items-center justify-center rounded-lg border border-[#C3D0E8]/35 bg-white/[0.04] text-white/45 transition hover:border-white/25 hover:text-white"
            >
              <Upload className="size-4" strokeWidth={1.75} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json,.txt"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                void file.text().then(setPasted);
              }}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#ffe500] px-5 text-sm font-semibold text-[#14110e]  transition hover:bg-[#fff36a] disabled:opacity-50 sm:flex-none"
            >
              <Eye className="size-4" strokeWidth={2} />
              {busy ? 'Opening…' : 'Reveal payments'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#C3D0E8]/35 bg-white/[0.04] px-5 text-sm font-medium text-white/75 transition hover:border-white/25 hover:text-white"
            >
              <Copy className="size-4" strokeWidth={1.75} />
              Upload file
            </button>
          </div>
        </form>

        {keys ? (
          <section className="ov-card z-10 -mt-px min-w-0 flex-1 xl:mt-0 xl:-ml-px">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[#c9b56a] uppercase">
                Your viewing key
              </p>
              <Info className="size-3.5 text-white/30" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#C3D0E8]/35 bg-transparent px-3 py-2.5">
              <code className="min-w-0 flex-1 truncate font-mono text-sm text-white">
                {revealed ? keys.viewSecret : maskSecret(keys.viewSecret)}
              </code>
              <button
                type="button"
                aria-label="Copy viewing key"
                onClick={() => void copyViewingKey()}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#C3D0E8]/35 text-white/45 transition hover:border-white/25 hover:text-white"
              >
                {copied === 'key' ? (
                  <Check className="size-4 text-emerald-300" strokeWidth={2} />
                ) : (
                  <Copy className="size-4" strokeWidth={1.75} />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-white/40">
              For {hypertronHandle ?? 'this Hypertron ID'}. Give this to an auditor — not the
              Settings backup.
            </p>

            <ul className="mt-4 space-y-2">
              <ActionRow
                active
                icon={Eye}
                label="Reveal"
                onClick={() => setRevealed((open) => !open)}
                detail={revealed ? 'Hide key' : 'Show full key'}
              />
              <ActionRow
                icon={Copy}
                label="Copy viewing key"
                onClick={() => void copyViewingKey()}
                detail={copied === 'key' ? 'Copied' : undefined}
              />
              <ActionRow
                icon={Download}
                label="Download auditor file"
                onClick={() => {
                  downloadAuditorKey(keys, hypertronHandle);
                  setCopied('file');
                  window.setTimeout(() => setCopied(null), 1600);
                }}
                detail={copied === 'file' ? 'Downloaded' : undefined}
              />
            </ul>
          </section>
        ) : (
          <section className="ov-card z-10 -mt-px min-w-0 flex-1 border-dashed xl:mt-0 xl:-ml-px">
            <p className="text-sm font-medium text-white">No viewing key on this browser</p>
            <p className="mt-2 text-xs leading-relaxed text-white/45">
              You can still paste someone else’s key. To share yours, sign in here again or import
              a backup in Settings.
            </p>
          </section>
        )}
      </div>

      {payments ? (
        <section className="ov-card z-10 -mt-px">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#c9b56a] uppercase">
            Payments
          </p>
          <h2 className="dash-display mt-2 text-[1.6rem] leading-none text-[#EEF4FF]">
            {booksFor ? `Books for ${booksFor}` : 'Opened payments'}
          </h2>
          {payments.length === 0 ? (
            <p className="mt-4 text-sm text-white/45">
              Nothing decrypted. The key may be wrong, or those notes never got a blob.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[#C3D0E8]/25">
              {payments.map((row) => (
                <li key={`${row.commitment}-${row.leaf_index}`} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                        <span>{row.from}</span>
                        <ArrowRight className="size-3.5 text-white/35" strokeWidth={2} />
                        <span>{row.to}</span>
                      </p>
                      <p className="mt-1 text-sm text-white/55">{row.purpose}</p>
                      <p className="mt-1 text-xs text-white/40">
                        {kindLabel(row.kind)}
                        {row.status === 'spent' ? ' · already spent' : ' · still in the pool'}
                      </p>
                      {row.tx_signature ? (
                        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-white/45">
                          <span>Pool</span>
                          <ExplorerTxLink signature={row.tx_signature} compact />
                        </p>
                      ) : null}
                    </div>
                    <p className="dash-display text-[1.35rem] leading-none text-[#EEF4FF]">
                      {money(row.amount, 'USDC')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="ov-card z-10 -mt-px flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#C3D0E8]/35 bg-white/[0.04] text-[#8DA4CD]">
            <Shield className="size-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">What is a viewing key?</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/45">
              A viewing key allows read-only access to your payment activity. It cannot move funds
              or make changes.
            </p>
          </div>
        </div>
        <a
          href="https://docs.solana.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C3D0E8]/35 bg-white/[0.04] px-4 text-[12px] font-medium text-white/75 transition hover:border-white/25 hover:text-white"
        >
          Learn more
          <ExternalLink className="size-3.5" strokeWidth={1.75} />
        </a>
      </section>
      </div>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  label,
  onClick,
  detail,
  active,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  detail?: string;
  active?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
          active
            ? 'border-[#c9b56a]/45 bg-[#c9b56a]/10'
            : 'border-[#C3D0E8]/35 bg-transparent hover:border-[#C3D0E8]/55',
        )}
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#C3D0E8]/35 bg-white/[0.04] text-[#8DA4CD]">
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-white">{label}</span>
          {detail ? <span className="mt-0.5 block text-xs text-white/40">{detail}</span> : null}
        </span>
        <ChevronRight className="size-4 shrink-0 text-white/35" strokeWidth={1.75} />
      </button>
    </li>
  );
}
