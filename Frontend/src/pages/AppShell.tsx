import { NavLink, Outlet, Link } from 'react-router-dom';

import { PhantomGate } from '../components/PhantomGate';
import { useWalletSession } from '../context/WalletContext';
import { shortenAddress } from '../lib/phantom';
import './AppShell.css';

const NAV = [
  { to: '/app', end: true, label: 'Overview', hint: 'Invoices today' },
  { to: '/app/payments', label: 'Payments', hint: 'Create a link' },
  { to: '/app/developers', label: 'Developers', hint: 'Keys and MCP' },
  { to: '/app/agents', label: 'Agents', hint: 'Policy console' },
  { to: '/app/settings', label: 'Settings', hint: 'Payout address' },
] as const;

export function AppShell() {
  const { ready, session, signOut } = useWalletSession();

  if (!ready) {
    return <div className="boot" />;
  }

  if (!session) {
    return <PhantomGate />;
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/" className="app-sidebar-brand">
          <img src="/media/logo_white.png" alt="" width={28} height={28} />
          <span>Hypertron</span>
        </Link>

        <p className="app-sidebar-eyebrow">Workspace</p>

        <nav className="app-sidebar-nav" aria-label="Workspace">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                `app-nav-item${isActive ? ' is-active' : ''}`
              }
            >
              <span className="app-nav-label">{item.label}</span>
              <span className="app-nav-hint">{item.hint}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar-identity">
          <p className="app-sidebar-business">{session.name}</p>
          <p className="app-sidebar-agent mono">
            {shortenAddress(session.wallet_address)}
          </p>
          <button type="button" className="app-sidebar-exit" onClick={() => void signOut()}>
            Disconnect
          </button>
        </div>
      </aside>

      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
}
