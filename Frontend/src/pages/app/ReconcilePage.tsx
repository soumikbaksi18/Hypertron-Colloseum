import { ReconciliationFeed } from '../../components/ReconciliationFeed';
import { useConsoleContext } from '../../context/ConsoleContext';

export function ReconcilePage() {
  const { webhooks } = useConsoleContext();

  return (
    <div className="app-page-body" style={{ maxWidth: 640 }}>
        <ReconciliationFeed events={webhooks} />
    </div>
  );
}
