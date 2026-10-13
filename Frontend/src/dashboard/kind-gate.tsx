import { useState } from 'react';

import { useWalletSession } from '../context/WalletContext';
import { setAccountKind, type AccountKind } from '../lib/account-kind';
import { sessionApi } from '../lib/session';
import { AccountKindSetup } from './account-kind-setup';

export function KindGate({
  onChosen,
}: {
  onChosen: (kind: AccountKind) => void;
}) {
  const { session, refresh } = useWalletSession();
  const [selected, setSelected] = useState<AccountKind>('individual');
  const [busy, setBusy] = useState(false);

  if (!session) return null;
  const current = session;

  async function confirm() {
    if (!selected || busy) return;
    setBusy(true);
    setAccountKind(current.wallet_address, selected);
    if (selected === 'individual') {
      const name = (current.name ?? '').trim();
      if (!name || /^untitled/i.test(name)) {
        await sessionApi.updateMe({ name: 'Personal' }).catch(() => undefined);
        await refresh().catch(() => undefined);
      }
    }
    onChosen(selected);
  }

  return (
    <AccountKindSetup
      selected={selected}
      onSelect={setSelected}
      onContinue={() => void confirm()}
      continueDisabled={!selected}
      continueBusy={busy}
    />
  );
}
