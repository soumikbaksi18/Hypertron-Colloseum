import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChevronsUpDown,
  CircleHelp,
  Search,
  ShieldUser,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { HypertronLogoMark } from "./hypertron-logo-mark";

export type DashboardNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export function DashboardChrome({
  navItems,
  activeId,
  onSelect,
  breadcrumb,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  identityTitle,
  identitySubtitle,
  children,
}: {
  navItems: DashboardNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  breadcrumb: string;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  identityTitle: string;
  identitySubtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="account-shell relative min-h-svh overflow-hidden bg-[#0F1939] text-white">
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
        <aside className="flex w-[220px] shrink-0 flex-col py-2 pb-10 pl-1">
          <Link to="/dashboard" className="flex items-center gap-2.5 px-3 pt-2">
            <HypertronLogoMark size={32} />
            <span className="font-display text-[15px] font-semibold tracking-tight text-white">
              Hypertron
            </span>
          </Link>

          <div className="mt-5 px-3">
            <label className="relative flex h-10 items-center rounded-full border border-white/10 bg-white/[0.06]">
              <Search
                className="pointer-events-none absolute left-3.5 size-4 text-white/45"
                strokeWidth={1.75}
              />
              <input
                type="search"
                placeholder="Search"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                className="h-full w-full rounded-full bg-transparent pr-10 pl-10 text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              <kbd className="pointer-events-none absolute right-2 flex h-6 min-w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-1.5 text-[11px] font-medium text-white/40">
                /
              </kbd>
            </label>
          </div>

          <nav className="mt-5 flex flex-1 flex-col gap-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={[
                    "relative flex h-10 items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium transition",
                    active
                      ? "bg-gradient-to-r from-[#E7B66D]/22 via-[#E7B66D]/10 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(231,182,109,0.28)]"
                      : "text-white/55 hover:bg-white/[0.05] hover:text-white",
                  ].join(" ")}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[#E7B66D] shadow-[0_0_12px_rgba(231,182,109,0.65)]"
                    />
                  ) : null}
                  <Icon
                    className={[
                      "size-4 shrink-0",
                      active ? "text-[#E7B66D]" : "text-white/45",
                    ].join(" ")}
                    strokeWidth={1.85}
                  />
                  <span className={active ? "text-white" : undefined}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="space-y-3 px-2">
            <button
              type="button"
              className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-white"
            >
              <CircleHelp
                className="size-4 text-[#E7B66D]"
                strokeWidth={1.85}
              />
              Help &amp; Support
            </button>

            <button
              type="button"
              onClick={() => onSelect("settings")}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 text-left shadow-[inset_0_0_0_1px_rgba(231,182,109,0.08)] transition hover:bg-white/[0.09]"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#4A63BE]/25 text-[#E7B66D] ring-1 ring-[#E7B66D]/25">
                <ShieldUser className="size-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {identityTitle}
                </p>
                {identitySubtitle ? (
                  <p
                    className="truncate font-mono text-xs text-white/45"
                    title={identitySubtitle}
                  >
                    {identitySubtitle}
                  </p>
                ) : null}
              </div>
              <ChevronsUpDown
                className="size-4 shrink-0 text-[#E7B66D]"
                strokeWidth={2}
              />
            </button>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-[#f7f8fb] text-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 md:px-6">
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
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                  className="h-full w-full rounded-full bg-transparent pr-9 pl-9 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
                <kbd className="pointer-events-none absolute right-2 flex h-5 min-w-5 items-center justify-center rounded border border-slate-200 bg-white px-1 text-[10px] font-medium text-slate-400">
                  /
                </kbd>
              </label>
              <button
                type="button"
                aria-label="Notifications"
                className="relative inline-flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500"
              >
                <Bell className="size-4" />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-7 md:py-7">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
