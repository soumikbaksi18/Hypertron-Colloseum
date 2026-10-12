import { ApiError, BASE_URL, parseApi, unreachable } from './http';

export type WorkspaceRecord = {
  id: string;
  name: string;
  workspaceType: string | null;
  website: string | null;
  teamSize: string | null;
  logoUrl: string | null;
  tier: string;
  role: 'Owner';
  members: number;
  lastAccessedAt: string;
  createdAt: string;
};

export type WorkspaceCreateInput = {
  name: string;
  workspaceType: string;
  website?: string;
  teamSize?: string;
  logoDataUrl?: string;
  logoName?: string;
  companyContext?: string;
  invitedMembers?: Array<{
    email: string;
    nickname: string;
    role: string;
    permission: string;
  }>;
};

async function workspaceFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    unreachable();
  }
  return parseApi<T>(response);
}

function fail(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export async function listWorkspaces(): Promise<
  { ok: true; workspaces: WorkspaceRecord[] } | { ok: false; error: string }
> {
  try {
    const json = await workspaceFetch<{ workspaces: WorkspaceRecord[] }>('/v1/workspaces');
    return { ok: true, workspaces: json.workspaces ?? [] };
  } catch (err) {
    return { ok: false, error: fail(err, 'Could not load workspaces.') };
  }
}

export async function createWorkspace(
  input: WorkspaceCreateInput,
): Promise<{ ok: true; workspace: WorkspaceRecord } | { ok: false; error: string }> {
  try {
    const json = await workspaceFetch<{ workspace: WorkspaceRecord }>('/v1/workspaces', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!json.workspace?.id) {
      return { ok: false, error: 'Could not create workspace.' };
    }
    return { ok: true, workspace: json.workspace };
  } catch (err) {
    return { ok: false, error: fail(err, 'Could not create workspace.') };
  }
}

export async function activateWorkspace(
  workspaceId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await workspaceFetch<{ ok: boolean }>(
      `/v1/workspaces/${encodeURIComponent(workspaceId)}/activate`,
      { method: 'POST' },
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: fail(err, 'Could not open workspace.') };
  }
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
