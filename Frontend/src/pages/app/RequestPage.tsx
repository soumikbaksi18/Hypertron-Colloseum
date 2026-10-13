import { IntentComposer } from '../../components/IntentComposer';
import { useConsoleContext } from '../../context/ConsoleContext';

export function RequestPage() {
  const { profile, submitting, requestPayment } = useConsoleContext();
  if (!profile) return null;

  return (
    <div className="app-page-body" style={{ maxWidth: 480 }}>
      <IntentComposer
        profile={profile}
        busy={submitting}
        onSubmit={requestPayment}
      />
    </div>
  );
}
