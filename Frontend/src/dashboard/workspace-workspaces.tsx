import {
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronRight,
  Clock3,
  Folder,
  LayoutGrid,
  Layers3,
  List,
  MoreHorizontal,
  Plus,
  Shield,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useWalletSession } from '../context/WalletContext';
import { sessionApi } from '../lib/session';
import {
  formatLastAccessed,
  listWorkspaces,
  touchWorkspace,
  type WorkspaceView,
} from '../lib/workspaces';
import { DashboardUtilities, type DashboardMode } from './chrome';
import { cn } from './cn';

export function WorkspaceWorkspaces({
  currentWorkspaceId,
  searchPlaceholder,
  identityTitle,
  onModeChange,
  breadcrumbVariant = 'personal',
}: {
  currentWorkspaceId?: string;
  searchPlaceholder: string;
  identityTitle: string;
  onModeChange?: (mode: DashboardMode) => void;
  breadcrumbVariant?: 'personal' | 'account';
}) {
  const { session, refresh } = useWalletSession();
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const workspaces = useMemo(
    () => (session ? listWorkspaces(session) : []),
    [session],
  );

  if (!session) return null;
  const current = session;

  async function openWorkspace(workspace: WorkspaceView) {
    if (openingId) return;
    setOpeningId(workspace.id);
    touchWorkspace(current, workspace.id);
    if (workspace.name && workspace.name !== current.name) {
      await sessionApi.updateMe({ name: workspace.name }).catch(() => undefined);
      await refresh().catch(() => undefined);
    }
    navigate(`/app/w/${workspace.id}`);
  }

  return (
    <div className="dash-workspaces flex w-full flex-col gap-4 pb-6">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <nav className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-white/45">
          {breadcrumbVariant === 'account' ? (
            <>
              <span className="text-white/55">Account</span>
              <ChevronRight className="size-3 text-white/30" strokeWidth={2} />
              <span className="font-medium text-white/80">Workspaces</span>
            </>
          ) : (
            <>
              <span className="text-white/55">Personal</span>
              <ChevronRight className="size-3 text-white/30" strokeWidth={2} />
              <span className="font-medium text-white/80">Workspaces</span>
            </>
          )}
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
        <h1 className="text-[clamp(22px,2.6vw,30px)] font-semibold tracking-tight text-white">
          Workspaces
        </h1>
        <p className="mt-1.5 text-[13px] text-white/45">
          Organize your payments, keys, and settings by workspace.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActionCard
          icon={Folder}
          title="Create a new workspace"
          description="Set up a workspace for your team or project."
        >
          <button
            type="button"
            onClick={() => navigate('/app/workspaces/new')}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#F3D28F]/60 bg-[#E7B66D] px-4 text-sm font-semibold text-[#1A1408] shadow-[0_8px_20px_rgba(231,182,109,0.28)] transition hover:bg-[#F0C77E]"
          >
            <Plus className="size-4" strokeWidth={2.25} />
            Create workspace
          </button>
        </ActionCard>

        <ActionCard
          icon={Layers3}
          title="Use a template"
          description="Get started with a pre-configured setup."
        >
          <div className="flex flex-wrap items-center gap-2">
            {['DAO', 'Web3 Startup', 'Agency', 'Foundation'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/60"
              >
                {tag}
              </span>
            ))}
            <button
              type="button"
              disabled
              aria-label="Templates coming soon"
              className="inline-flex size-9 cursor-not-allowed items-center justify-center rounded-full border border-white/10 text-white/30"
            >
              <ArrowRight className="size-4" strokeWidth={1.85} />
            </button>
          </div>
        </ActionCard>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Your workspaces</h2>
        </div>
        <div className="flex rounded-lg border border-white/10 bg-[#0a1426] p-0.5">
          <ViewButton
            label="Grid view"
            active={view === 'grid'}
            onClick={() => setView('grid')}
          >
            <LayoutGrid className="size-4" />
          </ViewButton>
          <ViewButton
            label="List view"
            active={view === 'list'}
            onClick={() => setView('list')}
          >
            <List className="size-4" />
          </ViewButton>
        </div>
      </div>

      <div
        className={
          view === 'grid'
            ? 'grid gap-5 md:grid-cols-1 xl:grid-cols-2'
            : 'flex flex-col gap-4'
        }
      >
        {workspaces.length === 0 ? (
          <div className="ov-card border-dashed px-6 py-12 text-center md:col-span-2">
            <BriefcaseBusiness className="mx-auto size-9 text-[#E7B66D]" />
            <p className="mt-3 text-sm font-semibold text-white">No workspaces yet</p>
            <p className="mt-1 text-sm text-white/45">Create your first workspace to get started.</p>
          </div>
        ) : (
          workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              active={Boolean(currentWorkspaceId && workspace.id === currentWorkspaceId)}
              onOpen={() => void openWorkspace(workspace)}
              compact={view === 'list'}
              opening={openingId === workspace.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Folder;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="ov-card relative min-h-[190px] overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -bottom-12 flex size-44 rotate-[-8deg] items-center justify-center rounded-[42px] border border-[#E7B66D]/15 bg-[#E7B66D]/[0.06] text-[#E7B66D]/50"
      >
        <Icon className="size-20" strokeWidth={1.2} />
      </div>
      <div className="relative z-10 flex min-h-[140px] max-w-[72%] flex-col items-start">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-5 text-white/45">{description}</p>
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
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md transition',
        active
          ? 'bg-[#E7B66D]/20 text-[#F3D28F]'
          : 'text-white/40 hover:text-white/70',
      )}
    >
      {children}
    </button>
  );
}

function WorkspaceCard({
  workspace,
  active,
  onOpen,
  compact,
  opening,
}: {
  workspace: WorkspaceView;
  active: boolean;
  onOpen: () => void;
  compact: boolean;
  opening: boolean;
}) {
  const { openTasks, pendingApprovals, complianceAlerts } = workspace.directory;

  if (compact) {
    return (
      <article
        className={cn(
          'workspace-card rounded-2xl border border-white/[0.08] bg-[#0d1525] p-5 md:grid md:grid-cols-[minmax(220px,0.95fr)_1.35fr_auto] md:items-center md:gap-4',
          active && 'border-[#E7B66D]/35 ring-1 ring-[#E7B66D]/20',
        )}
      >
        <WorkspaceCardHeader workspace={workspace} />
        <WorkspaceCardStats
          openTasks={openTasks}
          pendingApprovals={pendingApprovals}
          complianceAlerts={complianceAlerts}
          compact
        />
        <WorkspaceCardFooter
          workspace={workspace}
          onOpen={onOpen}
          opening={opening}
          compact
        />
      </article>
    );
  }

  return (
    <article
      className={cn(
        'workspace-card rounded-2xl border border-white/[0.08] bg-[#0d1525] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:border-white/15',
        active && 'border-[#E7B66D]/35 ring-1 ring-[#E7B66D]/20',
      )}
    >
      <WorkspaceCardHeader workspace={workspace} />
      <WorkspaceCardStats
        openTasks={openTasks}
        pendingApprovals={pendingApprovals}
        complianceAlerts={complianceAlerts}
      />
      <WorkspaceCardFooter workspace={workspace} onOpen={onOpen} opening={opening} />
    </article>
  );
}

function WorkspaceCardHeader({ workspace }: { workspace: WorkspaceView }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#060d1a] text-sm font-semibold text-[#E7B66D] ring-1 ring-white/10">
        {workspace.logoDataUrl ? (
          <img src={workspace.logoDataUrl} alt="" className="size-full object-cover" />
        ) : (
          workspace.initial
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2 pr-2">
          <h3 className="truncate text-[15px] font-semibold text-white">{workspace.name}</h3>
          <span className="rounded-full bg-[#E7B66D] px-2 py-0.5 text-[9px] font-bold tracking-[0.06em] text-[#1A1408] uppercase">
            {workspace.role}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-[#8E9BAE]">
          {workspace.tier} · {workspace.members}{' '}
          {workspace.members === 1 ? 'member' : 'members'}
        </p>
      </div>
      <button
        type="button"
        aria-label="Workspace options"
        className="-mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[#8E9BAE] transition hover:bg-white/[0.04] hover:text-white"
      >
        <MoreHorizontal className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function WorkspaceCardStats({
  openTasks,
  pendingApprovals,
  complianceAlerts,
  compact,
}: {
  openTasks: string;
  pendingApprovals: string;
  complianceAlerts: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-3 divide-x divide-white/[0.07]',
        compact ? 'md:border-x md:border-white/[0.07] md:px-2' : 'mt-6 py-1',
      )}
    >
      <WorkspaceStat value={openTasks} label="Open tasks" />
      <WorkspaceStat value={pendingApprovals} label="Pending approvals" />
      <WorkspaceStat value={complianceAlerts} label="Compliance alerts" />
    </div>
  );
}

function WorkspaceCardFooter({
  workspace,
  onOpen,
  opening,
  compact,
}: {
  workspace: WorkspaceView;
  onOpen: () => void;
  opening: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? 'md:px-1' : 'mt-6 border-t border-white/[0.07] pt-5')}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="inline-flex items-center gap-2 text-[#8E9BAE]">
            <Clock3 className="size-3.5 shrink-0" strokeWidth={1.75} />
            Last accessed
          </span>
          <span className="font-medium text-white">
            {formatLastAccessed(workspace.lastAccessedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="inline-flex items-center gap-2 text-[#8E9BAE]">
            <Shield className="size-3.5 shrink-0" strokeWidth={1.75} />
            Role
          </span>
          <span className="font-medium text-white">{workspace.role}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpen}
        disabled={opening}
        className={cn(
          'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#3d4f6f]/80 bg-[#080f1c] text-sm font-medium text-white transition hover:border-[#5a7096]/80 hover:bg-[#0a1426] disabled:opacity-50',
          compact ? 'mt-3' : 'mt-5',
        )}
      >
        {opening ? 'Opening…' : 'Open workspace'}
        {!opening ? <ArrowRight className="size-4 text-white/75" strokeWidth={1.85} /> : null}
      </button>
    </div>
  );
}

function WorkspaceStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 px-4 first:pl-0 last:pr-0">
      <p className="truncate text-[22px] font-semibold leading-none tabular-nums tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-[11px] leading-snug text-[#8E9BAE]">{label}</p>
    </div>
  );
}
