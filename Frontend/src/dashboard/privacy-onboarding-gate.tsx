import { useState } from 'react';

import { useWalletSession } from '../context/WalletContext';
import { hasPrivacyOnboarding } from '../lib/onboarding';
import { PrivacyOnboarding } from './privacy-onboarding';

export function PrivacyOnboardingGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useWalletSession();
  const [done, setDone] = useState(() =>
    session ? hasPrivacyOnboarding(session.wallet_address) : false,
  );

  if (!session) return null;
  if (!done && !hasPrivacyOnboarding(session.wallet_address)) {
    return <PrivacyOnboarding onDone={() => setDone(true)} />;
  }
  return <>{children}</>;
}
