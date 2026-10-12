import type { WalletSession } from './session';

export type AccountKind = 'business' | 'individual';

export type LocalWorkspace = {
  id: string;
  name: string;
  accountKind: AccountKind;
  workspaceType: string;
  website: string;
  teamSize: string;
  logoDataUrl: string;
  members: number;
  role: 'Owner';
  tier: 'Starter';
  createdAt: string;
  lastAccessedAt: string;
};

export type WorkspaceView = LocalWorkspace & {
  initial: string;
  directory: {
    openTasks: string;
    pendingApprovals: string;
    complianceAlerts: string;
  };
};

const STORAGE_PREFIX = 'hypertron:workspaces:v1:';
const ACTIVE_KEY = 'hypertron:active-workspace';

function storageKey(walletAddress: string) {
  return `${STORAGE_PREFIX}${walletAddress}`;
}

function isUntitled(name: string) {
  const trimmed = name.trim().toLowerCase();
  return (
    !trimmed ||
    trimmed === 'untitled business' ||
    trimmed === 'untitled workspace'
  );
}

function readList(walletAddress: string): LocalWorkspace[] {
  try {
    const raw = localStorage.getItem(storageKey(walletAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalWorkspace[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(walletAddress: string, workspaces: LocalWorkspace[]) {
  localStorage.setItem(storageKey(walletAddress), JSON.stringify(workspaces));
}

export function seedFromSession(session: WalletSession): LocalWorkspace[] {
  const existing = readList(session.wallet_address);
  if (existing.some((workspace) => workspace.id === session.business_id)) {
    return existing;
  }
  const now = new Date().toISOString();
  const seeded: LocalWorkspace = {
    id: session.business_id,
    name: isUntitled(session.name ?? '')
      ? 'Untitled workspace'
      : session.name.trim(),
    accountKind: 'business',
    workspaceType: 'web3-startup',
    website: '',
    teamSize: '1-5',
    logoDataUrl: '',
    members: 1,
    role: 'Owner',
    tier: 'Starter',
    createdAt: now,
    lastAccessedAt: now,
  };
  const next = [seeded, ...existing];
  writeList(session.wallet_address, next);
  return next;
}

export function listWorkspaces(session: WalletSession): WorkspaceView[] {
  return seedFromSession(session).map(toView);
}

export function getWorkspace(
  session: WalletSession,
  workspaceId: string,
): WorkspaceView | null {
  const match = seedFromSession(session).find((row) => row.id === workspaceId);
  return match ? toView(match) : null;
}

export function getActiveWorkspaceId(session: WalletSession): string | null {
  const stored = localStorage.getItem(ACTIVE_KEY);
  const workspaces = seedFromSession(session);
  if (stored && workspaces.some((row) => row.id === stored)) return stored;
  return workspaces[0]?.id ?? null;
}

export function setActiveWorkspaceId(workspaceId: string) {
  localStorage.setItem(ACTIVE_KEY, workspaceId);
}

export type WorkspaceDraftInput = {
  accountKind: AccountKind;
  name: string;
  workspaceType: string;
  website?: string;
  teamSize?: string;
  logoDataUrl?: string;
  invitedCount?: number;
};

export function saveWorkspace(
  session: WalletSession,
  input: WorkspaceDraftInput,
): LocalWorkspace {
  const list = seedFromSession(session);
  const now = new Date().toISOString();
  const name = input.name.trim() || 'Untitled workspace';
  const members = 1 + Math.max(0, input.invitedCount ?? 0);

  const untitledPrimary = list.find(
    (row) => row.id === session.business_id && isUntitled(row.name),
  );

  if (untitledPrimary && list.length === 1) {
    const updated: LocalWorkspace = {
      ...untitledPrimary,
      name,
      accountKind: input.accountKind,
      workspaceType: input.workspaceType || untitledPrimary.workspaceType,
      website: input.website?.trim() ?? '',
      teamSize: input.teamSize ?? untitledPrimary.teamSize,
      logoDataUrl: input.logoDataUrl ?? '',
      members,
      lastAccessedAt: now,
    };
    writeList(session.wallet_address, [updated]);
    setActiveWorkspaceId(updated.id);
    return updated;
  }

  const created: LocalWorkspace = {
    id: crypto.randomUUID(),
    name,
    accountKind: input.accountKind,
    workspaceType: input.workspaceType || 'web3-startup',
    website: input.website?.trim() ?? '',
    teamSize: input.teamSize ?? '1-5',
    logoDataUrl: input.logoDataUrl ?? '',
    members,
    role: 'Owner',
    tier: 'Starter',
    createdAt: now,
    lastAccessedAt: now,
  };
  writeList(session.wallet_address, [created, ...list]);
  setActiveWorkspaceId(created.id);
  return created;
}

export function touchWorkspace(session: WalletSession, workspaceId: string) {
  const list = seedFromSession(session);
  const next = list.map((row) =>
    row.id === workspaceId
      ? { ...row, lastAccessedAt: new Date().toISOString() }
      : row,
  );
  writeList(session.wallet_address, next);
  setActiveWorkspaceId(workspaceId);
}

export function toView(workspace: LocalWorkspace): WorkspaceView {
  return {
    ...workspace,
    initial: workspace.name.trim().slice(0, 1).toUpperCase() || 'W',
    directory: {
      openTasks: '0',
      pendingApprovals: '0',
      complianceAlerts: 'None',
    },
  };
}

export function formatLastAccessed(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Recently';
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
