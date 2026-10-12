import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  BookOpen,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Info,
  KeyRound,
  Shield,
  Upload,
  Wallet,
} from 'lucide-react';

import { useWalletSession } from '../context/WalletContext';
import { ApiError } from '../lib/http';
import { keygenFromServer } from '../lib/prover';
import {
  downloadShieldBackup,
  loadShieldKeys,
  parseShieldBackup,
  saveShieldKeys,
  type ShieldKeys,
} from '../lib/shield-keys';
import { sessionApi } from '../lib/session';
import type { WorkspaceView } from '../lib/workspaces';
import { DashboardUtilities, type DashboardMode } from './chrome';
import { cn } from './cn';

function maskValue(value: string, start = 10, end = 4): string {
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

function withHexPrefix(value: string): string {
  return value.startsWith('0x') ? value : `0x${value}`;
}

export function WorkspaceSettings({
  workspace,
  searchPlaceholder,
  identityTitle,
  onModeChange,
  onOpenCompliance,
}: {
  workspace: WorkspaceView;
  searchPlaceholder: string;
  identityTitle: string;
  onModeChange?: (mode: DashboardMode) => void;
  onOpenCompliance?: () => void;
}) {
  const { session, refresh } = useWalletSession();
  const importRef = useRef<HTMLInputElement>(null);
  const [localKeys, setLocalKeys] = useState<ShieldKeys | null>(() => loadShieldKeys());
  const [name, setName] = useState('');
  const [payout, setPayout] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setName(session.name ?? '');
    setPayout(session.payout_address ?? session.wallet_address ?? '');
  }, [session]);

  const dirty = useMemo(() => {
    if (!session) return false;
    return (
      name.trim() !== (session.name ?? '').trim() ||
      payout.trim() !== (session.payout_address ?? session.wallet_address ?? '').trim()
    );
  }, [name, payout, session]);

  if (!session) return null;

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!dirty) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await sessionApi.updateMe({
        name: name.trim(),
        payoutAddress: payout.trim(),
      });
      await refresh();
      setMessage('Saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save settings.');
    } finally {
      setBusy(false);
    }
  }

  async function copyText(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1500);
  }

  async function generateKeys() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const keys = await keygenFromServer();
      const saved = {
        spendSk: keys.spend_sk,
        viewSecret: keys.view_secret,
        viewPub: keys.view_pub,
        ownerPk: keys.owner_pk,
      };
      saveShieldKeys(saved);
      setLocalKeys(saved);
      downloadShieldBackup(saved);
      await sessionApi.updateMe({
        viewPub: keys.view_pub,
        ownerPk: keys.owner_pk,
      });
      await refresh();
      setMessage('Shield keys generated. Backup downloaded.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate shield keys.');
    } finally {
      setBusy(false);
    }
  }

  const ownerDisplay = localKeys
    ? maskValue(withHexPrefix(localKeys.spendSk), 12, 4)
    : session.owner_pk
      ? maskValue(withHexPrefix(session.owner_pk), 12, 4)
      : 'Not generated';
  const viewerDisplay = localKeys?.viewPub ?? session.view_pub ?? 'Not generated';

  return (
    <div className="dash-settings flex w-full flex-col gap-4 pb-6">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <nav className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-white/45">
          <span className="text-white/55">{workspace.name}</span>
          <ChevronRight className="size-3 text-white/30" strokeWidth={2} />
          <span className="font-medium text-white/80">Settings</span>
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
          Settings
        </p>
        <h1 className="mt-1 text-[clamp(22px,2.6vw,30px)] font-semibold tracking-tight text-white">
          Settings
        </h1>
        <p className="mt-1.5 text-[13px] text-white/45">
          Manage your workspace and security preferences.
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
      {message ? (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] xl:items-start">
        <div className="space-y-4">
          <form className="ov-card p-4 sm:p-5" onSubmit={(event) => void onSave(event)}>
            <SettingsCardHeader
              icon={Wallet}
              title="Workspace"
              description="Your business details and payout configuration."
              action={
                <button
                  type="submit"
                  disabled={busy || !dirty}
                  className="inline-flex h-8 items-center rounded-lg border border-white/10 px-3 text-[11px] font-semibold text-white/70 transition enabled:hover:border-white/25 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
              }
            />

            <label className="mt-4 block">
              <span className="text-[10px] font-semibold tracking-[0.12em] text-white/40 uppercase">
                Name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0a1426] px-3 text-sm text-white outline-none focus:border-white/25"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-[10px] font-semibold tracking-[0.12em] text-white/40 uppercase">
                Default payout address
              </span>
              <div className="relative mt-2">
                <input
                  value={payout}
                  onChange={(event) => setPayout(event.target.value)}
                  spellCheck={false}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0a1426] pr-11 pl-3 font-mono text-sm text-white outline-none focus:border-white/25"
                />
                <button
                  type="button"
                  aria-label="Copy payout address"
                  onClick={() => void copyText('payout', payout)}
                  className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg border border-white/10 text-white/45 transition hover:border-white/25 hover:text-white"
                >
                  <Copy className="size-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </label>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#4A63BE]/25 bg-[#4A63BE]/10 px-3 py-2.5">
              <Info className="mt-0.5 size-4 shrink-0 text-[#9BB6FF]" strokeWidth={1.75} />
              <p className="text-xs leading-relaxed text-white/55">
                Used by default for withdrawals. You can use different addresses per payment.
              </p>
            </div>
            {copied === 'payout' ? (
              <p className="mt-2 text-[11px] text-emerald-300/80">Payout address copied.</p>
            ) : null}
          </form>

          <section className="ov-card p-4 sm:p-5">
            <SettingsCardHeader
              icon={KeyRound}
              title="Shield Keys"
              description="Encrypt and share viewing access."
              action={
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void generateKeys()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#F3D28F]/50 bg-[#E7B66D]/15 px-3 text-[11px] font-semibold text-[#F3D28F] transition hover:bg-[#E7B66D]/25 disabled:opacity-50"
                >
                  <KeyRound className="size-3.5" strokeWidth={1.85} />
                  Generate keys
                </button>
              }
            />

            <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
              <KeyRow
                label="Owner (private)"
                value={ownerDisplay}
                tag="Private"
                tagTone="gold"
                onCopy={
                  localKeys
                    ? () => void copyText('owner', localKeys.spendSk)
                    : undefined
                }
                copied={copied === 'owner'}
              />
              <KeyRow
                label="Viewer (public)"
                value={maskValue(viewerDisplay, 12, 6)}
                tag="Public"
                tagTone="blue"
                onCopy={
                  localKeys?.viewPub
                    ? () => void copyText('viewer', localKeys.viewPub)
                    : session.view_pub
                      ? () => void copyText('viewer', session.view_pub!)
                      : undefined
                }
                copied={copied === 'viewer'}
                borderTop
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!localKeys}
                onClick={() => localKeys && downloadShieldBackup(localKeys)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40"
              >
                <Download className="size-4" strokeWidth={1.75} />
                Download backup
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => importRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40"
              >
                <Upload className="size-4" strokeWidth={1.75} />
                Import backup
              </button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  setBusy(true);
                  setError(null);
                  void file
                    .text()
                    .then(async (text) => {
                      const keys = parseShieldBackup(text);
                      saveShieldKeys(keys);
                      setLocalKeys(keys);
                      await sessionApi.updateMe({
                        viewPub: keys.viewPub,
                        ownerPk: keys.ownerPk,
                      });
                      await refresh();
                      setMessage('Shield keys imported into this browser.');
                    })
                    .catch((err) =>
                      setError(
                        err instanceof Error ? err.message : 'Could not import that key file.',
                      ),
                    )
                    .finally(() => setBusy(false));
                }}
              />
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="ov-card p-4 sm:p-5">
            <SettingsCardHeader
              icon={Shield}
              title="Security"
              description="Keep your workspace secure."
            />
            <ul className="mt-4 space-y-2">
              <SecurityRow
                title="Viewing key"
                detail="Share this to let an auditor see payments."
                onClick={() => {
                  if (onOpenCompliance) onOpenCompliance();
                  else if (localKeys) void copyText('viewing', localKeys.viewSecret);
                }}
              />
              <SecurityRow
                title="Spending key"
                detail="Used for sending and withdrawals."
                onClick={() => {
                  if (localKeys) void copyText('spending', localKeys.spendSk);
                }}
              />
            </ul>
            {copied === 'viewing' || copied === 'spending' ? (
              <p className="mt-2 text-[11px] text-emerald-300/80">Copied to clipboard.</p>
            ) : null}
          </section>

          <section className="ov-card p-4 sm:p-5">
            <SettingsCardHeader
              icon={BookOpen}
              title="Learn more"
              description="Guides to get the most out of Hypertron."
            />
            <ul className="mt-4 space-y-2">
              <LearnLink
                label="About viewing keys"
                onClick={() => onOpenCompliance?.()}
              />
              <LearnLink label="Managing workspace settings" href="#workspace-settings" />
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function SettingsCardHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Wallet;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#E7B66D]/35 bg-[#E7B66D]/10 text-[#F3D28F]">
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-white/45">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function KeyRow({
  label,
  value,
  tag,
  tagTone,
  onCopy,
  copied,
  borderTop,
}: {
  label: string;
  value: string;
  tag: string;
  tagTone: 'gold' | 'blue';
  onCopy?: () => void;
  copied?: boolean;
  borderTop?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4',
        borderTop && 'border-t border-white/10',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-white/40 uppercase">
          {label}
        </p>
        <code className="mt-1 block truncate font-mono text-sm text-white">{value}</code>
      </div>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-medium',
          tagTone === 'gold'
            ? 'border border-[#E7B66D]/35 bg-[#E7B66D]/10 text-[#F3D28F]'
            : 'border border-[#4A63BE]/35 bg-[#4A63BE]/10 text-[#9BB6FF]',
        )}
      >
        {tag}
      </span>
      {onCopy ? (
        <button
          type="button"
          aria-label={`Copy ${label}`}
          onClick={onCopy}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-white/10 text-white/45 transition hover:border-white/25 hover:text-white"
        >
          <Copy className="size-3.5" strokeWidth={1.75} />
        </button>
      ) : null}
      {copied ? <span className="text-[10px] text-emerald-300/80">Copied</span> : null}
    </div>
  );
}

function SecurityRow({
  title,
  detail,
  onClick,
}: {
  title: string;
  detail: string;
  onClick?: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#0a1426]/60 px-3 py-2.5 text-left transition hover:border-white/20"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-white">{title}</span>
          <span className="mt-0.5 block text-xs text-white/45">{detail}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-white/35" strokeWidth={1.75} />
      </button>
    </li>
  );
}

function LearnLink({ label, href, onClick }: { label: string; href?: string; onClick?: () => void }) {
  if (onClick) {
    return (
      <li>
        <button
          type="button"
          onClick={onClick}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-left text-sm text-white/70 transition hover:text-white"
        >
          {label}
          <ExternalLink className="size-3.5 text-white/35" strokeWidth={1.75} />
        </button>
      </li>
    );
  }
  return (
    <li>
      <a
        href={href ?? '#'}
        className="flex items-center justify-between gap-3 rounded-lg px-1 py-2 text-sm text-white/70 transition hover:text-white"
      >
        {label}
        <ExternalLink className="size-3.5 text-white/35" strokeWidth={1.75} />
      </a>
    </li>
  );
}
