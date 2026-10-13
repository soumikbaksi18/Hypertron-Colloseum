import {
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
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
import { canAccessWorkspaces } from '../lib/workspace-subscription';
import {
  formatLastAccessed,
  listWorkspaces,
  touchWorkspace,
  type WorkspaceView,
} from '../lib/workspaces';
import { cn } from './cn';

export function WorkspaceWorkspaces({
  currentWorkspaceId,
}: {
  currentWorkspaceId?: string;
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

  const unlocked = canAccessWorkspaces(current);

  async function openWorkspace(workspace: WorkspaceView) {
    if (!unlocked) {
      navigate('/app?tab=billing');
      return;
    }
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
      <div className="min-w-0">
        <h1 className="dash-display text-[clamp(2.4rem,4vw,3.4rem)] leading-[0.96] tracking-[-0.035em] text-[#EEF4FF]">
          Workspaces
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[#EEF4FF]/70">
          {unlocked
            ? 'Organize your payments, keys, and settings by workspace.'
            : 'Subscribe to open a workspace. Personal payments stay under App, then Personal.'}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row">
        <ActionCard
          icon={Folder}
          title="Create a new workspace"
          description="Set up a workspace for your team or project."
        >
          <button
            type="button"
            onClick={() => navigate('/app/workspaces/new')}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#ffe500] px-5 text-[13px] font-medium text-[#14110e] transition hover:bg-[#fff36a]"
          >
            <Plus className="size-4" strokeWidth={2.25} />
            Create workspace
          </button>
        </ActionCard>

        <ActionCard
          join
          icon={Layers3}
          title="Use a template"
          description="Get started with a pre-configured setup."
        >
          <div className="flex flex-wrap items-center gap-2">
            {['DAO', 'Web3 Startup', 'Agency', 'Foundation'].map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-2 rounded-full border border-[#C3D0E8]/45 bg-transparent px-3 py-1 text-[11px] tracking-[0.14em] text-[#C3D0E8] uppercase"
              >
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[#C3D0E8]" />
                {tag}
              </span>
            ))}
            <button
              type="button"
              disabled
              aria-label="Templates coming soon"
              className="inline-flex size-9 cursor-not-allowed items-center justify-center rounded-full border border-[#C3D0E8]/35 text-[#C3D0E8]/45"
            >
              <ArrowRight className="size-4" strokeWidth={1.85} />
            </button>
          </div>
        </ActionCard>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <h2 className="dash-display text-[clamp(1.6rem,2vw,2rem)] leading-[1.05] text-[#EEF4FF]">Your workspaces</h2>
        </div>
        <div className="flex rounded-full border border-[#C3D0E8]/45 p-0.5">
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

      <div className={view === 'grid' ? 'flex flex-col xl:flex-row' : 'flex flex-col'}>
        {workspaces.length === 0 ? (
          <div className="ov-card border-dashed px-10 py-16 text-center">
            <BriefcaseBusiness className="mx-auto size-9 text-[#C3D0E8]" />
            <p className="dash-display mt-3 text-[1.6rem] text-[#EEF4FF]">No workspaces yet</p>
            <p className="mt-2 text-sm text-[#C3D0E8]/55">Create your first workspace to get started.</p>
          </div>
        ) : (
          workspaces.map((workspace, index) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              active={Boolean(currentWorkspaceId && workspace.id === currentWorkspaceId)}
              onOpen={() => void openWorkspace(workspace)}
              compact={view === 'list'}
              opening={openingId === workspace.id}
              join={index > 0}
              locked={!unlocked}
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
  join = false,
  children,
}: {
  icon: typeof Folder;
  title: string;
  description: string;
  join?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.35rem] border border-[#C3D0E8]/45 bg-[#03080b] px-10 py-12 sm:px-12 sm:py-14 lg:px-14 lg:py-16',
        join && 'z-10 -mt-px bg-[#03080b] lg:mt-0 lg:-ml-px',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-6 right-6 text-[#C3D0E8]/35"
      >
        <Icon className="size-16" strokeWidth={1.15} />
      </div>
      <div className="relative z-10 flex min-h-[200px] max-w-[78%] flex-col items-start">
        <h2 className="dash-display max-w-[14ch] text-[clamp(1.55rem,2vw,2.05rem)] leading-[1.05] text-[#EEF4FF]">
          {title}
        </h2>
        <p className="mt-3 max-w-sm text-[14px] leading-[1.65] text-[#C3D0E8]/55">{description}</p>
        <div className="mt-auto pt-8">{children}</div>
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
        'inline-flex size-8 items-center justify-center rounded-full transition',
        active
          ? 'bg-[#ffe500] text-[#14110e]'
          : 'text-[#C3D0E8]/55 hover:text-[#EEF4FF]',
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
  join,
  locked,
}: {
  workspace: WorkspaceView;
  active: boolean;
  onOpen: () => void;
  compact: boolean;
  opening: boolean;
  join: boolean;
  locked: boolean;
}) {
  const { openTasks, pendingApprovals, complianceAlerts } = workspace.directory;

  if (compact) {
    return (
      <article
        className={cn(
          'workspace-card min-w-0 flex-1 rounded-[1.35rem] border border-[#C3D0E8]/45 bg-[#03080b] p-8 sm:p-10 md:grid md:grid-cols-[minmax(220px,0.95fr)_1.35fr_auto] md:items-center md:gap-4',
          join && (compact ? 'z-10 -mt-px' : 'z-10 -mt-px xl:mt-0 xl:-ml-px'),
          active && 'border-[#c9b56a]/70',
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
          locked={locked}
          compact
        />
      </article>
    );
  }

  return (
    <article
      className={cn(
        'workspace-card min-w-0 flex-1 rounded-[1.35rem] border border-[#C3D0E8]/45 bg-[#03080b] p-8 transition hover:bg-[#071018] sm:p-10',
        join && 'z-10 -mt-px xl:mt-0 xl:-ml-px',
        active && 'border-[#c9b56a]/70',
      )}
    >
      <WorkspaceCardHeader workspace={workspace} />
      <WorkspaceCardStats
        openTasks={openTasks}
        pendingApprovals={pendingApprovals}
        complianceAlerts={complianceAlerts}
      />
      <WorkspaceCardFooter workspace={workspace} onOpen={onOpen} opening={opening} locked={locked} />
    </article>
  );
}

function WorkspaceCardHeader({ workspace }: { workspace: WorkspaceView }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#C3D0E8]/45 text-sm text-[#EEF4FF]">
        {workspace.logoDataUrl ? (
          <img src={workspace.logoDataUrl} alt="" className="size-full object-cover" />
        ) : (
          workspace.initial
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2 pr-2">
          <h3 className="dash-display truncate text-[1.35rem] leading-none text-[#EEF4FF]">{workspace.name}</h3>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#C3D0E8]/45 bg-transparent px-2.5 py-1 text-[11px] tracking-[0.14em] text-[#C3D0E8] uppercase">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[#C3D0E8]" />
            {workspace.role}
          </span>
        </div>
        <p className="mt-2 text-[13px] text-[#C3D0E8]/55">
          {workspace.tier} · {workspace.members}{' '}
          {workspace.members === 1 ? 'member' : 'members'}
        </p>
      </div>
      <button
        type="button"
        aria-label="Workspace options"
        className="-mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#C3D0E8]/55 transition hover:bg-white/[0.04] hover:text-[#EEF4FF]"
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
        'grid grid-cols-3 divide-x divide-[#C3D0E8]/25',
        compact ? 'md:border-x md:border-[#C3D0E8]/25 md:px-2' : 'mt-6 py-1',
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
  locked,
  compact,
}: {
  workspace: WorkspaceView;
  onOpen: () => void;
  opening: boolean;
  locked?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? 'md:px-1' : 'mt-6 border-t border-[#C3D0E8]/25 pt-5')}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="inline-flex items-center gap-2 text-[#C3D0E8]/55">
            <Clock3 className="size-3.5 shrink-0" strokeWidth={1.75} />
            Last accessed
          </span>
          <span className="text-[#EEF4FF]">
            {formatLastAccessed(workspace.lastAccessedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="inline-flex items-center gap-2 text-[#C3D0E8]/55">
            <Shield className="size-3.5 shrink-0" strokeWidth={1.75} />
            Role
          </span>
          <span className="text-[#EEF4FF]">{workspace.role}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpen}
        disabled={opening}
        className={cn(
          'inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#C3D0E8]/45 bg-transparent text-sm text-[#EEF4FF] transition hover:bg-white/[0.04] disabled:opacity-50',
          compact ? 'mt-3' : 'mt-5',
        )}
      >
        {opening ? 'Opening…' : locked ? 'Subscribe to open' : 'Open workspace'}
        {!opening ? <ArrowRight className="size-4 text-[#C3D0E8]" strokeWidth={1.85} /> : null}
      </button>
    </div>
  );
}

function WorkspaceStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 px-4 first:pl-0 last:pr-0">
      <p className="dash-display truncate text-[1.7rem] leading-none tabular-nums text-[#EEF4FF]">
        {value}
      </p>
      <p className="mt-2 text-[11px] leading-snug tracking-[0.08em] text-[#C3D0E8]/55 uppercase">{label}</p>
    </div>
  );
}
