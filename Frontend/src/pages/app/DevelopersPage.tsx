import { useEffect, useState } from 'react';

import { developerKeysApi, type DeveloperKey } from '../../lib/developer-keys';
import { ApiError, BASE_URL } from '../../lib/http';

const API_ORIGIN = BASE_URL || 'http://localhost:4000';

const KEY_STORAGE = 'hypertron.agentKey';

export function DevelopersPage() {
  const [keys, setKeys] = useState<DeveloperKey[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void developerKeysApi
      .list()
      .then(setKeys)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Could not load API keys.'),
      );
  }, []);

  async function createKey() {
    setBusy(true);
    setError(null);
    try {
      const created = await developerKeysApi.create();
      setKeys((current) => [created, ...current]);
      if (created.secret) {
        setSecret(created.secret);
        localStorage.setItem(KEY_STORAGE, created.secret);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not issue a key.');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    try {
      const updated = await developerKeysApi.revoke(id);
      setKeys((current) => current.map((key) => (key.id === updated.id ? updated : key)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke this key.');
    }
  }

  const mcpConfig = `{
  "mcpServers": {
    "hypertron": {
      "command": "node",
      "args": ["Agents/mcp/index.mjs"],
      "env": {
        "HYPERTRON_API_URL": "${API_ORIGIN}",
        "HYPERTRON_API_KEY": "${secret ?? 'ht_sk_YOUR_KEY'}"
      }
    }
  }
}`;

  return (
    <div className="app-page">
      <header className="app-page-header">
        <h1>Developers</h1>
        <p>
          Issue a key to call the pool from your app, or paste the MCP config so
          an agent can create payment intents under your policy.
        </p>
      </header>

      {error && (
        <div className="console-alert" role="alert">
          <span>{error}</span>
        </div>
      )}

      {secret && (
        <div className="panel">
          <div className="panel-head">
            <p className="eyebrow">Copy this once</p>
          </div>
          <div className="panel-body">
            <code className="mono" style={{ wordBreak: 'break-all', fontSize: '1rem' }}>
              {secret}
            </code>
            <p style={{ margin: '0.75rem 0 0', color: 'var(--ink-faint)', fontSize: '1rem' }}>
              Saved for the Agents tab on this browser. It will not be shown again.
            </p>
          </div>
        </div>
      )}

      <div className="app-page-grid">
        <div className="panel">
          <div className="panel-head">
            <p className="eyebrow">API keys</p>
            <button type="button" className="masthead-exit" onClick={() => void createKey()} disabled={busy}>
              {busy ? 'Issuing…' : 'Create key'}
            </button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {keys.length === 0 ? (
              <p style={{ margin: 0, padding: '1rem', color: 'var(--ink-faint)' }}>
                No keys yet. Create one to integrate Hypertron.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {keys.map((key) => (
                  <li
                    key={key.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    <div>
                      <p className="mono" style={{ margin: 0 }}>
                        ht_sk_…{key.last_four}
                      </p>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.95rem', color: 'var(--ink-faint)' }}>
                        {key.agent_label} · {key.active ? 'active' : 'revoked'}
                      </p>
                    </div>
                    {key.active && (
                      <button type="button" className="masthead-exit" onClick={() => void revoke(key.id)}>
                        Revoke
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="eyebrow">Use from your app</p>
          </div>
          <div className="panel-body">
            <pre className="mono" style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.95rem', color: 'var(--ink-dim)' }}>
{`curl -X POST ${API_ORIGIN}/v1/payment_intents \\
  -H "Authorization: Bearer ht_sk_…" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: invoice-1829" \\
  -d '{"payee_ref":"supplier_acme","amount_minor":437000000,"reference":"invoice #1829"}'`}
            </pre>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <p className="eyebrow">Agent MCP</p>
        </div>
        <div className="panel-body">
          <p style={{ margin: '0 0 0.75rem', color: 'var(--ink-dim)', fontSize: '1.05rem' }}>
            Tools: create_payment_intent, get_payment_intent, list_payment_intents.
            Run <code>npm install</code> in <code>Agents/mcp</code>, then add this to Cursor.
          </p>
          <pre className="mono" style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.95rem', color: 'var(--ink-dim)' }}>
            {mcpConfig}
          </pre>
        </div>
      </div>
    </div>
  );
}
