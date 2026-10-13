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
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

import { useWalletSession } from '../context/WalletContext';
import { AsciiField } from './ascii-field';
import { cn } from './cn';

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

export type BreadcrumbCrumb = {
  label: string;
  onSelect?: () => void;
};

function DashboardBreadcrumb({
  breadcrumb,
  tone,
}: {
  breadcrumb: string | BreadcrumbCrumb[];
  tone: 'canvas' | 'panel';
}) {
  const crumbs: BreadcrumbCrumb[] =
    typeof breadcrumb === 'string'
      ? breadcrumb
          .split('/')
          .map((part) => part.trim())
          .filter(Boolean)
          .map((label) => ({ label }))
      : breadcrumb;
  const canvas = tone === 'canvas';

  return (
    <nav
      aria-label="Breadcrumb"
      className={
        canvas
          ? 'flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase'
          : 'flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-slate-500'
      }
    >
      {crumbs.map((crumb, index) => {
        const current = index === crumbs.length - 1;
        const linked = !current && typeof crumb.onSelect === 'function';
        return (
          <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1.5">
            {index > 0 ? (
              <ChevronRight
                aria-hidden
                className={canvas ? 'size-3 text-[#c9b56a]/70' : 'size-3.5 text-slate-300'}
                strokeWidth={2}
              />
            ) : null}
            {linked ? (
              <button
                type="button"
                onClick={crumb.onSelect}
                className={
                  canvas
                    ? 'text-[#c9b56a]/70 transition hover:text-[#c9b56a]'
                    : 'transition hover:text-slate-800'
                }
              >
                {crumb.label}
              </button>
            ) : (
              <span aria-current={current ? 'page' : undefined}>{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

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
        className="relative grid grid-cols-2 rounded-md border border-[#C3D0E8]/35 bg-transparent p-1"
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-sm bg-[#ffe500] transition-transform duration-200 ease-out',
            mode === 'workspaces' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0',
          )}
        />
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'personal'}
          onClick={() => onChange('personal')}
          className={cn(
            'relative z-10 h-8 rounded-sm text-[12px] tracking-tight transition',
            mode === 'personal' ? 'text-[#14110e]' : 'text-[#C3D0E8]/55 hover:text-[#EEF4FF]',
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
            'relative z-10 h-8 rounded-sm text-[12px] tracking-tight transition',
            mode === 'workspaces' ? 'text-[#14110e]' : 'text-[#C3D0E8]/55 hover:text-[#EEF4FF]',
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
      <Link to="/app" className="dash-brand flex items-center gap-2.5 px-3 pt-2 no-underline">
        <img
          src="/media/logo_white.png"
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 object-contain"
        />
        <span className="dash-display text-[22px] leading-none tracking-[-0.03em] text-[#EEF4FF]">
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
                  'relative flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-left text-sm transition',
                  active
                    ? 'border border-[#C3D0E8]/45 text-[#EEF4FF]'
                    : 'text-[#C3D0E8]/55 hover:bg-white/[0.04] hover:text-[#EEF4FF]',
                )}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-3 left-2 size-1.5 rounded-full bg-[#c9b56a]"
                  />
                ) : null}
                <Icon
                  className={cn(
                    'size-4 shrink-0',
                    active ? 'text-[#c9b56a]' : 'text-[#C3D0E8]/55',
                  )}
                  strokeWidth={1.85}
                />
                <span className={active ? 'text-[#EEF4FF]' : undefined}>{item.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      <div className="space-y-3 px-2">
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-left text-sm text-[#C3D0E8]/70 transition hover:bg-white/[0.04] hover:text-[#EEF4FF]"
        >
          <CircleHelp className="size-4 text-[#C3D0E8]" strokeWidth={1.85} />
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
  breadcrumb: string | BreadcrumbCrumb[];
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
  const reduceMotion = useReducedMotion();

  if (variant === 'canvas') {
    return (
      <div className="dash-root dash-canvas relative flex h-svh overflow-hidden text-white">
        <AsciiField />
        <DashboardSidebar
          navItems={navItems}
          activeId={activeId}
          onSelect={onSelect}
          identity={identity}
          mode={mode}
          onModeChange={onModeChange}
          showModeToggle={false}
          className="relative z-20 border-r border-[#C3D0E8]/25 bg-[#03080b]"
        />

        <section
          className={cn(
            'relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[#03080b] px-3 pt-3 pb-2 sm:px-4 sm:pt-4 md:px-5',
            overviewScaled && 'dash-main--overview-scaled',
          )}
        >
          {hideHeader ? null : (
            <header className="sticky top-0 z-30 -mx-3 mb-4 flex items-center justify-between gap-4 bg-[#03080b] px-3 py-3 sm:-mx-4 sm:px-4 md:-mx-5">
              <DashboardBreadcrumb breadcrumb={breadcrumb} tone="canvas" />
              <DashboardUtilities
                searchPlaceholder={searchPlaceholder}
                identityTitle={identityTitle}
                mode={mode}
                onModeChange={onModeChange}
                density="regular"
              />
            </header>
          )}
          <DashPage pageKey={activeId || 'page'} reduceMotion={reduceMotion}>
            {children}
          </DashPage>
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
            <DashboardBreadcrumb breadcrumb={breadcrumb} tone="panel" />
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

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-7 md:py-7">
            <DashPage pageKey={activeId || 'page'} reduceMotion={reduceMotion}>
              {children}
            </DashPage>
          </div>
        </section>
      </div>
    </div>
  );
}

function DashPage({
  pageKey,
  reduceMotion,
  children,
}: {
  pageKey: string;
  reduceMotion: boolean | null;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
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
          className={cn('pointer-events-none absolute left-3 text-[#C3D0E8]/55', regular ? 'size-4' : 'size-3')}
          strokeWidth={1.75}
        />
        <input
          ref={inputRef}
          type="search"
          placeholder={searchPlaceholder}
          className={cn(
            'h-full w-full border border-[#C3D0E8]/45 bg-transparent text-[#EEF4FF] placeholder:text-[#C3D0E8]/45 focus:border-[#C3D0E8]/70 focus:outline-none',
            regular ? 'rounded-full pr-9 pl-10 text-sm' : 'rounded-full pr-8 pl-8 text-[8px]',
          )}
        />
        <kbd className={cn(
          'pointer-events-none absolute right-2 flex items-center justify-center rounded-full border border-[#C3D0E8]/35 bg-transparent font-medium text-[#C3D0E8]/55',
          regular ? 'h-5 min-w-5 px-1 text-[10px]' : 'h-4 min-w-4 px-1 text-[7px]',
        )}>
          /
        </kbd>
      </label>
      <button
        type="button"
        aria-label="Notifications"
        className={cn(
          'relative inline-flex items-center justify-center border border-[#C3D0E8]/45 bg-transparent text-[#C3D0E8] transition hover:border-[#C3D0E8]/70',
          regular ? 'size-10 rounded-full' : 'size-8 rounded-full',
        )}
      >
        <Bell className={regular ? 'size-4' : 'size-3.5'} />
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#c9b56a] ring-2 ring-[#03080b]" />
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
              : 'flex w-full items-center gap-3 rounded-[1.35rem] border border-[#C3D0E8]/45 bg-transparent px-3.5 py-3.5 text-left transition hover:bg-white/[0.04]'
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
            'absolute z-30 overflow-hidden rounded-[1.35rem] border border-[#C3D0E8]/45 bg-[#03080b] py-1 shadow-[0_16px_40px_rgba(3,8,11,0.45)]',
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
            <LogOut className="size-4 text-[#C3D0E8]" strokeWidth={1.85} />
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
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#C3D0E8]/45 text-[#C3D0E8]">
        <ShieldUser className="size-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[#EEF4FF]">{title}</p>
        {subtitle ? (
          <p className="truncate font-mono text-xs text-[#C3D0E8]/55" title={subtitle}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <ChevronsUpDown className="size-4 shrink-0 text-[#C3D0E8]" strokeWidth={2} />
    </>
  );
}
