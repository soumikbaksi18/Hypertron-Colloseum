import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useWalletSession } from '../context/WalletContext';
import {
  getAccountKind,
  setAccountKind,
  type AccountKind,
} from '../lib/account-kind';
import { DashboardChrome, type BreadcrumbCrumb } from './chrome';
import { HubBilling, HubSettingsPanel } from './hub-panels';
import { isHubTab, type HubTab } from './hub-types';
import { WorkspaceWorkspaces } from './workspace-workspaces';
import { KindGate } from './kind-gate';
import { PersonalShell } from './personal-shell';
import { PrivacyOnboardingGate } from './privacy-onboarding-gate';
import { HUB_NAV } from './setup-nav';

const TAB_META: Record<HubTab, { label: string; searchPlaceholder: string }> = {
  workspaces: {
    label: 'Workspaces',
    searchPlaceholder: 'Search workspaces...',
  },
  billing: {
    label: 'Billing',
    searchPlaceholder: 'Search billing',
  },
  settings: {
    label: 'Settings',
    searchPlaceholder: 'Search settings',
  },
};

function readTabFromUrl(): HubTab {
  const value = new URLSearchParams(window.location.search).get('tab');
  return isHubTab(value) ? value : 'workspaces';
}

function displayName(session: { name?: string | null }, fallback: string) {
  return (session.name ?? '').trim() || fallback;
}

export function HubShell() {
  const { session } = useWalletSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const [kind, setKind] = useState<AccountKind | null>(() =>
    session ? getAccountKind(session.wallet_address) : null,
  );
  const [tab, setTab] = useState<HubTab>(() => readTabFromUrl());

  useEffect(() => {
    if (!session) return;
    setKind(getAccountKind(session.wallet_address));
  }, [session?.wallet_address]);

  useEffect(() => {
    const next = readTabFromUrl();
    setTab(next);
    if (new URLSearchParams(location.search).get('tab') === 'audit') {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          params.delete('tab');
          return params;
        },
        { replace: true },
      );
    }
  }, [location.search, setSearchParams]);

  const personalSpace = new URLSearchParams(location.search).get('space') === 'personal';

  const useWorkspaces = useCallback(() => {
    if (!session) return;
    setAccountKind(session.wallet_address, 'business');
    setTab('workspaces');
    setKind('business');
    navigate('/app', { replace: true });
  }, [session, navigate]);

  const usePersonal = useCallback(() => {
    if (!session) return;
    setAccountKind(session.wallet_address, 'individual');
    setKind('individual');
    navigate('/app?space=personal', { replace: true });
  }, [session, navigate]);

  const selectTab = useCallback(
    (next: string) => {
      if (next !== 'billing' && next !== 'settings') return;
      setTab(next);
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          params.delete('space');
          params.set('tab', next);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  if (!session) return null;
  if (!kind) {
    const setupTitle =
      (session.name ?? '').trim() ||
      session.handle?.trim() ||
      'Personal';
    return (
      <DashboardChrome
        variant="canvas"
        navItems={HUB_NAV}
        activeId=""
        onSelect={() => undefined}
        breadcrumb={[{ label: 'App', onSelect: () => navigate('/app') }, { label: 'Setup' }]}
        searchPlaceholder="Search setup..."
        identity={{
          title: setupTitle,
          subtitle: session.handle ?? session.wallet_address,
        }}
      >
        <KindGate onChosen={setKind} />
      </DashboardChrome>
    );
  }
  if (personalSpace) {
    return (
      <PrivacyOnboardingGate>
        <PersonalShell onUseWorkspaces={useWorkspaces} onGoApp={() => navigate('/app')} />
      </PrivacyOnboardingGate>
    );
  }

  const meta = TAB_META[tab];
  const appCrumb: BreadcrumbCrumb = { label: 'App', onSelect: () => navigate('/app') };
  const workspaceCrumb: BreadcrumbCrumb = { label: 'Workspace', onSelect: () => navigate('/app') };
  const breadcrumb: BreadcrumbCrumb[] =
    tab === 'workspaces'
      ? [appCrumb, { label: 'Workspace' }]
      : [appCrumb, workspaceCrumb, { label: meta.label }];
  return (
    <PrivacyOnboardingGate>
      <DashboardChrome
        navItems={HUB_NAV}
        activeId={tab === 'workspaces' ? '' : tab}
        onSelect={selectTab}
        breadcrumb={breadcrumb}
        searchPlaceholder={meta.searchPlaceholder}
        identity={{
          title: displayName(session, 'Workspace'),
          subtitle: session.wallet_address,
        }}
        mode="workspaces"
        variant="canvas"
        onModeChange={(next) => {
          if (next === 'personal') usePersonal();
        }}
      >
        <>
          <TabPanel active={tab === 'workspaces'}>
            <WorkspaceWorkspaces currentWorkspaceId={session.business_id} />
          </TabPanel>
          <TabPanel active={tab === 'billing'}>
            <HubBilling />
          </TabPanel>
          <TabPanel active={tab === 'settings'}>
            <HubSettingsPanel />
          </TabPanel>
        </>
      </DashboardChrome>
    </PrivacyOnboardingGate>
  );
}

function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  if (!active) return null;
  return <div className="block">{children}</div>;
}
