import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Copy, Download, Eye, EyeOff } from 'lucide-react';

import { ExplorerTxLink } from '../components/ExplorerTxLink';
import { useWalletSession } from '../context/WalletContext';
import { openAuditorBooks } from '../lib/auditor-scan';
import { money } from '../lib/format';
import { ApiError } from '../lib/http';
import {
  downloadAuditorKey,
  loadShieldKeys,
} from '../lib/shield-keys';
import type { AuditorPayment } from '../lib/wallet';

const PRIMARY =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#ffe500] px-5 text-sm font-medium text-[#14110e] disabled:opacity-50';
const SECONDARY =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#C3D0E8]/45 bg-transparent px-5 text-sm text-[#EEF4FF] hover:bg-white/[0.04] disabled:opacity-50';
const FIELD =
  'mt-2 min-h-[5.5rem] w-full rounded-xl border border-[#C3D0E8]/35 bg-transparent px-4 py-3 font-mono text-sm text-[#EEF4FF] outline-none transition placeholder:text-[#C3D0E8]/40 focus:border-[#C3D0E8]/70';

function maskSecret(value: string): string {
  if (value.length < 18) return '••••';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function kindLabel(kind: AuditorPayment['kind']): string {
  if (kind === 'invoice') return 'Invoice';
  if (kind === 'add_money') return 'Added money';
  return 'Private payment';
}

export function AuditorPage() {
  const { session } = useWalletSession();
  const keys = loadShieldKeys();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<'key' | 'file' | null>(null);
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booksFor, setBooksFor] = useState<string | null>(null);
  const [payments, setPayments] = useState<AuditorPayment[] | null>(null);

  if (!session) return null;

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
      const opened = await openAuditorBooks(pasted, session?.handle ?? null);
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
    <div className="space-y-5">
      <div>
        <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
          Disclosure
        </p>
        <h1 className="dash-display mt-3 text-[clamp(2.2rem,4vw,3.2rem)] leading-[0.96] tracking-[-0.035em] text-[#EEF4FF]">
          Auditor
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[#EEF4FF]/70">
          Share your viewing key, or paste one to see who sent how much to whom.
          A viewing key cannot spend.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <form className="rounded-[1.35rem] border border-[#C3D0E8]/45 bg-[#03080b] p-8" onSubmit={(event) => void onOpen(event)}>
        <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
          Open books
        </p>
        <label className="mt-3 block">
          <span className="text-sm text-[#EEF4FF]">Paste a viewing key</span>
          <textarea
            className={FIELD}
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            placeholder="0x… or drop an auditor JSON file"
            spellCheck={false}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="submit" className={PRIMARY} disabled={busy}>
            {busy ? 'Opening…' : 'Reveal payments'}
          </button>
          <label className={`${SECONDARY} cursor-pointer`}>
            Upload file
            <input
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
          </label>
        </div>
      </form>

      {payments ? (
        <section className="rounded-[1.35rem] border border-[#C3D0E8]/45 bg-[#03080b] p-8">
          <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
            Payments
          </p>
          <h2 className="mt-2 dash-display text-[1.6rem] leading-none text-[#EEF4FF]">
            {booksFor ? `Books for ${booksFor}` : 'Opened payments'}
          </h2>
          {payments.length === 0 ? (
            <p className="mt-4 text-sm text-[#C3D0E8]/55">
              Nothing decrypted. The key may be wrong, or those notes never got a blob.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[#C3D0E8]/25">
              {payments.map((row) => (
                <li key={`${row.commitment}-${row.leaf_index}`} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 dash-display text-[1.35rem] text-[#EEF4FF]">
                        <span>{row.from}</span>
                        <ArrowRight className="size-3.5 text-[#C3D0E8]" strokeWidth={2} />
                        <span>{row.to}</span>
                      </p>
                      <p className="mt-1 text-sm text-[#C3D0E8]/70">{row.purpose}</p>
                      <p className="mt-1 text-xs text-[#C3D0E8]/45">
                        {kindLabel(row.kind)}
                        {row.status === 'spent' ? ' · already spent' : ' · still in the pool'}
                      </p>
                      {row.tx_signature ? (
                        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[#C3D0E8]/55">
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

      {keys ? (
        <section className="rounded-[1.35rem] border border-[#C3D0E8]/45 bg-[#03080b] p-8">
          <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
            Your viewing key
          </p>
          <p className="mt-3 font-mono text-sm break-all text-[#EEF4FF]">
            {revealed ? keys.viewSecret : maskSecret(keys.viewSecret)}
          </p>
          <p className="mt-3 text-xs text-[#C3D0E8]/55">
            For {session.handle ?? 'this Hypertron ID'}. Give this to an auditor —
            not the Settings backup.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className={SECONDARY}
              onClick={() => setRevealed((open) => !open)}
            >
              {revealed ? (
                <EyeOff className="size-4" strokeWidth={1.75} />
              ) : (
                <Eye className="size-4" strokeWidth={1.75} />
              )}
              {revealed ? 'Hide' : 'Reveal'}
            </button>
            <button type="button" className={PRIMARY} onClick={() => void copyViewingKey()}>
              {copied === 'key' ? (
                <Check className="size-4" strokeWidth={2} />
              ) : (
                <Copy className="size-4" strokeWidth={1.75} />
              )}
              {copied === 'key' ? 'Copied' : 'Copy viewing key'}
            </button>
            <button
              type="button"
              className={SECONDARY}
              onClick={() => {
                downloadAuditorKey(keys, session.handle);
                setCopied('file');
                window.setTimeout(() => setCopied(null), 1600);
              }}
            >
              <Download className="size-4" strokeWidth={1.75} />
              {copied === 'file' ? 'Downloaded' : 'Download auditor file'}
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-[1.35rem] border border-dashed border-[#C3D0E8]/35 bg-[#03080b] p-8">
          <p className="text-sm text-[#EEF4FF]">No viewing key on this browser</p>
          <p className="mt-2 text-sm text-[#C3D0E8]/55">
            You can still paste someone else’s key above. To share yours, sign in
            here again or import a backup in Settings.
          </p>
        </section>
      )}
    </div>
  );
}
