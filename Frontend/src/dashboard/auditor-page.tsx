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
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#121F46] to-[#4A63BE] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(18,31,70,0.22)] disabled:opacity-50';
const SECONDARY =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const FIELD =
  'mt-2 min-h-[5.5rem] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#4A63BE] focus:ring-4 focus:ring-[#4A63BE]/10';

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
      const opened = await openAuditorBooks(pasted, session.handle ?? null);
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
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#C9A46A] uppercase">
          Disclosure
        </p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-950">
          Auditor
        </h1>
        <p className="mt-1 max-w-xl text-sm text-slate-500">
          Share your viewing key, or paste one to see who sent how much to whom.
          A viewing key cannot spend.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <form className="rounded-2xl border border-slate-200 bg-white p-6" onSubmit={(event) => void onOpen(event)}>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          Open books
        </p>
        <label className="mt-3 block">
          <span className="text-sm font-semibold text-slate-900">Paste a viewing key</span>
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
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            Payments
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
            {booksFor ? `Books for ${booksFor}` : 'Opened payments'}
          </h2>
          {payments.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Nothing decrypted. The key may be wrong, or those notes never got a blob.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {payments.map((row) => (
                <li key={`${row.commitment}-${row.leaf_index}`} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-950">
                        <span>{row.from}</span>
                        <ArrowRight className="size-3.5 text-slate-400" strokeWidth={2} />
                        <span>{row.to}</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{row.purpose}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {kindLabel(row.kind)}
                        {row.status === 'spent' ? ' · already spent' : ' · still in the pool'}
                      </p>
                      {row.tx_signature ? (
                        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span>Pool</span>
                          <ExplorerTxLink signature={row.tx_signature} compact />
                        </p>
                      ) : null}
                    </div>
                    <p className="text-base font-semibold tracking-tight text-slate-950">
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
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            Your viewing key
          </p>
          <p className="mt-3 font-mono text-sm break-all text-slate-950">
            {revealed ? keys.viewSecret : maskSecret(keys.viewSecret)}
          </p>
          <p className="mt-3 text-xs text-slate-500">
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
        <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-900">No viewing key on this browser</p>
          <p className="mt-2 text-sm text-slate-500">
            You can still paste someone else’s key above. To share yours, sign in
            here again or import a backup in Settings.
          </p>
        </section>
      )}
    </div>
  );
}
