import type { WalletSession } from './session';
import { listWorkspaces } from './workspaces';

const keyFor = (walletAddress: string) =>
  `hypertron:workspace-subscription:v1:${walletAddress}`;

export function hasWorkspaceSubscription(walletAddress: string): boolean {
  try {
    return localStorage.getItem(keyFor(walletAddress)) === '1';
  } catch {
    return false;
  }
}

export function subscribeToWorkspace(walletAddress: string) {
  localStorage.setItem(keyFor(walletAddress), '1');
}

export function canAccessWorkspaces(session: WalletSession): boolean {
  if (hasWorkspaceSubscription(session.wallet_address)) return true;
  return listWorkspaces(session).some((workspace) => {
    const seeded =
      workspace.id === session.business_id && /^untitled/i.test(workspace.name);
    return !seeded;
  });
}
