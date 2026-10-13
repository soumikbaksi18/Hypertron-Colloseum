import { Link } from 'react-router-dom';

import { useWalletSession } from '../context/WalletContext';
import './KeyGate.css';

export function PhantomGate() {
  const { error, signingIn, signIn } = useWalletSession();

  return (
    <div className="gate">
      <Link to="/" className="app-gate-back">
        ← Back to Hypertron
      </Link>
      <div className="gate-frame">
        <div className="gate-brand">
          <img src="/media/logo_white.png" alt="" width={28} height={28} />
          <span className="gate-wordmark">Hypertron</span>
        </div>

        <h1 className="gate-title">
          Sign in with Phantom
          <br />
          to open your workspace.
        </h1>

        <p className="gate-lede">
          Create invoices, send payment links, issue API keys, and connect
          agents — no agent key required to collect.
        </p>

        <button
          type="button"
          className="gate-submit"
          onClick={() => void signIn()}
          disabled={signingIn}
        >
          {signingIn ? 'Waiting for Phantom…' : 'Connect Phantom'}
        </button>

        {error && <p className="gate-error">{error}</p>}

        <p className="gate-hint">
          Need the operator console later? Issue an API key in Developers after
          you sign in.
        </p>
      </div>
    </div>
  );
}
