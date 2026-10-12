import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  LayoutGrid,
  Layers3,
  List,
  Plus,
  Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWalletSession } from "../../context/WalletContext";
import {
  activateWorkspace,
  formatLastAccessed,
  type WorkspaceRecord,
} from "../../lib/workspaces";

const BRAND_BUTTON_GRADIENT =
  "linear-gradient(90deg, #121F46 0%, #4A63BE 100%)";

export function HubWorkspaces({
  workspaces,
  query,
}: {
  workspaces: WorkspaceRecord[];
  query: string;
}) {
  const navigate = useNavigate();
  const { refresh } = useWalletSession();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? workspaces.filter((workspace) =>
        workspace.name.toLowerCase().includes(needle),
      )
    : workspaces;
  const greeting =
    workspaces[0]?.name.trim().split(/\s+/)[0] || "there";

  async function openWorkspace(id: string) {
    if (openingId) return;
    setOpeningId(id);
    setError(null);
    const result = await activateWorkspace(id);
    if (!result.ok) {
      setError(result.error);
      setOpeningId(null);
      return;
    }
    try {
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open workspace.");
      setOpeningId(null);
      return;
    }
    navigate("/app");
  }

  return (
    <div>
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-slate-950">
          Welcome back, {greeting}! <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a workspace to continue or create a new one.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ActionCard
          tone="blue"
          icon={BriefcaseBusiness}
          title="Create New Workspace"
          description="Start fresh and set up a new workspace for your team or organization."
        >
          <button
            type="button"
            onClick={() => navigate("/dashboard/workspaces/new")}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(18,31,70,0.28)] transition hover:brightness-110"
            style={{ backgroundImage: BRAND_BUTTON_GRADIENT }}
          >
            <Plus className="size-4" strokeWidth={2.25} />
            Create Workspace
          </button>
        </ActionCard>

        <ActionCard
          tone="peach"
          icon={Layers3}
          title="Quick Start with Template"
          description="Choose from pre-built templates tailored for Web3 companies."
          badge="Coming soon"
        >
          <div className="mb-4 flex flex-wrap gap-1.5">
            {["DAO", "Web3 Startup", "Agency", "Foundation"].map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-[#E7B66D]/40 bg-white/45 px-2 py-1 text-[10px] font-medium text-[#0F1939]/70"
              >
                {tag}
              </span>
            ))}
          </div>
          <button
            type="button"
            disabled
            className="inline-flex h-10 cursor-not-allowed items-center rounded-lg border border-[#E7B66D]/40 bg-white/40 px-4 text-sm font-semibold text-[#0F1939]/40"
          >
            Coming soon
          </button>
        </ActionCard>
      </div>

      <div className="mt-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            Your Workspaces
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">Recently accessed</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <ViewButton
            label="Grid view"
            active={view === "grid"}
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="size-4" />
          </ViewButton>
          <ViewButton
            label="List view"
            active={view === "list"}
            onClick={() => setView("list")}
          >
            <List className="size-4" />
          </ViewButton>
        </div>
      </div>

      {error ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {error}
        </p>
      ) : null}

      <div
        className={
          view === "grid"
            ? "mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            : "mt-5 flex flex-col gap-4"
        }
      >
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center md:col-span-2 xl:col-span-3">
            <BriefcaseBusiness className="mx-auto size-9 text-[#E7B66D]" />
            <p className="mt-3 text-sm font-semibold text-slate-800">
              {workspaces.length === 0 ? "No workspaces yet" : "No matches"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {workspaces.length === 0
                ? "Create your first workspace to get started."
                : "Try a different workspace name."}
            </p>
          </div>
        ) : (
          visible.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onOpen={() => void openWorkspace(workspace.id)}
              compact={view === "list"}
              opening={openingId === workspace.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ActionCard({
  tone,
  icon: Icon,
  title,
  description,
  badge,
  children,
}: {
  tone: "blue" | "peach";
  icon: typeof BriefcaseBusiness;
  title: string;
  description: string;
  badge?: string;
  children: ReactNode;
}) {
  const create = tone === "blue";

  return (
    <section
      className={[
        "relative min-h-[210px] overflow-hidden rounded-2xl border p-6",
        create
          ? "border-[#E7B66D]/35 bg-[linear-gradient(135deg,#fbf8f1_0%,#f4efe4_100%)]"
          : "border-[#E7B66D]/25 bg-[linear-gradient(135deg,#fffdf9_0%,#f8f0e2_100%)]",
      ].join(" ")}
    >
      <div
        aria-hidden
        className="absolute -right-10 -bottom-14 flex size-48 rotate-[-8deg] items-center justify-center rounded-[42px] bg-gradient-to-br from-white/90 to-[#E7B66D]/35 text-[#E7B66D]"
      >
        <Icon className="size-20 opacity-80" strokeWidth={1.4} />
      </div>

      <div className="relative z-10 flex min-h-[160px] max-w-[68%] flex-col items-start">
        <div className="flex items-start gap-2">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {badge ? (
            <span className="shrink-0 rounded-full bg-[#F8F0E2] px-2 py-1 text-[9px] font-semibold text-[#0F1939]">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
        <div className="mt-auto pt-4">{children}</div>
      </div>
    </section>
  );
}

function ViewButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={[
        "inline-flex size-8 items-center justify-center rounded-md transition",
        active
          ? "bg-white text-[#0F1939] shadow-sm"
          : "text-slate-400 hover:text-[#0F1939]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function WorkspaceCard({
  workspace,
  onOpen,
  compact,
  opening,
}: {
  workspace: WorkspaceRecord;
  onOpen: () => void;
  compact: boolean;
  opening: boolean;
}) {
  const initial = workspace.name.trim().slice(0, 1).toUpperCase() || "W";

  return (
    <article
      className={[
        "overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-[#E7B66D]/50",
        compact ? "md:grid md:grid-cols-[minmax(220px,0.9fr)_1.4fr_auto]" : "",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-3 bg-gradient-to-br from-[#F8F0E2] to-slate-50 px-5 py-5">
        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0F1939] text-sm font-semibold text-[#E7B66D]">
          {workspace.logoUrl ? (
            <img src={workspace.logoUrl} alt="" className="size-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold text-slate-950">
              {workspace.name}
            </h3>
            <span className="rounded-full border border-[#E7B66D]/40 bg-[#F8F0E2] px-2 py-0.5 text-[10px] font-semibold text-[#0F1939]">
              {workspace.role}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {workspace.tier} · {workspace.members}{" "}
            {workspace.members === 1 ? "member" : "members"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100 px-4 py-4 md:border-t-0">
        <WorkspaceStat value="0" label="Open Tasks" status="All clear" warn={false} />
        <WorkspaceStat value="0" label="Pending Approvals" status="—" warn={false} />
        <WorkspaceStat value="None" label="Compliance Alerts" status="All clear" warn={false} />
      </div>

      <div
        className={[
          "flex gap-3 p-4",
          compact ? "flex-col justify-center md:border-l md:border-slate-100" : "flex-col",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5 text-slate-400" />
            <span className="text-slate-500">Last accessed</span>
          </span>
          <span className="font-medium text-slate-700">
            {formatLastAccessed(workspace.lastAccessedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <Shield className="size-3.5 text-slate-400" />
            Role
          </span>
          <span className="font-semibold text-slate-700">{workspace.role}</span>
        </div>
        <button
          type="button"
          onClick={onOpen}
          disabled={opening}
          className="mt-1 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#F8F0E2] text-sm font-semibold text-[#0F1939] transition hover:bg-[#E7B66D]/25 disabled:opacity-60"
        >
          {opening ? "Opening…" : "Open Workspace"}
          {!opening ? <ArrowRight className="size-4" /> : null}
        </button>
      </div>
    </article>
  );
}

function WorkspaceStat({
  value,
  label,
  status,
  warn,
}: {
  value: string;
  label: string;
  status: string;
  warn: boolean;
}) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <p className="truncate text-lg font-semibold tabular-nums text-slate-950">
        {value}
      </p>
      <p className="mt-1 min-h-8 text-[11px] leading-4 text-slate-500">{label}</p>
      <p
        className={[
          "mt-1 truncate text-[9px] font-medium",
          warn ? "text-amber-600" : "text-emerald-600",
        ].join(" ")}
      >
        {status}
      </p>
    </div>
  );
}
