import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BookOpen,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Plus,
  Sparkles,
} from 'lucide-react';

import { developerKeysApi, type DeveloperKey } from '../lib/developer-keys';
import { ApiError, BASE_URL } from '../lib/http';
import { cn } from './cn';

const KEY_STORAGE = 'hypertron.agentKey';
const API_ORIGIN = BASE_URL || 'http://localhost:4010';

type ApiMode = 'test' | 'live';
type CodeTab = 'curl' | 'node' | 'python';

function formatRelativeCreated(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'Created recently';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Created just now';
  if (minutes < 60) return `Created ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Created ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `Created ${days} day${days === 1 ? '' : 's'} ago`;
}

function maskKey(key: DeveloperKey): string {
  return `ht_sk_...${key.last_four}`;
}

function bearerToken(secret: string | null, keys: DeveloperKey[]): string {
  if (secret) return secret;
  const active = keys.find((key) => key.active);
  if (active) return `ht_sk_...${active.last_four}`;
  return 'ht_sk_YOUR_KEY';
}

function buildSamples(origin: string, token: string) {
  const body =
    '{"payee_ref":"supplier_acme","amount_minor":437000000,"reference":"invoice-1829"}';
  return {
    curl: `curl -X POST ${origin}/v1/payment_intents \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '${body}'`,
    node: `const res = await fetch("${origin}/v1/payment_intents", {
  method: "POST",
  headers: {
    Authorization: "Bearer ${token}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    payee_ref: "supplier_acme",
    amount_minor: 437000000,
    reference: "invoice-1829",
  }),
});
const intent = await res.json();`,
    python: `import requests

res = requests.post(
    "${origin}/v1/payment_intents",
    headers={
        "Authorization": "Bearer ${token}",
        "Content-Type": "application/json",
    },
    json={
        "payee_ref": "supplier_acme",
        "amount_minor": 437000000,
        "reference": "invoice-1829",
    },
)
intent = res.json()`,
  };
}

export function WorkspaceDevelopers() {
  const [keys, setKeys] = useState<DeveloperKey[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [apiMode, setApiMode] = useState<ApiMode>('test');
  const [codeTab, setCodeTab] = useState<CodeTab>('curl');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [menuKeyId, setMenuKeyId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void developerKeysApi
      .list()
      .then(setKeys)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Could not load API keys.'),
      );
  }, []);

  useEffect(() => {
    if (!menuKeyId) return;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuKeyId(null);
    }
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [menuKeyId]);

  const apiOrigin = useMemo(() => {
    if (apiMode === 'live') {
      return (import.meta.env.VITE_HYPERTRON_LIVE_API_URL as string | undefined)?.trim() || API_ORIGIN;
    }
    return API_ORIGIN;
  }, [apiMode]);

  const token = bearerToken(secret, keys);
  const samples = useMemo(() => buildSamples(apiOrigin, token), [apiOrigin, token]);
  const activeSample = samples[codeTab];

  async function createKey() {
    setBusy(true);
    setError(null);
    try {
      const created = await developerKeysApi.create();
      setKeys((current) => [created, ...current]);
      if (created.secret) {
        setSecret(created.secret);
        localStorage.setItem(KEY_STORAGE, created.secret);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not issue a key.');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setMenuKeyId(null);
    try {
      const updated = await developerKeysApi.revoke(id);
      setKeys((current) => current.map((key) => (key.id === updated.id ? updated : key)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke this key.');
    }
  }

  return (
    <div className="dash-developers flex w-full flex-col gap-4 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="dash-display text-[clamp(2.2rem,4vw,3.2rem)] leading-[0.96] tracking-[-0.035em] text-[#EEF4FF]">
            Developers
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#EEF4FF]/70">
            Create an API key, then copy a sample. Test and Live only change the host in that sample.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-[#C3D0E8]/35 bg-transparent p-1">
          <button
            type="button"
            onClick={() => setApiMode('test')}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[12px] transition',
              apiMode === 'test'
                ? 'bg-white/[0.08] text-[#EEF4FF]'
                : 'text-white/55 hover:text-white/80',
            )}
          >
            <Sparkles className="size-3.5" strokeWidth={2} />
            Test
          </button>
          <button
            type="button"
            onClick={() => setApiMode('live')}
            className={cn(
              'inline-flex h-9 items-center rounded-lg px-3.5 text-[12px] transition',
              apiMode === 'live'
                ? 'bg-white/[0.08] text-[#EEF4FF]'
                : 'text-white/55 hover:text-white/80',
            )}
          >
            Live
          </button>
        </div>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {secret ? (
        <div className="rounded-xl border border-[#c9b56a]/35 bg-[#c9b56a]/10 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-[#c9b56a] uppercase">
            Copy this key once
          </p>
          <code className="mt-2 block break-all font-mono text-sm text-white">{secret}</code>
          <p className="mt-2 text-xs text-white/50">
            Saved for Agents in this browser. It will not be shown again.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col">
      <section className="ov-card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#C3D0E8]/35 px-4 py-4 sm:px-5">
          <div>
            <h2 className="dash-display text-[1.45rem] leading-none text-[#EEF4FF]">API Keys</h2>
            <p className="mt-1 text-xs text-white/45">Use this key to authenticate your requests.</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createKey()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#c9b56a]/60 bg-[#ffe500] px-4 text-[12px] font-semibold text-[#14110e] transition hover:bg-[#fff36a] disabled:opacity-50"
          >
            <Plus className="size-3.5" strokeWidth={2.2} />
            {busy ? 'Creating…' : 'Create key'}
          </button>
        </div>

        {keys.length === 0 ? (
          <p className="px-4 py-8 text-sm text-white/45 sm:px-5">
            No keys yet. Create one to integrate Hypertron.
          </p>
        ) : (
          <ul className="divide-y divide-[#C3D0E8]/25">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <code className="font-mono text-sm text-white">{maskKey(key)}</code>
                  <button
                    type="button"
                    aria-label="Copy key prefix"
                    onClick={() => {
                      void navigator.clipboard.writeText(maskKey(key));
                      setCopiedKeyId(key.id);
                      window.setTimeout(() => setCopiedKeyId(null), 1500);
                    }}
                    className="inline-flex size-7 items-center justify-center rounded-md border border-[#C3D0E8]/35 text-white/45 transition hover:border-white/25 hover:text-white"
                  >
                    <Copy className="size-3.5" strokeWidth={1.75} />
                  </button>
                  {copiedKeyId === key.id ? (
                    <span className="text-[10px] text-emerald-300/80">Copied</span>
                  ) : null}
                  <span className="rounded-md border border-[#C3D0E8]/35 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/55">
                    {key.agent_label}
                  </span>
                  {key.active ? (
                    <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/45">
                      Revoked
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40">{formatRelativeCreated(key.created_at)}</p>
                <div className="relative" ref={menuKeyId === key.id ? menuRef : undefined}>
                  <button
                    type="button"
                    aria-label="Key actions"
                    onClick={() => setMenuKeyId((current) => (current === key.id ? null : key.id))}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-[#C3D0E8]/35 text-white/45 transition hover:border-white/25 hover:text-white"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menuKeyId === key.id && key.active ? (
                    <div className="absolute top-[calc(100%+6px)] right-0 z-20 min-w-[140px] overflow-hidden rounded-xl border border-[#C3D0E8]/35 bg-[#03080b] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                      <button
                        type="button"
                        className="block w-full px-3.5 py-2 text-left text-sm text-rose-200 hover:bg-white/[0.06]"
                        onClick={() => void revoke(key.id)}
                      >
                        Revoke key
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ov-card z-10 -mt-px overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#C3D0E8]/35 px-4 py-4 sm:px-5">
          <div>
            <h2 className="dash-display text-[1.45rem] leading-none text-[#EEF4FF]">Use from your app</h2>
            <p className="mt-1 text-xs text-white/45">
              Send a payment intent to your Hypertron API.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(activeSample);
              setCopiedCode(true);
              window.setTimeout(() => setCopiedCode(false), 1500);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#C3D0E8]/35 px-3 text-[11px] font-medium text-white/65 transition hover:border-white/25 hover:text-white"
          >
            <Copy className="size-3.5" strokeWidth={1.75} />
            {copiedCode ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="flex gap-4 border-b border-[#C3D0E8]/35 px-4 sm:px-5">
          {(
            [
              ['curl', 'cURL'],
              ['node', 'Node.js'],
              ['python', 'Python'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setCodeTab(id)}
              className={cn(
                'border-b-2 py-3 text-[12px] font-medium transition',
                codeTab === id
                  ? 'border-[#c9b56a] text-[#c9b56a]'
                  : 'border-transparent text-white/45 hover:text-white/70',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto bg-[#03080b] px-4 py-4 sm:px-5">
          <pre className="font-mono text-[12px] leading-relaxed text-white/80">
            <CodeBlock source={activeSample} />
          </pre>
        </div>
      </section>

      <section className="ov-card z-10 -mt-px flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#C3D0E8]/35 bg-white/[0.04] text-[#8DA4CD]">
            <BookOpen className="size-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">Need help integrating?</p>
            <p className="mt-0.5 text-xs text-white/45">
              Check out our API reference for guides and examples.
            </p>
          </div>
        </div>
        <a
          href={`${API_ORIGIN}/docs`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C3D0E8]/35 bg-white/[0.04] px-4 text-[12px] font-medium text-white/75 transition hover:border-white/25 hover:text-white"
        >
          View documentation
          <ExternalLink className="size-3.5" strokeWidth={1.75} />
        </a>
      </section>
      </div>
    </div>
  );
}

function CodeBlock({ source }: { source: string }) {
  const lines = source.split('\n');
  return (
    <>
      {lines.map((line, index) => (
        <div key={`${index}-${line}`} className="flex gap-4">
          <span className="w-5 shrink-0 select-none text-right text-white/25">{index + 1}</span>
          <code className="min-w-0 whitespace-pre-wrap break-all">{highlightLine(line)}</code>
        </div>
      ))}
    </>
  );
}

function highlightLine(line: string) {
  const parts: ReactNode[] = [];
  const regex = /("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|\b\d+\b|\b(?:curl|POST|import|await|fetch|requests|headers|json|method|body|Authorization|Content-Type)\b)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    const token = match[0];
    const className = token.startsWith('"') || token.startsWith("'")
      ? 'text-emerald-300/90'
      : /^\d+$/.test(token)
        ? 'text-[#c9b56a]'
        : 'text-[#9BB6FF]';
    parts.push(
      <span key={key} className={className}>
        {token}
      </span>,
    );
    key += 1;
    last = match.index + token.length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts.length ? parts : line;
}
