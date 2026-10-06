import { BASE_URL, parseApi, unreachable } from './http';

export type DeveloperKey = {
  id: string;
  last_four: string;
  active: boolean;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  agent_id: string;
  agent_label: string;
  secret?: string;
};

async function cookieFetch<T>(path: string, init?: RequestInit): Promise<T> {
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

export const developerKeysApi = {
  list: () => cookieFetch<DeveloperKey[]>('/v1/developer/keys'),
  create: () =>
    cookieFetch<DeveloperKey>('/v1/developer/keys', { method: 'POST' }),
  revoke: (id: string) =>
    cookieFetch<DeveloperKey>(`/v1/developer/keys/${id}`, { method: 'DELETE' }),
};
