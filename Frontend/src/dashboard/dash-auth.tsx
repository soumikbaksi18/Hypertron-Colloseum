import type { ReactNode } from 'react';

import { PhantomGate } from '../components/PhantomGate';
import { useWalletSession } from '../context/WalletContext';
import './dashboard.css';

export function DashAuth({ children }: { children: ReactNode }) {
  const { ready, session } = useWalletSession();

  if (!ready) {
    return <div className="boot" />;
  }

  if (!session) {
    return <PhantomGate />;
  }

  return <>{children}</>;
}
