import { useState } from 'react';

import { AuthorityRail } from './components/AuthorityRail';
import { IntentComposer } from './components/IntentComposer';
import { KeyGate } from './components/KeyGate';
import { Ledger, type LedgerView } from './components/Ledger';
import { LifecycleTrace } from './components/LifecycleTrace';
import { Masthead } from './components/Masthead';
import { ReconciliationFeed } from './components/ReconciliationFeed';
import { useConsole } from './hooks/useConsole';
import './App.css';

export default function App() {
  const console_ = useConsole();
  const [view, setView] = useState<LedgerView>('business');

  if (!console_.ready) {
    return <div className="boot" />;
  }

  if (!console_.apiKey || !console_.profile) {
    return <KeyGate error={console_.gateError} onSubmit={console_.signIn} />;
  }

  return (
    <div className="console">
      <Masthead
        profile={console_.profile}
        live={console_.live}
        onSignOut={console_.signOut}
      />

      <AuthorityRail profile={console_.profile} intents={console_.intents} />

      {console_.actionError && (
        <div className="console-alert" role="alert">
          <span>{console_.actionError}</span>
          <button onClick={console_.dismissActionError}>Dismiss</button>
        </div>
      )}

      <main className="console-grid">
        <div className="console-column">
          <IntentComposer
            profile={console_.profile}
            busy={console_.submitting}
            onSubmit={console_.requestPayment}
          />
          <ReconciliationFeed events={console_.webhooks} />
        </div>

        <div className="console-column">
          <LifecycleTrace
            intent={console_.selected}
            deciding={console_.deciding}
            onDecide={console_.decide}
          />
        </div>

        <div className="console-column console-column-wide">
          <Ledger
            intents={console_.intents}
            view={view}
            selectedId={console_.selectedId}
            onChangeView={setView}
            onSelect={console_.select}
          />
        </div>
      </main>

      <footer className="console-foot">
        <p>
          Settlement runs against a mock shielded pool. The BN254 Groth16 Anchor
          program replaces it behind the same interface — the agent contract does
          not change.
        </p>
      </footer>
    </div>
  );
}
