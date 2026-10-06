import type { PaymentIntent } from '../lib/api';
import { clockTime, money, STATUS_META } from '../lib/format';
import './Ledger.css';

export type LedgerView = 'business' | 'public';

interface Props {
  intents: PaymentIntent[];
  view: LedgerView;
  selectedId: string | null;
  onChangeView: (view: LedgerView) => void;
  onSelect: (id: string) => void;
}

/// The console's second thesis: the same ledger, seen two ways.
///
/// "What you see" is the business reading its own payments with its viewing
/// key. "What the chain shows" redacts exactly the fields a shielded
/// settlement withholds — counterparty, amount, and purpose — while leaving
/// the parts that genuinely are public. The claim becomes checkable instead of
/// asserted.
export function Ledger({
  intents,
  view,
  selectedId,
  onChangeView,
  onSelect,
}: Props) {
  const redacted = view === 'public';

  return (
    <section className="panel ledger" aria-labelledby="ledger-title">
      <div className="panel-head ledger-head">
        <div>
          <p className="eyebrow" id="ledger-title">
            Payments
          </p>
          <p className="ledger-sub">
            {redacted
              ? 'Everything an outside observer can determine'
              : 'Your view, unsealed with the business viewing key'}
          </p>
        </div>

        <div
          className="ledger-toggle"
          role="radiogroup"
          aria-label="Ledger visibility"
        >
          <button
            role="radio"
            aria-checked={!redacted}
            className={!redacted ? 'is-on' : ''}
            onClick={() => onChangeView('business')}
          >
            What you see
          </button>
          <button
            role="radio"
            aria-checked={redacted}
            className={redacted ? 'is-on is-shield' : ''}
            onClick={() => onChangeView('public')}
          >
            What the chain shows
          </button>
        </div>
      </div>

      {intents.length === 0 ? (
        <div className="panel-body ledger-empty">
          <p>No payments yet.</p>
          <p className="ledger-empty-hint">Request one to start the ledger.</p>
        </div>
      ) : (
        <div className={`ledger-table${redacted ? ' is-redacted' : ''}`}>
          <div className="ledger-row ledger-row-header" aria-hidden="true">
            <span>Time</span>
            <span>Payee</span>
            <span>Purpose</span>
            <span className="ledger-cell-right">Amount</span>
            <span>State</span>
          </div>

          <ul className="ledger-rows">
            {intents.map((intent) => {
              const meta = STATUS_META[intent.status];
              return (
                <li key={intent.id}>
                  <button
                    className={`ledger-row ledger-row-item${
                      selectedId === intent.id ? ' is-selected' : ''
                    }`}
                    onClick={() => onSelect(intent.id)}
                  >
                    <span className="ledger-time mono">
                      {clockTime(intent.created_at)}
                    </span>

                    <span className="ledger-payee">
                      {redacted ? (
                        <Redaction width={92} label="payee hidden" />
                      ) : (
                        intent.payee_ref
                      )}
                    </span>

                    <span className="ledger-purpose">
                      {redacted ? (
                        <Redaction width={74} label="purpose hidden" />
                      ) : (
                        (intent.reference ?? <span className="ledger-none">—</span>)
                      )}
                    </span>

                    <span className="ledger-amount ledger-cell-right figure">
                      {redacted ? (
                        <Redaction width={58} label="amount hidden" />
                      ) : (
                        money(intent.amount_minor, intent.currency)
                      )}
                    </span>

                    {/* State stays legible in both views: that a shielded
                        payment occurred is public, what it was is not. */}
                    <span className={`ledger-state ledger-state-${meta.tone}`}>
                      <span className="ledger-pip" aria-hidden="true" />
                      {meta.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {redacted && intents.length > 0 && (
        <p className="ledger-footnote">
          An observer learns that a shielded payment settled, and when. Not who
          was paid, how much, or what for.
        </p>
      )}
    </section>
  );
}

function Redaction({ width, label }: { width: number; label: string }) {
  return (
    <span className="redaction" style={{ width }} title={label}>
      <span className="sr-only">{label}</span>
    </span>
  );
}
