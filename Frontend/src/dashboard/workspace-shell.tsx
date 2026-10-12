import { startTransition, useCallback, useEffect, useState } from 'react';
import {
  Code2,
  CreditCard,
  LayoutDashboard,
  ScanEye,
  Settings,
  Wallet,
} from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { CollectPaymentsPage } from '../pages/app/CollectPaymentsPage';
import { DevelopersPage } from '../pages/app/DevelopersPage';
import { SettingsPage } from '../pages/app/SettingsPage';
import { WalletPage } from '../pages/app/WalletPage';
import { useWalletSession } from '../context/WalletContext';
import { setAccountKind } from '../lib/account-kind';
import { getWorkspace, touchWorkspace } from '../lib/workspaces';
import { AuditorPage } from './auditor-page';
import { DashboardChrome } from './chrome';
import { PrivacyOnboardingGate } from './privacy-onboarding-gate';
import { WorkspaceOverview } from './workspace-overview';
import {
  WORKSPACE_TABS,
  isWorkspaceTab,
  type WorkspaceTab,
} from './workspace-types';

const TAB_ICONS = {
  overview: LayoutDashboard,
  payments: CreditCard,
  treasury: Wallet,
  developers: Code2,
  auditor: ScanEye,
  settings: Settings,
} as const;

const TAB_META: Record<WorkspaceTab, { label: string; searchPlaceholder: string }> = {
  overview: { label: 'Overview', searchPlaceholder: 'Search workspace...' },
  payments: { label: 'Payments', searchPlaceholder: 'Search payments' },
  treasury: { label: 'Treasury', searchPlaceholder: 'Search treasury' },
  developers: { label: 'Developers', searchPlaceholder: 'Search API keys' },
  auditor: { label: 'Auditor', searchPlaceholder: 'Search auditor' },
  settings: { label: 'Settings', searchPlaceholder: 'Search settings' },
};

function readTabFromUrl(): WorkspaceTab {
  const value = new URLSearchParams(window.location.search).get('tab');
  return isWorkspaceTab(value) ? value : 'overview';
}

export function WorkspaceShell() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { session } = useWalletSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTab(readTabFromUrl());
    setReady(true);
  }, [workspaceId]);

  useEffect(() => {
    if (session && workspaceId) touchWorkspace(session, workspaceId);
  }, [session, workspaceId]);

  const selectTab = useCallback((next: string) => {
    if (!isWorkspaceTab(next)) return;
    startTransition(() => {
      setTab(next);
      const url = new URL(window.location.href);
      if (next === 'overview') url.searchParams.delete('tab');
      else url.searchParams.set('tab', next);
      window.history.replaceState(null, '', url.pathname + url.search);
    });
  }, []);

  if (!session || !workspaceId) return <Navigate to="/app" replace />;

  const workspace = getWorkspace(session, workspaceId);
  if (!workspace) return <Navigate to="/app" replace />;

  const meta = TAB_META[tab];
  const navItems = WORKSPACE_TABS.map((item) => ({
    ...item,
    icon: TAB_ICONS[item.id],
  }));

  return (
    <PrivacyOnboardingGate>
    <DashboardChrome
      navItems={navItems}
      activeId={tab}
      onSelect={selectTab}
      breadcrumb={`${workspace.name} / ${meta.label}`}
      searchPlaceholder={meta.searchPlaceholder}
      identity={{
        title: session.name.trim() || workspace.name,
        subtitle: session.wallet_address,
      }}
      mode="workspaces"
      onModeChange={(next) => {
        if (next === 'personal') {
          setAccountKind(session.wallet_address, 'individual');
          navigate('/app');
          return;
        }
        navigate('/app');
      }}
    >
      {!ready ? null : (
        <>
          {tab === 'overview' ? (
            <WorkspaceOverview
              workspace={workspace}
              onCreatePaymentLink={() => selectTab('payments')}
              onViewAllPayments={() => selectTab('payments')}
            />
          ) : null}
          {tab === 'payments' ? (
            <div className="dash-embed">
              <CollectPaymentsPage />
            </div>
          ) : null}
          {tab === 'treasury' ? (
            <div className="dash-embed">
              <WalletPage />
            </div>
          ) : null}
          {tab === 'developers' ? (
            <div className="dash-embed">
              <DevelopersPage />
            </div>
          ) : null}
          {tab === 'auditor' ? <AuditorPage /> : null}
          {tab === 'settings' ? (
            <div className="dash-embed">
              <SettingsPage />
            </div>
          ) : null}
        </>
      )}
    </DashboardChrome>
    </PrivacyOnboardingGate>
  );
}
