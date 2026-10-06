import type { AgentProfile, PaymentIntent } from '../lib/api';
import { compactMoney, money, toMajor } from '../lib/format';
import './AuthorityRail.css';

interface Props {
  profile: AgentProfile;
  intents: PaymentIntent[];
}

const TICK_COUNT = 10;

/// The console's thesis, drawn as an instrument rather than a progress bar.
///
/// One scale carries all three limits at once: today's consumed budget as a
/// filled span, the autonomous ceiling as a hard line, and each payment as a
/// tick at the position it occupies. A payment parked for approval sits
/// visibly past the line — the reason it stopped is the geometry itself.
export function AuthorityRail({ profile, intents }: Props) {
  const daily = Number(profile.limits.daily_minor);
  const autoApprove = Number(profile.limits.auto_approve_minor);
  const perTx = Number(profile.limits.per_transaction_minor);
  const spent = Number(profile.today.spent_minor);

  const spentPct = Math.min((spent / daily) * 100, 100);
  const thresholdPct = (autoApprove / daily) * 100;
  const perTxPct = Math.min((perTx / daily) * 100, 100);

  // Only live payments belong on the scale; denied ones never consumed budget.
  const plotted = intents
    .filter((intent) =>
      ['authorized', 'settling', 'settled', 'requires_approval'].includes(
        intent.status,
      ),
    )
    .slice(0, 14);

  return (
    <section className="rail" aria-labelledby="rail-title">
      <header className="rail-head">
        <div>
          <p className="eyebrow" id="rail-title">
            Authority today
          </p>
          <p className="rail-lede">
            <strong className="figure">{money(spent, profile.currency)}</strong>
            <span> spent of </span>
            <strong className="figure">{compactMoney(daily)}</strong>
            <span> · </span>
            <strong className="figure">
              {money(profile.today.remaining_minor, profile.currency)}
            </strong>
            <span> left</span>
          </p>
        </div>

        <dl className="rail-limits">
          <div>
            <dt className="eyebrow">Autonomous to</dt>
            <dd className="figure">{compactMoney(autoApprove)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Per payment</dt>
            <dd className="figure">{compactMoney(perTx)}</dd>
          </div>
        </dl>
      </header>

      <div className="rail-instrument">
        {/* The graduated field. Clipped, so only the fill and ticks live here. */}
        <div
          className="rail-scale"
          role="img"
          aria-label={`${money(spent, profile.currency)} spent of ${compactMoney(daily)} daily budget. Agent acts alone up to ${compactMoney(autoApprove)}.`}
        >
          <div className="rail-ticks" aria-hidden="true">
            {Array.from({ length: TICK_COUNT + 1 }, (_, index) => (
              <span
                key={index}
                className={`rail-tick${index % 5 === 0 ? ' rail-tick-major' : ''}`}
                style={{ left: `${(index / TICK_COUNT) * 100}%` }}
              />
            ))}
          </div>

          <div className="rail-consumed" style={{ width: `${spentPct}%` }}>
            <span className="rail-consumed-edge" />
          </div>
        </div>

        {/* Annotations ride above the scale unclipped, so their flags can
            break out of the housing the way they do on a real gauge. */}
        <div className="rail-annotations" aria-hidden="true">
          {perTxPct < 100 && (
            <div className="rail-cap" style={{ left: `${perTxPct}%` }}>
              <span className="rail-cap-flag">hard cap</span>
            </div>
          )}

          {/* Beyond this line the agent cannot act alone. */}
          <div className="rail-threshold" style={{ left: `${thresholdPct}%` }}>
            <span className="rail-threshold-flag">needs a person</span>
          </div>

          <div className="rail-plots">
            {plotted.map((intent) => {
              const position = Math.min(
                (Number(intent.amount_minor) / daily) * 100,
                100,
              );
              return (
                <span
                  key={intent.id}
                  className={`rail-plot rail-plot-${intent.status}`}
                  style={{ left: `${position}%` }}
                  title={`${money(intent.amount_minor, intent.currency)} · ${intent.status.replace(/_/g, ' ')}`}
                />
              );
            })}
          </div>
        </div>

        <div className="rail-axis" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className="rail-axis-mark figure">
              {index === 0 ? '0' : compactMoney((daily / 4) * index)}
            </span>
          ))}
        </div>
      </div>

      <p className="rail-caption">
        The agent pays on its own below{' '}
        <strong className="figure">{compactMoney(autoApprove)}</strong>. Anything
        larger stops at the line and waits for you — up to{' '}
        {toMajor(perTx).toLocaleString('en-US')} {profile.currency} a payment.
      </p>
    </section>
  );
}
