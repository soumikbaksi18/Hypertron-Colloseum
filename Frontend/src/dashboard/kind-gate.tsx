import { BriefcaseBusiness, Check, UserRound } from 'lucide-react';
import { useState } from 'react';

import { useWalletSession } from '../context/WalletContext';
import { setAccountKind, type AccountKind } from '../lib/account-kind';
import { sessionApi } from '../lib/session';
import { cn } from './cn';

const OPTIONS = [
  {
    id: 'individual' as const,
    title: 'Individual',
    description: 'Hold USDC privately, send to a Hypertron ID, and request payment from people you know.',
    icon: UserRound,
  },
  {
    id: 'business' as const,
    title: 'Business',
    description: 'Payment links, team workspaces, treasury, and developer keys for your company.',
    icon: BriefcaseBusiness,
  },
];

export function KindGate({ onChosen }: { onChosen: (kind: AccountKind) => void }) {
  const { session, refresh } = useWalletSession();
  const [selected, setSelected] = useState<AccountKind | null>(null);
  const [busy, setBusy] = useState(false);

  if (!session) return null;
  const current = session;

  async function confirm() {
    if (!selected || busy) return;
    setBusy(true);
    setAccountKind(current.wallet_address, selected);
    if (selected === 'individual') {
      const name = current.name.trim();
      if (!name || /^untitled/i.test(name)) {
        await sessionApi.updateMe({ name: 'Personal' }).catch(() => undefined);
        await refresh().catch(() => undefined);
      }
    }
    onChosen(selected);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#C9A46A] uppercase">
        Get started
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">
        Are you an individual or a business?
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        This chooses the home you see. Switch later with the Personal /
        Workspaces toggle in the sidebar. You can still send privately either way.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const active = selected === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(option.id)}
              className={cn(
                'relative min-h-48 rounded-2xl border p-6 text-left transition',
                active
                  ? 'border-[#E7B66D] bg-white ring-1 ring-[#E7B66D]/30'
                  : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              {active ? (
                <span className="absolute top-4 right-4 flex size-5 items-center justify-center rounded-full bg-[#E7B66D] text-[#0F1939]">
                  <Check className="size-3" strokeWidth={2.4} />
                </span>
              ) : null}
              <span className="flex size-11 items-center justify-center rounded-xl bg-[#F8F0E2] text-[#E7B66D]">
                <Icon className="size-5" strokeWidth={1.8} />
              </span>
              <span className="mt-5 block text-lg font-semibold text-slate-900">{option.title}</span>
              <span className="mt-2 block text-sm leading-6 text-slate-500">{option.description}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={!selected || busy}
          className="inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-[#121F46] to-[#4A63BE] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(18,31,70,0.22)] disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
