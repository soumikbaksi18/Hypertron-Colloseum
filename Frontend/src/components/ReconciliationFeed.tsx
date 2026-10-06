import type { ReceivedWebhook } from '../lib/api';
import { clockTime } from '../lib/format';
import './ReconciliationFeed.css';

interface Props {
  events: ReceivedWebhook[];
}

/// What the business's accounting system actually received. Each row is a
/// signed webhook, and the signature column is the point: reconciliation does
/// not require trusting the transport.
export function ReconciliationFeed({ events }: Props) {
  const verified = events.filter((event) => event.signature_valid).length;

  return (
    <section className="panel recon" aria-labelledby="recon-title">
      <div className="panel-head">
        <div>
          <p className="eyebrow" id="recon-title">
            Reconciliation
          </p>
          <p className="recon-sub">
            Delivered to your accounting system, signed
          </p>
        </div>
        {events.length > 0 && (
          <span className="recon-count mono">
            {verified}/{events.length} verified
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <div className="panel-body recon-empty">
          <p>Nothing delivered yet.</p>
          <p className="recon-empty-hint">
            Every state change is signed and pushed here as it happens.
          </p>
        </div>
      ) : (
        <ul className="recon-list">
          {events.slice(0, 12).map((event) => (
            <li key={event.event_id} className="recon-item">
              <span className="recon-time mono">
                {clockTime(event.received_at)}
              </span>
              <span className="recon-type mono">{event.type}</span>
              <span
                className={`recon-sig${event.signature_valid ? ' is-valid' : ' is-invalid'}`}
              >
                {event.signature_valid ? 'signature ok' : 'bad signature'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
