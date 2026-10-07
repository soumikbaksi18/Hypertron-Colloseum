import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ApiError } from '../lib/http';
import {
  PHANTOM_INSTALL_URL,
  runPhantomSignInFlow,
  type PhantomSignInResult,
} from '../lib/phantom-sign-in';
import { sessionApi, type WalletSession } from '../lib/session';

type WalletState = {
  ready: boolean;
  session: WalletSession | null;
  error: string | null;
  signingIn: boolean;
  signIn: (onStatus?: (message: string) => void) => Promise<PhantomSignInResult>;
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
      setSession(next);
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

  const signIn = useCallback(async (onStatus?: (message: string) => void) => {
    setSigningIn(true);
    setError(null);
    try {
      const result = await runPhantomSignInFlow(onStatus);
      if (result.ok) {
        setSession(result.session);
        return result;
      }
      setError(result.error);
      if (result.needsInstall) {
        window.open(PHANTOM_INSTALL_URL, '_blank', 'noopener,noreferrer');
      }
      return result;
    } catch (err) {
      const error =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not sign in with Phantom.';
      setError(error);
      return { ok: false as const, error };
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
