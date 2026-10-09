import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ensureShieldKeys } from '../lib/ensure-keys';
import { ApiError } from '../lib/http';
import { bytesToBase64, getPhantom } from '../lib/phantom';
import { sessionApi, type WalletSession } from '../lib/session';

type WalletState = {
  ready: boolean;
  session: WalletSession | null;
  error: string | null;
  signingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletSessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<WalletSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await sessionApi.me();
      try {
        const ensured = await ensureShieldKeys(next);
        setSession(ensured.session);
      } catch {
        setSession(next);
      }
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSession(null);
        return;
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const signIn = useCallback(async () => {
    const phantom = getPhantom();
    if (!phantom) {
      setError('Install the Phantom browser extension, then try again.');
      window.open('https://phantom.app/', '_blank', 'noopener,noreferrer');
      return;
    }

    setSigningIn(true);
    setError(null);
    try {
      const connected = await phantom.connect();
      const publicKey = connected.publicKey.toBase58();
      const challenge = await sessionApi.challenge(publicKey);
      const encoded = new TextEncoder().encode(challenge.message);
      const signed = await phantom.signMessage(encoded, 'utf8');
      const signatureBytes = signed instanceof Uint8Array ? signed : signed.signature;
      const next = await sessionApi.verify({
        publicKey,
        challengeId: challenge.challengeId,
        signature: bytesToBase64(signatureBytes),
      });
      try {
        const ensured = await ensureShieldKeys(next);
        setSession(ensured.session);
      } catch {
        setSession(next);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not sign in with Phantom.',
      );
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await sessionApi.logout().catch(() => undefined);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ ready, session, error, signingIn, signIn, signOut, refresh }),
    [ready, session, error, signingIn, signIn, signOut, refresh],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWalletSession(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWalletSession must be used inside WalletSessionProvider');
  }
  return ctx;
}
