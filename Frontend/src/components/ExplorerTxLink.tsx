import { explorerLabel, explorerTxUrl, isOnchainSignature } from '../lib/explorer';
import { truncateHash } from '../lib/format';

export function ExplorerTxLink({
  signature,
  cluster,
  compact = false,
}: {
  signature: string | null | undefined;
  cluster?: string | null;
  compact?: boolean;
}) {
  if (!signature) return null;
  if (!isOnchainSignature(signature)) {
    return <span>{truncateHash(signature)}</span>;
  }
  return (
    <a
      className="chain-link"
      href={explorerTxUrl(signature, cluster ?? undefined)}
      target="_blank"
      rel="noreferrer"
    >
      {compact ? explorerLabel(signature) : `Explorer · ${explorerLabel(signature)}`}
    </a>
  );
}
