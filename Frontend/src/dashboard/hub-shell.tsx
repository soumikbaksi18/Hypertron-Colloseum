import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, LayoutGrid, Settings } from 'lucide-react';

import { useWalletSession } from '../context/WalletContext';
import {
  getAccountKind,
  setAccountKind,
  type AccountKind,
} from '../lib/account-kind';
import { DashboardChrome } from './chrome';
import { HubBilling, HubSettingsPanel } from './hub-panels';
import { HUB_TABS, isHubTab, type HubTab } from './hub-types';
import { WorkspaceWorkspaces } from './workspace-workspaces';
import { KindGate } from './kind-gate';
import { PersonalShell } from './personal-shell';
import { PrivacyOnboardingGate } from './privacy-onboarding-gate';
import { SETUP_PREVIEW_NAV } from './setup-nav';

const TAB_ICONS = {
  workspaces: LayoutGrid,
  billing: CreditCard,
  settings: Settings,
} as const;

const TAB_META: Record<HubTab, { breadcrumb: string; searchPlaceholder: string }> = {
  workspaces: {
    breadcrumb: 'Account / Workspaces',
    searchPlaceholder: 'Search workspaces...',
  },
  billing: {
    breadcrumb: 'Account / Billing',
    searchPlaceholder: 'Search billing',
  },
  settings: {
    breadcrumb: 'Account / Settings',
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

  useEffect(() => {
    if (!session) return;
    const urlTab = readTabFromUrl();
    if (urlTab !== 'billing') return;
    const stored = getAccountKind(session.wallet_address);
    if (stored === 'business') return;
    setAccountKind(session.wallet_address, 'business');
    setKind('business');
  }, [session?.wallet_address, location.search]);

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
    const url = new URL(window.location.href);
    url.searchParams.delete('tab');
    window.history.replaceState(null, '', url.pathname + url.search);
    setKind('individual');
  }, [session]);

  const selectTab = useCallback(
    (next: string) => {
      if (!isHubTab(next)) return;
      if (session && next === 'billing') {
        setAccountKind(session.wallet_address, 'business');
        setKind('business');
      }
      setTab(next);
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next === 'workspaces') params.delete('tab');
          else params.set('tab', next);
          return params;
        },
        { replace: true },
      );
    },
    [session, setSearchParams],
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
        hideHeader
        navItems={SETUP_PREVIEW_NAV}
        activeId=""
        onSelect={() => undefined}
        breadcrumb="Account / Setup"
        searchPlaceholder="Search setup..."
        identity={{
          title: setupTitle,
          subtitle: session.handle ?? session.wallet_address,
        }}
      >
        <KindGate
          onChosen={setKind}
          identityTitle={setupTitle}
          searchPlaceholder="Search setup..."
        />
      </DashboardChrome>
    );
  }
  if (kind === 'individual') {
    return (
      <PrivacyOnboardingGate>
        <PersonalShell onUseWorkspaces={useWorkspaces} />
      </PrivacyOnboardingGate>
    );
  }

  const meta = TAB_META[tab];
  const navItems = HUB_TABS.map((item) => ({
    ...item,
    icon: TAB_ICONS[item.id],
  }));
  const canvasTab = tab === 'workspaces';

  return (
    <PrivacyOnboardingGate>
      <DashboardChrome
        key={canvasTab ? 'canvas' : 'panel'}
        navItems={navItems}
        activeId={tab}
        onSelect={selectTab}
        breadcrumb={meta.breadcrumb}
        searchPlaceholder={meta.searchPlaceholder}
        identity={{
          title: displayName(session, 'Workspace'),
          subtitle: session.wallet_address,
        }}
        mode="workspaces"
        variant={canvasTab ? 'canvas' : 'panel'}
        hideHeader={canvasTab}
        onModeChange={(next) => {
          if (next === 'personal') usePersonal();
        }}
      >
        <>
          <TabPanel active={tab === 'workspaces'}>
            <WorkspaceWorkspaces
              currentWorkspaceId={session.business_id}
              searchPlaceholder={meta.searchPlaceholder}
              identityTitle={displayName(session, 'Workspace')}
              breadcrumbVariant="account"
              onModeChange={(next) => {
                if (next === 'personal') usePersonal();
              }}
            />
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
