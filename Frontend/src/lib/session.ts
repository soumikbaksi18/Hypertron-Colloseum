import { BASE_URL, parseApi, unreachable } from './http';

export type WalletSession = {
  auth: 'wallet';
  business_id: string;
  name: string;
  wallet_address: string;
  payout_address: string | null;
  workspace_ready: boolean;
};

export type AuthChallenge = {
  challengeId: string;
  message: string;
  expiresAt: string;
  signIn: {
    domain: string;
    statement: string;
    uri: string;
    version: '1';
    nonce: string;
    issuedAt: string;
  };
};

async function sessionFetch<T>(path: string, init?: RequestInit): Promise<T> {
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

export const sessionApi = {
  challenge: (body: { domain: string; uri: string }) =>
    sessionFetch<AuthChallenge>('/v1/auth/challenge', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verify: (body: {
    publicKey: string;
    challengeId: string;
    signature: string;
    signedMessage: string;
  }) =>
    sessionFetch<WalletSession>('/v1/auth/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () => sessionFetch<WalletSession>('/v1/auth/me'),

  logout: () =>
    sessionFetch<{ ok: boolean }>('/v1/auth/logout', { method: 'POST' }),

  updateMe: (body: { name?: string; payoutAddress?: string }) =>
    sessionFetch<WalletSession>('/v1/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
