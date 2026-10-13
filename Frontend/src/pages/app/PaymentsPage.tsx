import { useState } from 'react';

import { Ledger, type LedgerView } from '../../components/Ledger';
import { useConsoleContext } from '../../context/ConsoleContext';

export function PaymentsPage() {
  const { intents, selectedId, select } = useConsoleContext();
  const [view, setView] = useState<LedgerView>('business');

  return (
    <div className="app-page-body">
        <Ledger
          intents={intents}
          view={view}
          selectedId={selectedId}
          onChangeView={setView}
          onSelect={select}
        />
    </div>
  );
}
