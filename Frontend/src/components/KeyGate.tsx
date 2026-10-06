import { useState } from 'react';

import { BASE_URL } from '../lib/api';
import './KeyGate.css';

interface Props {
  error: string | null;
  onSubmit: (key: string) => void;
}

/// The console is scoped by whichever agent key you present, so the key is the
/// way in. Demo-only: a production console would hold an operator session and
/// never see an agent's credential.
export function KeyGate({ error, onSubmit }: Props) {
  const [value, setValue] = useState('');

  return (
    <div className="gate">
      <div className="gate-frame">
        <div className="gate-brand">
          <span className="gate-mark" aria-hidden="true" />
          <span className="gate-wordmark">Hypertron</span>
        </div>

        <h1 className="gate-title">
          Give software financial authority
          <br />
          without giving away financial privacy.
        </h1>

        <p className="gate-lede">
          This console watches one agent spend under policy: what it may pay on
          its own, what needs you, and what stays invisible to everyone else.
        </p>

        <form
          className="gate-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (value.trim()) onSubmit(value.trim());
          }}
        >
          <label className="gate-field">
            <span className="eyebrow">Agent key</span>
            <input
              className="gate-input mono"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="ht_sk_…"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </label>

          <button className="gate-submit" disabled={!value.trim()}>
            Open console
          </button>
        </form>

        {error && <p className="gate-error">{error}</p>}

        <p className="gate-hint">
          Run <code>npm run seed</code> in <code>Server/</code> to mint a key.
          Talking to <code>{BASE_URL}</code>.
        </p>
      </div>
    </div>
  );
}
