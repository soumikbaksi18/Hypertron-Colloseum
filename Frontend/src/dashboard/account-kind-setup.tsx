import { ArrowRight, BriefcaseBusiness, Check, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { AccountKind } from '../lib/account-kind';
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
    description: 'Hold USDC privately and send to a Hypertron ID from your wallet.',
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
}: {
  selected: AccountKind | null;
  onSelect: (kind: AccountKind) => void;
  onContinue: () => void;
  continueDisabled?: boolean;
  continueBusy?: boolean;
  continueLabel?: string;
}) {
  return (
    <div className="flex w-full flex-col pb-6">
      <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">Get started</p>
      <h1 className="dash-display mt-3 text-[clamp(2.2rem,4vw,3.2rem)] leading-[0.96] tracking-[-0.035em] text-[#EEF4FF]">
        Are you an individual or a business?
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-[#EEF4FF]/70">
        This sets up your home view. You can switch later from settings.
      </p>

      <div className="mt-8 flex flex-col">
        <div className="flex flex-col sm:flex-row">
          {OPTIONS.map((option, index) => {
            const active = selected === option.id;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(option.id)}
                className={cn(
                  'ov-card relative min-h-[190px] min-w-0 flex-1 text-left',
                  index > 0 && 'z-10 -mt-px sm:mt-0 sm:-ml-px',
                  active && 'z-20 shadow-[inset_0_0_0_1px_#c9b56a]',
                )}
              >
                {active ? (
                  <span className="absolute top-5 right-5 flex size-6 items-center justify-center rounded-full bg-[#ffe500] text-[#14110e]">
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                ) : null}
                <span className="flex size-11 items-center justify-center rounded-xl border border-[#C3D0E8]/35 text-[#c9b56a]">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="dash-display mt-5 block text-[1.65rem] leading-none text-[#EEF4FF]">
                  {option.title}
                </span>
                <span className="mt-3 block max-w-sm text-sm leading-6 text-[#C3D0E8]/70">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="ov-card z-10 -mt-px flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[#C3D0E8]/55">Personal stays open. A business unlocks a workspace.</p>
          <button
            type="button"
            onClick={onContinue}
            disabled={continueDisabled || continueBusy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#ffe500] px-6 text-sm font-medium text-[#14110e] transition hover:bg-[#fff36a] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {continueBusy ? 'Saving…' : continueLabel}
            {!continueBusy ? <ArrowRight className="size-4" strokeWidth={2.25} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
