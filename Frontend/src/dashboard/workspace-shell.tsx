import { startTransition, useCallback, useEffect, useState } from 'react';
import {
  Code2,
  Landmark,
  LayoutGrid,
  Receipt,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';


import { WorkspacePayments } from './workspace-payments';
import { WorkspaceTreasury } from './workspace-treasury';
import { WorkspaceDevelopers } from './workspace-developers';
import { WorkspaceCompliance } from './workspace-compliance';
import { WorkspaceSettings } from './workspace-settings';
import { useWalletSession } from '../context/WalletContext';
import { setAccountKind } from '../lib/account-kind';
import { getWorkspace, touchWorkspace } from '../lib/workspaces';
import { DashboardChrome } from './chrome';
import { PrivacyOnboardingGate } from './privacy-onboarding-gate';
import { WorkspaceOverview } from './workspace-overview';
import {
  isWorkspaceTab,
  type WorkspaceTab,
} from './workspace-types';

const WORKSPACE_NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'payments', label: 'Payments', icon: Receipt },
  { id: 'treasury', label: 'Treasury', icon: Landmark },
  { id: 'developers', label: 'Developers', icon: Code2 },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings, dividerBefore: true },
] as const;

const TAB_META: Record<WorkspaceTab, { label: string; searchPlaceholder: string }> = {
  overview: { label: 'Overview', searchPlaceholder: 'Search payments, contacts...' },
  payments: { label: 'Payments', searchPlaceholder: 'Search payments' },
  treasury: { label: 'Treasury', searchPlaceholder: 'Search treasury' },
  developers: { label: 'Developers', searchPlaceholder: 'Search API keys, webhooks...' },
  auditor: { label: 'Auditor', searchPlaceholder: 'Search auditor...' },
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

  const selectWorkspaceNav = useCallback(
    (next: string) => {
      if (next === 'compliance') {
        selectTab('auditor');
        return;
      }
      if (isWorkspaceTab(next)) selectTab(next);
    },
    [selectTab],
  );

  const switchMode = useCallback(
    (next: 'personal' | 'workspaces') => {
      if (!session) return;
      if (next === 'personal') setAccountKind(session.wallet_address, 'individual');
      navigate('/app');
    },
    [navigate, session],
  );

  if (!session || !workspaceId) return <Navigate to="/app" replace />;

  const workspace = getWorkspace(session, workspaceId);
  if (!workspace) return <Navigate to="/app" replace />;

  const meta = TAB_META[tab];
  const navItems = [...WORKSPACE_NAV];
  const activeNavId = tab === 'auditor' ? 'compliance' : tab;

  return (
    <PrivacyOnboardingGate>
    <DashboardChrome
      navItems={navItems}
      activeId={activeNavId}
      onSelect={selectWorkspaceNav}
      breadcrumb={`${workspace.name} / ${meta.label}`}
      searchPlaceholder={meta.searchPlaceholder}
      identity={{
        title: session.name.trim() || workspace.name,
        subtitle: session.wallet_address,
      }}
      mode="workspaces"
      variant="canvas"
      overviewScaled={tab === 'overview'}
      hideHeader={
        tab === 'overview' ||
        tab === 'payments' ||
        tab === 'treasury' ||
        tab === 'developers' ||
        tab === 'auditor' ||
        tab === 'settings'
      }
      onModeChange={switchMode}
    >
      {!ready ? null : tab === 'overview' ? (
        <WorkspaceOverview
          workspace={workspace}
          searchPlaceholder={meta.searchPlaceholder}
          identityTitle={session.name.trim() || workspace.name}
          onCreatePaymentLink={() => selectTab('payments')}
          onViewAllPayments={() => selectTab('payments')}
          onModeChange={switchMode}
        />
      ) : tab === 'payments' ? (
        <WorkspacePayments
          workspace={workspace}
          searchPlaceholder={meta.searchPlaceholder}
          identityTitle={session.name.trim() || workspace.name}
          onModeChange={switchMode}
        />
      ) : tab === 'treasury' ? (
        <WorkspaceTreasury
          workspace={workspace}
          searchPlaceholder={meta.searchPlaceholder}
          identityTitle={session.name.trim() || workspace.name}
          onModeChange={switchMode}
        />
      ) : tab === 'developers' ? (
        <WorkspaceDevelopers
          workspace={workspace}
          searchPlaceholder={meta.searchPlaceholder}
          identityTitle={session.name.trim() || workspace.name}
          onModeChange={switchMode}
        />
      ) : tab === 'auditor' ? (
        <WorkspaceCompliance
          workspace={workspace}
          searchPlaceholder={meta.searchPlaceholder}
          identityTitle={session.name.trim() || workspace.name}
          onModeChange={switchMode}
        />
      ) : tab === 'settings' ? (
        <WorkspaceSettings
          workspace={workspace}
          searchPlaceholder={meta.searchPlaceholder}
          identityTitle={session.name.trim() || workspace.name}
          onModeChange={switchMode}
          onOpenCompliance={() => selectTab('auditor')}
        />
      ) : null}
    </DashboardChrome>
    </PrivacyOnboardingGate>
  );
}
