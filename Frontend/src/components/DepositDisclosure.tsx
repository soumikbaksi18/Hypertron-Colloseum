import { clusterSwitchInstruction, type SolanaCluster } from '../lib/cluster';
import type { DepositPreflight } from '../lib/deposit-preflight';
import { formatUsdcAmount } from '../lib/usdc-amount';
import './DepositDisclosure.css';

export function DepositDisclosure({
  preflight,
  checking,
}: {
  preflight: DepositPreflight | null;
  checking?: boolean;
}) {
  if (checking && !preflight) {
    return (
      <aside className="deposit-disclosure" aria-live="polite">
        <p className="deposit-disclosure-kicker">Deposit check</p>
        <p className="deposit-disclosure-note">
          Checking cluster, USDC mint, and wallet balance…
        </p>
      </aside>
    );
  }
  if (!preflight) return null;

  const disclosure = preflight.disclosure;
  const cluster = preflight.cluster as SolanaCluster;
  const blocked = !preflight.ok;

  return (
    <aside
      className={`deposit-disclosure${blocked ? ' is-blocked' : ''}`}
      aria-live="polite"
    >
      <p className="deposit-disclosure-kicker">
        {blocked ? 'Deposit blocked' : 'This deposit is public'}
      </p>
      {blocked ? (
        <p className="deposit-disclosure-error" role="alert">
          {preflight.error}
        </p>
      ) : null}
      {disclosure ? (
        <dl>
          <div>
            <dt>Amount on chain</dt>
            <dd>{disclosure.amount}</dd>
          </div>
          <div>
            <dt>Source wallet</dt>
            <dd className="mono">{disclosure.sourceWallet}</dd>
          </div>
          <div>
            <dt>Cluster</dt>
            <dd>{disclosure.cluster}</dd>
          </div>
          <div>
            <dt>USDC mint</dt>
            <dd className="mono">{disclosure.mint}</dd>
          </div>
          <div>
            <dt>Timing</dt>
            <dd>{disclosure.timing}</dd>
          </div>
        </dl>
      ) : preflight.amountSnapped !== null ? (
        <p className="deposit-disclosure-note">
          Requested {formatUsdcAmount(preflight.amountSnapped)}
          {preflight.payer ? ` from ${preflight.payer}` : ''}.
        </p>
      ) : null}
      {disclosure ? (
        <ul>
          {disclosure.metadata.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <p className="deposit-disclosure-note">
        {preflight.ok && preflight.availableMinor !== undefined
          ? `Available in this wallet: ${formatUsdcAmount(preflight.availableMinor, preflight.mintDecimals)}. `
          : null}
        {clusterSwitchInstruction(cluster)} Transaction metadata — accounts, signature, and
        program logs — stays on the public ledger.
      </p>
    </aside>
  );
}
