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
import type { WorkspaceView } from '../lib/workspaces';
import { DashboardUtilities, type DashboardMode } from './chrome';
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

export function WorkspaceCompliance({
  workspace,
  searchPlaceholder,
  identityTitle,
  onModeChange,
  breadcrumbVariant = 'workspace',
}: {
  workspace?: WorkspaceView;
  searchPlaceholder: string;
  identityTitle: string;
  onModeChange?: (mode: DashboardMode) => void;
  breadcrumbVariant?: 'workspace' | 'account';
}) {
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
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <nav className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-white/45">
          <span className="text-white/55">
            {breadcrumbVariant === 'account' ? 'Account' : workspace?.name ?? 'Personal'}
          </span>
          <ChevronRight className="size-3 text-white/30" strokeWidth={2} />
          <span className="text-white/55">Compliance</span>
          <ChevronRight className="size-3 text-white/30" strokeWidth={2} />
          <span className="font-medium text-white/80">Auditor</span>
        </nav>
        <div className="lg:justify-self-end">
          <DashboardUtilities
            searchPlaceholder={searchPlaceholder}
            identityTitle={identityTitle}
            mode="workspaces"
            onModeChange={onModeChange}
            density="regular"
          />
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-[#E7B66D] uppercase">
          Disclosure
        </p>
        <h1 className="mt-1 text-[clamp(22px,2.6vw,30px)] font-semibold tracking-tight text-white">
          Auditor
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/45">
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

      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <form className="ov-card p-4 sm:p-5" onSubmit={(event) => void onOpen(event)}>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
            Paste a viewing key
          </p>
          <div className="relative mt-3">
            <textarea
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              placeholder="0x… or drop an auditor JSON file"
              spellCheck={false}
              className="min-h-[140px] w-full resize-y rounded-xl border border-white/10 bg-[#0a1426] px-4 py-3 pr-12 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
            />
            <button
              type="button"
              aria-label="Upload auditor file"
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-3 bottom-3 inline-flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/45 transition hover:border-white/25 hover:text-white"
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
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E7B66D] to-[#D4A054] px-5 text-sm font-semibold text-[#1A1408] shadow-[0_12px_32px_rgba(231,182,109,0.28)] transition hover:from-[#F0C77E] hover:to-[#E7B66D] disabled:opacity-50 sm:flex-none"
            >
              <Eye className="size-4" strokeWidth={2} />
              {busy ? 'Opening…' : 'Reveal payments'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-white/75 transition hover:border-white/25 hover:text-white"
            >
              <Copy className="size-4" strokeWidth={1.75} />
              Upload file
            </button>
          </div>
        </form>

        {keys ? (
          <section className="ov-card p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                Your viewing key
              </p>
              <Info className="size-3.5 text-white/30" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a1426] px-3 py-2.5">
              <code className="min-w-0 flex-1 truncate font-mono text-sm text-white">
                {revealed ? keys.viewSecret : maskSecret(keys.viewSecret)}
              </code>
              <button
                type="button"
                aria-label="Copy viewing key"
                onClick={() => void copyViewingKey()}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/45 transition hover:border-white/25 hover:text-white"
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
          <section className="ov-card border-dashed p-4 sm:p-5">
            <p className="text-sm font-medium text-white">No viewing key on this browser</p>
            <p className="mt-2 text-xs leading-relaxed text-white/45">
              You can still paste someone else’s key. To share yours, sign in here again or import
              a backup in Settings.
            </p>
          </section>
        )}
      </div>

      {payments ? (
        <section className="ov-card p-4 sm:p-5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
            Payments
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            {booksFor ? `Books for ${booksFor}` : 'Opened payments'}
          </h2>
          {payments.length === 0 ? (
            <p className="mt-4 text-sm text-white/45">
              Nothing decrypted. The key may be wrong, or those notes never got a blob.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-white/10">
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
                    <p className="text-base font-semibold tracking-tight text-white">
                      {money(row.amount, 'USDC')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="ov-card flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#8DA4CD]">
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
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-[12px] font-medium text-white/75 transition hover:border-white/25 hover:text-white"
        >
          Learn more
          <ExternalLink className="size-3.5" strokeWidth={1.75} />
        </a>
      </section>
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
            ? 'border-[#4A63BE]/45 bg-[#4A63BE]/10'
            : 'border-white/10 bg-[#0a1426]/60 hover:border-white/20',
        )}
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#8DA4CD]">
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
