import { LifecycleTrace } from '../../components/LifecycleTrace';
import { useConsoleContext } from '../../context/ConsoleContext';

export function ApprovalsPage() {
  const { selected, deciding, decide, intents, select } = useConsoleContext();

  const queue = intents.filter(
    (intent) =>
      intent.status === 'requires_approval' ||
      intent.status === 'authorized' ||
      intent.status === 'settling' ||
      intent.status === 'settled' ||
      intent.status === 'denied' ||
      intent.status === 'failed',
  );

  return (
    <div className="app-page-grid">
        <div className="panel">
          <div className="panel-head">
            <p className="eyebrow">Queue</p>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {queue.length === 0 ? (
              <p style={{ margin: 0, padding: '1rem', color: 'var(--ink-faint)' }}>
                No intents yet. Request a payment first.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {queue.map((intent) => (
                  <li key={intent.id}>
                    <button
                      type="button"
                      onClick={() => select(intent.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.85rem 1rem',
                        borderBottom: '1px solid var(--line)',
                        background:
                          selected?.id === intent.id
                            ? 'rgba(59, 130, 246, 0.1)'
                            : 'transparent',
                      }}
                    >
                      <span className="mono" style={{ fontSize: '0.95rem', color: 'var(--ink-faint)' }}>
                        {intent.id.slice(0, 12)}…
                      </span>
                      <br />
                      <strong>{intent.payee_ref}</strong>
                      <span style={{ float: 'right', fontFamily: 'var(--mono)', fontSize: '1rem' }}>
                        {intent.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <LifecycleTrace
          intent={selected}
          deciding={deciding}
          onDecide={decide}
        />
      </div>
  );
}
