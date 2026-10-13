import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  LogOut,
  Search,
  ShieldUser,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useWalletSession } from '../context/WalletContext';
import { cn } from './cn';
import { HypertronLogoMark } from './logo-mark';

export type DashboardNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  dividerBefore?: boolean;
};

export type DashboardIdentity = {
  title: string;
  subtitle?: string;
};

export type DashboardMode = 'personal' | 'workspaces';

function ModeToggle({
  mode,
  onChange,
}: {
  mode: DashboardMode;
  onChange: (mode: DashboardMode) => void;
}) {
  return (
    <div className="mt-5 px-2">
      <div
        role="tablist"
        aria-label="Account mode"
        className="relative grid grid-cols-2 rounded-full border border-white/10 bg-white/[0.06] p-1"
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-[#E7B66D] shadow-[0_0_16px_rgba(231,182,109,0.35)] transition-transform duration-200 ease-out',
            mode === 'workspaces' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0',
          )}
        />
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'personal'}
          onClick={() => onChange('personal')}
          className={cn(
            'relative z-10 h-8 rounded-full text-[12px] font-semibold tracking-tight transition',
            mode === 'personal' ? 'text-[#0F1939]' : 'text-white/55 hover:text-white',
          )}
        >
          Personal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'workspaces'}
          onClick={() => onChange('workspaces')}
          className={cn(
            'relative z-10 h-8 rounded-full text-[12px] font-semibold tracking-tight transition',
            mode === 'workspaces' ? 'text-[#0F1939]' : 'text-white/55 hover:text-white',
          )}
        >
          Workspaces
        </button>
      </div>
    </div>
  );
}

function DashboardSidebar({
  navItems,
  activeId,
  onSelect,
  identity,
  mode,
  onModeChange,
  showModeToggle = true,
  className,
}: {
  navItems: DashboardNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  identity?: DashboardIdentity;
  mode?: DashboardMode;
  onModeChange?: (mode: DashboardMode) => void;
  showModeToggle?: boolean;
  className?: string;
}) {
  const identityTitle = identity?.title ?? 'Not signed in';

  return (
    <aside className={cn('dash-sidebar flex flex-col py-2 pb-10 pl-1', className)}>
      <Link to="/app" className="flex items-center gap-2.5 px-3 pt-2">
        <HypertronLogoMark size={32} />
        <span className="font-display text-[15px] font-semibold tracking-tight text-white">
          Hypertron
        </span>
      </Link>

      {showModeToggle && mode && onModeChange ? (
        <ModeToggle mode={mode} onChange={onModeChange} />
      ) : null}

      <nav className="mt-5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeId === item.id;
          return (
            <div key={item.id}>
              {item.dividerBefore ? (
                <div className="mx-1 my-2 h-px bg-white/10" />
              ) : null}
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  'relative flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium transition',
                  active
                    ? 'bg-gradient-to-r from-[#E7B66D]/22 via-[#E7B66D]/10 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(231,182,109,0.28)]'
                    : 'text-white/55 hover:bg-white/[0.05] hover:text-white',
                )}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[#E7B66D] shadow-[0_0_12px_rgba(231,182,109,0.65)]"
                  />
                ) : null}
                <Icon
                  className={cn(
                    'size-4 shrink-0',
                    active ? 'text-[#E7B66D]' : 'text-white/45',
                  )}
                  strokeWidth={1.85}
                />
                <span className={active ? 'text-white' : undefined}>{item.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      <div className="space-y-3 px-2">
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-white transition hover:bg-white/[0.05]"
        >
          <CircleHelp className="size-4 text-[#E7B66D]" strokeWidth={1.85} />
          Help &amp; Support
        </button>

        <AccountMenu title={identityTitle} subtitle={identity?.subtitle} />
      </div>
    </aside>
  );
}

export function DashboardChrome({
  navItems,
  activeId,
  onSelect,
  breadcrumb,
  searchPlaceholder,
  identity,
  mode,
  onModeChange,
  variant = 'panel',
  hideHeader = false,
  overviewScaled = false,
  children,
}: {
  navItems: DashboardNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  breadcrumb: string;
  searchPlaceholder: string;
  identity?: DashboardIdentity;
  identityTo?: string;
  onIdentityClick?: () => void;
  mode?: DashboardMode;
  onModeChange?: (mode: DashboardMode) => void;
  variant?: 'panel' | 'canvas';
  hideHeader?: boolean;
  overviewScaled?: boolean;
  children: ReactNode;
}) {
  const identityTitle = identity?.title ?? 'Not signed in';

  if (variant === 'canvas') {
    return (
      <div className="dash-root dash-canvas relative flex h-svh overflow-hidden text-white">
        <DashboardSidebar
          navItems={navItems}
          activeId={activeId}
          onSelect={onSelect}
          identity={identity}
          mode={mode}
          onModeChange={onModeChange}
          showModeToggle={false}
          className="relative z-20 border-r border-white/10 bg-[#060d1a]"
        />

        <section
          className={cn(
            'relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-3 pt-3 pb-2 sm:px-4 sm:pt-4 md:px-5',
            overviewScaled && 'dash-main--overview-scaled',
          )}
        >
          {hideHeader ? null : (
            <header className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm text-white/45">{breadcrumb}</p>
              <DashboardUtilities
                searchPlaceholder={searchPlaceholder}
                identityTitle={identityTitle}
                mode={mode}
                onModeChange={onModeChange}
                showAccount={false}
                density="regular"
              />
            </header>
          )}
          {children}
        </section>
      </div>
    );
  }

  return (
    <div className="dash-root relative min-h-svh overflow-hidden bg-[#0F1939] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-[8%] size-[28rem] rounded-full bg-[#E7B66D]/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[18%] -left-24 size-[22rem] rounded-full border border-[#E7B66D]/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[8%] bottom-[-8rem] size-[32rem] rounded-full bg-[#4A63BE]/18 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[18%] top-[12%] size-[18rem] rounded-full border border-white/8"
      />

      <div className="relative z-10 flex min-h-svh gap-3 p-3 md:gap-4 md:p-4">
        <DashboardSidebar
          navItems={navItems}
          activeId={activeId}
          onSelect={onSelect}
          identity={identity}
          mode={mode}
          onModeChange={onModeChange}
        />

        <section className="dash-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-[#f7f8fb] text-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white/70 px-5 md:px-6">
            <p className="text-sm text-slate-400">{breadcrumb}</p>
            <div className="flex items-center gap-2">
              <label className="relative hidden h-9 w-56 items-center rounded-full border border-slate-200 bg-slate-50 sm:flex">
                <Search
                  className="pointer-events-none absolute left-3 size-3.5 text-slate-400"
                  strokeWidth={1.75}
                />
                <input
                  type="search"
                  placeholder={searchPlaceholder}
                  className="h-full w-full rounded-full bg-transparent pr-9 pl-9 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
                <kbd className="pointer-events-none absolute right-2 flex h-5 min-w-5 items-center justify-center rounded border border-slate-200 bg-white px-1 text-[10px] font-medium text-slate-400">
                  /
                </kbd>
              </label>
              <button
                type="button"
                aria-label="Notifications"
                className="relative inline-flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              >
                <Bell className="size-4" />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-7 md:py-7">{children}</div>
        </section>
      </div>
    </div>
  );
}

export function DashboardUtilities({
  searchPlaceholder,
  identityTitle,
  mode,
  onModeChange,
  showAccount = true,
  density = 'compact',
}: {
  searchPlaceholder: string;
  identityTitle: string;
  mode?: DashboardMode;
  onModeChange?: (mode: DashboardMode) => void;
  showAccount?: boolean;
  density?: 'compact' | 'regular';
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const regular = density === 'regular';

  return (
    <div className="flex items-center gap-2">
      <label className={cn('relative hidden shrink-0 items-center sm:flex', regular ? 'h-10 w-72' : 'h-8 w-[248px]')}>
        <Search
          className={cn('pointer-events-none absolute left-3 text-white/40', regular ? 'size-4' : 'size-3')}
          strokeWidth={1.75}
        />
        <input
          ref={inputRef}
          type="search"
          placeholder={searchPlaceholder}
          className={cn(
            'h-full w-full border border-white/10 bg-[#0b1527] text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none',
            regular ? 'rounded-xl pr-9 pl-10 text-sm' : 'rounded-lg pr-8 pl-8 text-[8px]',
          )}
        />
        <kbd className={cn(
          'pointer-events-none absolute right-2 flex items-center justify-center rounded border border-white/10 bg-white/[0.03] font-medium text-white/35',
          regular ? 'h-5 min-w-5 px-1 text-[10px]' : 'h-4 min-w-4 px-1 text-[7px]',
        )}>
          /
        </kbd>
      </label>
      <button
        type="button"
        aria-label="Notifications"
        className={cn(
          'relative inline-flex items-center justify-center border border-white/10 bg-[#0b1527] text-white/65 transition hover:border-white/20',
          regular ? 'size-10 rounded-xl' : 'size-8 rounded-lg',
        )}
      >
        <Bell className={regular ? 'size-4' : 'size-3.5'} />
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-rose-500 ring-2 ring-[#0b1527]" />
      </button>
      {showAccount ? (
        <AccountMenu
          title={identityTitle}
          variant="avatar"
          mode={mode}
          onModeChange={onModeChange}
        />
      ) : null}
    </div>
  );
}

function AccountMenu({
  title,
  subtitle,
  variant = 'card',
  mode,
  onModeChange,
}: {
  title: string;
  subtitle?: string;
  variant?: 'card' | 'avatar' | 'sidebar';
  mode?: DashboardMode;
  onModeChange?: (mode: DashboardMode) => void;
}) {
  const { signOut } = useWalletSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initials =
    title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'HT';

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((current) => !current)}
        className={
          variant === 'avatar'
            ? 'inline-flex size-9 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_20%,#9eb0ff,#243056_42%,#12182e)] text-[11px] font-semibold text-white ring-1 ring-white/20 transition hover:ring-white/40'
            : variant === 'sidebar'
              ? 'flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-2 text-left transition hover:bg-white/[0.055]'
              : 'flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 text-left shadow-[inset_0_0_0_1px_rgba(231,182,109,0.08)] transition hover:bg-white/[0.09]'
        }
      >
        {variant === 'avatar' ? (
          initials
        ) : variant === 'sidebar' ? (
          <>
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#1a2a51] text-[8px] font-semibold text-[#B7D0FF] ring-1 ring-white/10">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[9px] font-medium text-white">{title}</span>
              <span className="mt-0.5 block text-[7px] text-white/35">{subtitle}</span>
            </span>
            <ChevronRight className="size-3 shrink-0 text-white/45" />
          </>
        ) : (
          <IdentityBlock title={title} subtitle={subtitle} />
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute z-30 overflow-hidden rounded-xl border border-white/10 bg-[#12182e] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]',
            variant === 'avatar'
              ? 'top-[calc(100%+8px)] right-0 w-48'
              : 'right-0 bottom-[calc(100%+8px)] left-0 bg-[#121F46]',
          )}
        >
          {onModeChange ? (
            <>
              {(
                [
                  ['personal', 'Personal'],
                  ['workspaces', 'Workspaces'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className={cn(
                    'flex h-10 w-full items-center px-3.5 text-left text-sm font-medium transition hover:bg-white/[0.06]',
                    mode === id ? 'text-white' : 'text-white/70',
                  )}
                  onClick={() => {
                    setOpen(false);
                    onModeChange(id);
                  }}
                >
                  {label}
                </button>
              ))}
              <div className="my-1 h-px bg-white/10" />
            </>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex h-10 w-full items-center gap-2.5 px-3.5 text-left text-sm font-medium text-white/85 transition hover:bg-white/[0.06] hover:text-white"
            onClick={() => {
              setOpen(false);
              void signOut().then(() => navigate('/'));
            }}
          >
            <LogOut className="size-4 text-[#E7B66D]" strokeWidth={1.85} />
            Sign Out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function IdentityBlock({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#4A63BE]/25 text-[#E7B66D] ring-1 ring-[#E7B66D]/25">
        <ShieldUser className="size-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {subtitle ? (
          <p className="truncate font-mono text-xs text-white/45" title={subtitle}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <ChevronsUpDown className="size-4 shrink-0 text-[#E7B66D]" strokeWidth={2} />
    </>
  );
}
