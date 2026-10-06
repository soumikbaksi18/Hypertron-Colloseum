import { NavLink, Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';

import { KeyGate } from '../../components/KeyGate';
import { ConsoleProvider, useConsoleContext } from '../../context/ConsoleContext';

const SUBNAV = [
  { to: '/app/agents', end: true, label: 'Authority' },
  { to: '/app/agents/request', label: 'Request' },
  { to: '/app/agents/approvals', label: 'Approvals' },
  { to: '/app/agents/ledger', label: 'Ledger' },
  { to: '/app/agents/reconcile', label: 'Reconcile' },
] as const;

function AgentsInner() {
  const console_ = useConsoleContext();

  if (!console_.ready) {
    return <div className="boot" />;
  }

  if (!console_.apiKey || !console_.profile) {
    return (
      <div className="app-page">
        <header className="app-page-header">
          <h1>Agents</h1>
          <p>
            Paste an API key from Developers, or create one there first. The
            key is the agent&apos;s identity — policy travels with it.
          </p>
        </header>
        <p style={{ margin: '0 0 1rem' }}>
          <Link to="/app/developers" className="landing-cta-secondary">
            Issue a key
          </Link>
        </p>
        <KeyGate error={console_.gateError} onSubmit={console_.signIn} />
      </div>
    );
  }

  return (
    <div className="app-page">
      <header className="app-page-header">
        <h1>Agents</h1>
        <p>
          {console_.profile.label} spending under policy for{' '}
          {console_.profile.business_name}. Approve what crosses the line.
        </p>
      </header>

      <nav className="app-sidebar-nav" style={{ flexDirection: 'row', flex: 'unset' }}>
        {SUBNAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            className={({ isActive }) =>
              `app-nav-item${isActive ? ' is-active' : ''}`
            }
          >
            <span className="app-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {console_.actionError && (
        <div className="console-alert" role="alert">
          <span>{console_.actionError}</span>
          <button type="button" onClick={console_.dismissActionError}>
            Dismiss
          </button>
        </div>
      )}

      <Outlet />
    </div>
  );
}

export function AgentsLayout() {
  return (
    <ConsoleProvider>
      <AgentsInner />
    </ConsoleProvider>
  );
}
