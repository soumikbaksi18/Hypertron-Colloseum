import type { PaymentIntent } from '../lib/api';
import { humanizeReason, money, STATUS_META, truncateHash } from '../lib/format';
import './LifecycleTrace.css';

interface Props {
  intent: PaymentIntent | null;
  onDecide: (id: string, action: 'approve' | 'deny') => void;
  deciding: boolean;
}

/// The five stages every payment passes through. This is a genuine sequence,
/// which is why it is numbered and why the stages are fixed rather than
/// derived from whatever happened to arrive.
const STAGES = [
  { key: 'requested', label: 'Requested', note: 'The agent asked to pay' },
  { key: 'policy', label: 'Policy checked', note: 'Limits and payee verified' },
  { key: 'authorized', label: 'Authorized', note: 'Cleared to move money' },
  { key: 'settling', label: 'Settled privately', note: 'Executed in the pool' },
  { key: 'reconciled', label: 'Receipt issued', note: 'Machine-readable result' },
] as const;

type StageState = 'done' | 'active' | 'blocked' | 'stopped' | 'pending';

/// A stage that gets interrupted must not keep its optimistic copy — an
/// amber square next to "Authorized · cleared to move money" says the
/// opposite of what actually happened.
const INTERRUPTED_COPY: Partial<
  Record<string, Partial<Record<StageState, { label: string; note: string }>>>
> = {
  policy: {
    stopped: { label: 'Policy refused', note: 'The payment never left' },
  },
  authorized: {
    blocked: { label: 'Held for approval', note: 'Past the autonomous ceiling' },
    stopped: { label: 'Not authorized', note: 'Policy stopped it here' },
  },
  settling: {
    stopped: { label: 'Settlement failed', note: 'No funds moved' },
  },
};

function stageStates(intent: PaymentIntent): StageState[] {
  const { status } = intent;

  if (status === 'denied') {
    return ['done', 'stopped', 'pending', 'pending', 'pending'];
  }
  if (status === 'requires_authorization') {
    return ['done', 'active', 'pending', 'pending', 'pending'];
  }
  if (status === 'requires_approval') {
    return ['done', 'done', 'blocked', 'pending', 'pending'];
  }
  if (status === 'authorized') {
    return ['done', 'done', 'done', 'active', 'pending'];
  }
  if (status === 'settling') {
    return ['done', 'done', 'done', 'active', 'pending'];
  }
  if (status === 'settled') {
    return ['done', 'done', 'done', 'done', 'done'];
  }
  if (status === 'failed') {
    return ['done', 'done', 'done', 'stopped', 'pending'];
  }
  return ['done', 'done', 'stopped', 'pending', 'pending'];
}

export function LifecycleTrace({ intent, onDecide, deciding }: Props) {
  if (!intent) {
    return (
      <section className="panel trace" aria-labelledby="trace-title">
        <div className="panel-head">
          <p className="eyebrow" id="trace-title">
            Live trace
          </p>
        </div>
        <div className="panel-body trace-empty">
          <p>No payment in flight.</p>
          <p className="trace-empty-hint">
            Request one and watch it move through policy into private
            settlement.
          </p>
        </div>
      </section>
    );
  }

  const states = stageStates(intent);
  const meta = STATUS_META[intent.status];

  return (
    <section className="panel trace" aria-labelledby="trace-title">
      <div className="panel-head">
        <p className="eyebrow" id="trace-title">
          Live trace
        </p>
        <span className={`trace-status trace-status-${meta.tone}`}>
          {meta.label}
        </span>
      </div>

      <div className="trace-summary">
        <p className="trace-amount figure">
          {money(intent.amount_minor, intent.currency)}
        </p>
        <p className="trace-meta">
          to <strong>{intent.payee_ref}</strong>
          {intent.reference && <> · {intent.reference}</>}
        </p>
        <p className="trace-id mono">{intent.id}</p>
      </div>

      <ol className="trace-stages">
        {STAGES.map((stage, index) => {
          const state = states[index];
          const copy = INTERRUPTED_COPY[stage.key]?.[state] ?? stage;
          return (
            <li key={stage.key} className={`trace-stage is-${state}`}>
              <span className="trace-stage-index mono">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="trace-stage-node" aria-hidden="true" />
              <span className="trace-stage-copy">
                <span className="trace-stage-label">{copy.label}</span>
                <span className="trace-stage-note">{copy.note}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {intent.authorization.reasons.length > 0 && (
        <div className="trace-reasons">
          <p className="eyebrow">Why</p>
          <ul>
            {intent.authorization.reasons.map((reason) => {
              const { code, detail } = humanizeReason(reason);
              return (
                <li key={reason}>
                  <span className="trace-reason-code">{code}</span>
                  {detail && <span className="trace-reason-detail mono">{detail}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {intent.status === 'requires_approval' && (
        <div className="trace-decision">
          <p className="trace-decision-ask">
            This payment is larger than the agent may send on its own.
          </p>
          <div className="trace-decision-actions">
            <button
              className="trace-approve"
              disabled={deciding}
              onClick={() => onDecide(intent.id, 'approve')}
            >
              {deciding ? 'Approving…' : 'Approve payment'}
            </button>
            <button
              className="trace-deny"
              disabled={deciding}
              onClick={() => onDecide(intent.id, 'deny')}
            >
              Deny
            </button>
          </div>
        </div>
      )}

      {intent.settlement.settlement_id && (
        <div className="trace-receipt">
          <p className="eyebrow">Receipt</p>
          <dl className="trace-receipt-grid">
            <div>
              <dt>Settlement</dt>
              <dd className="mono">{intent.settlement.settlement_id}</dd>
            </div>
            <div>
              <dt>Commitment</dt>
              <dd className="mono">
                {truncateHash(intent.settlement.commitment ?? '')}
              </dd>
            </div>
            <div>
              <dt>Transaction</dt>
              <dd className="mono">
                {truncateHash(intent.settlement.tx_signature ?? '')}
              </dd>
            </div>
            <div>
              <dt>Your view key</dt>
              <dd className="mono trace-receipt-shield">
                {intent.settlement.view_key_hint}
              </dd>
            </div>
          </dl>
          <p className="trace-receipt-note">
            The agent received exactly this — no proof, no note, no nullifier
            preimage. The view key is how you find this payment again.
          </p>
        </div>
      )}

      {intent.failure && (
        <div className="trace-failure">
          <p className="eyebrow">Failed</p>
          <p>{intent.failure.message || intent.failure.code}</p>
        </div>
      )}
    </section>
  );
}
