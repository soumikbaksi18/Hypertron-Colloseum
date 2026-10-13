import { startTransition, useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';


import { WorkspacePayments } from './workspace-payments';
import { WorkspaceTreasury } from './workspace-treasury';
import { WorkspaceDevelopers } from './workspace-developers';
import { WorkspaceCompliance } from './workspace-compliance';
import { WorkspaceSettings } from './workspace-settings';
import { useWalletSession } from '../context/WalletContext';
import { setAccountKind } from '../lib/account-kind';
import { canAccessWorkspaces } from '../lib/workspace-subscription';
import { getWorkspace, touchWorkspace } from '../lib/workspaces';
import { DashboardChrome, type BreadcrumbCrumb } from './chrome';
import { PrivacyOnboardingGate } from './privacy-onboarding-gate';
import { APP_NAV } from './setup-nav';
import { WorkspaceOverview } from './workspace-overview';
import {
  isWorkspaceTab,
  type WorkspaceTab,
} from './workspace-types';

const TAB_META: Record<WorkspaceTab, { label: string; searchPlaceholder: string }> = {
  overview: { label: 'Overview', searchPlaceholder: 'Search payments, contacts...' },
  payments: { label: 'Payments', searchPlaceholder: 'Search payments' },
  treasury: { label: 'Treasury', searchPlaceholder: 'Search treasury' },
  developers: { label: 'Developers', searchPlaceholder: 'Search API keys, webhooks...' },
  auditor: { label: 'Auditor', searchPlaceholder: 'Search auditor...' },
  workspaces: { label: 'Workspaces', searchPlaceholder: 'Search workspaces...' },
  settings: { label: 'Settings', searchPlaceholder: 'Search settings...' },
};

function readTabFromUrl(): WorkspaceTab {
  const value = new URLSearchParams(window.location.search).get('tab');
  return isWorkspaceTab(value) ? value : 'overview';
}

export function WorkspaceShell() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { session } = useWalletSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<WorkspaceTab>(() => readTabFromUrl());

  useEffect(() => {
    setTab(readTabFromUrl());
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

  const selectWorkspaceNav = useCallback(
    (next: string) => {
      if (next === 'billing') {
        navigate('/app?tab=billing');
        return;
      }
      if (next === 'workspaces') {
        navigate('/app');
        return;
      }
      if (next === 'compliance') {
        selectTab('auditor');
        return;
      }
      if (isWorkspaceTab(next)) selectTab(next);
    },
    [navigate, selectTab],
  );

  const switchMode = useCallback(
    (next: 'personal' | 'workspaces') => {
      if (!session) return;
      if (next === 'personal') {
        setAccountKind(session.wallet_address, 'individual');
        navigate('/app?space=personal');
        return;
      }
      navigate('/app');
    },
    [navigate, session],
  );

  if (!session || !workspaceId) return <Navigate to="/app" replace />;

  const workspace = getWorkspace(session, workspaceId);
  if (!workspace) return <Navigate to="/app" replace />;
  if (!canAccessWorkspaces(session)) {
    return <Navigate to="/app?tab=billing" replace />;
  }
  if (tab === 'workspaces') return <Navigate to="/app" replace />;

  const meta = TAB_META[tab];
  const activeNavId = tab === 'auditor' ? 'compliance' : tab;
  const appCrumb: BreadcrumbCrumb = { label: 'App', onSelect: () => navigate('/app') };
  const workspaceCrumb: BreadcrumbCrumb = {
    label: workspace.name,
    onSelect: () => selectTab('overview'),
  };
  const sectionLabel = tab === 'auditor' ? 'Compliance' : meta.label;
  const breadcrumb: BreadcrumbCrumb[] =
    tab === 'overview'
      ? [appCrumb, { label: workspace.name }]
      : [appCrumb, workspaceCrumb, { label: sectionLabel }];

  return (
    <PrivacyOnboardingGate>
    <DashboardChrome
      navItems={APP_NAV}
      activeId={activeNavId}
      onSelect={selectWorkspaceNav}
      breadcrumb={breadcrumb}
      searchPlaceholder={meta.searchPlaceholder}
      identity={{
        title: session.name.trim() || workspace.name,
        subtitle: session.wallet_address,
      }}
      mode="workspaces"
      variant="canvas"
      onModeChange={switchMode}
    >
      {tab === 'overview' ? (
        <WorkspaceOverview
          workspace={workspace}
          onCreatePaymentLink={() => selectTab('payments')}
          onViewAllPayments={() => selectTab('payments')}
        />
      ) : tab === 'payments' ? (
        <WorkspacePayments workspace={workspace} />
      ) : tab === 'treasury' ? (
        <WorkspaceTreasury />
      ) : tab === 'developers' ? (
        <WorkspaceDevelopers />
      ) : tab === 'auditor' ? (
        <WorkspaceCompliance />
      ) : tab === 'settings' ? (
        <WorkspaceSettings onOpenCompliance={() => selectTab('auditor')} />
      ) : null}
    </DashboardChrome>
    </PrivacyOnboardingGate>
  );
}
