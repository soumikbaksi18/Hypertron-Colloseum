import { ArrowRight, BriefcaseBusiness, Check, ChevronRight, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { AccountKind } from '../lib/account-kind';
import { DashboardUtilities } from './chrome';
import { cn } from './cn';

const OPTIONS: {
  id: AccountKind;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: 'individual',
    title: 'Individual',
    description:
      'Hold USDC privately, send to a Hypertron ID, and request payments from people you know.',
    icon: UserRound,
  },
  {
    id: 'business',
    title: 'Business',
    description:
      'Payment links, team workspaces, treasury, and developer keys for your company.',
    icon: BriefcaseBusiness,
  },
];

export function AccountKindSetup({
  selected,
  onSelect,
  onContinue,
  continueDisabled,
  continueBusy,
  continueLabel = 'Continue',
  identityTitle,
  searchPlaceholder = 'Search',
}: {
  selected: AccountKind | null;
  onSelect: (kind: AccountKind) => void;
  onContinue: () => void;
  continueDisabled?: boolean;
  continueBusy?: boolean;
  continueLabel?: string;
  identityTitle: string;
  searchPlaceholder?: string;
}) {
  return (
    <div className="flex w-full flex-col gap-8 pb-10">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <nav
          className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-white/45"
          aria-label="Breadcrumb"
        >
          <span className="text-white/55">Account</span>
          <ChevronRight className="size-3 text-white/30" strokeWidth={2} />
          <span className="font-medium text-white/80">Setup</span>
        </nav>
        <div className="lg:justify-self-end">
          <DashboardUtilities
            searchPlaceholder={searchPlaceholder}
            identityTitle={identityTitle}
            density="regular"
            showAccount
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#E7B66D] uppercase">
          Get started
        </p>
        <h1 className="mt-3 text-[clamp(26px,3vw,34px)] font-semibold leading-tight tracking-tight text-white">
          Are you an individual or a business?
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-white/45">
          This sets up your home view. You can always switch later from settings.
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
                onClick={() => onSelect(option.id)}
                className={cn(
                  'relative min-h-[190px] rounded-2xl border p-6 text-left transition',
                  active
                    ? 'border-[#E7B66D] bg-[#0b1629] shadow-[inset_0_0_0_1px_rgba(231,182,109,0.25)]'
                    : 'border-white/10 bg-[#0a1426] hover:border-white/20',
                )}
              >
                {active ? (
                  <span className="absolute top-4 right-4 flex size-6 items-center justify-center rounded-full bg-[#E7B66D] text-[#1A1408]">
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                ) : null}
                <span className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#E7B66D]">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="mt-5 block text-lg font-semibold text-white">
                  {option.title}
                </span>
                <span className="mt-2 block text-sm leading-6 text-white/45">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={onContinue}
            disabled={continueDisabled || continueBusy}
            className="inline-flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-full bg-[#E7B66D] px-8 text-sm font-semibold text-[#1A1408] shadow-[0_12px_32px_rgba(231,182,109,0.35)] transition hover:bg-[#F0C77E] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {continueBusy ? 'Saving…' : continueLabel}
            {!continueBusy ? <ArrowRight className="size-4" strokeWidth={2.25} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
