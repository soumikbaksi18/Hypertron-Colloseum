import {
  startTransition,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  CreditCard,
  LayoutGrid,
  ScrollText,
  Settings,
} from 'lucide-react';

import { useWalletSession } from '../context/WalletContext';
import {
  getAccountKind,
  setAccountKind,
  type AccountKind,
} from '../lib/account-kind';
import { DashboardChrome } from './chrome';
import { HubAudit, HubBilling, HubSettingsPanel } from './hub-panels';
import { HUB_TABS, isHubTab, type HubTab } from './hub-types';
import { HubWorkspaces } from './hub-workspaces';
import { KindGate } from './kind-gate';
import { PersonalShell } from './personal-shell';
import { PrivacyOnboardingGate } from './privacy-onboarding-gate';

const TAB_ICONS = {
  workspaces: LayoutGrid,
  audit: ScrollText,
  billing: CreditCard,
  settings: Settings,
} as const;

const TAB_META: Record<HubTab, { breadcrumb: string; searchPlaceholder: string }> = {
  workspaces: {
    breadcrumb: 'Account / Workspaces',
    searchPlaceholder: 'Search workspaces',
  },
  audit: {
    breadcrumb: 'Account / Auditor',
    searchPlaceholder: 'Search auditor',
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

export function HubShell() {
  const { session } = useWalletSession();
  const [kind, setKind] = useState<AccountKind | null>(null);
  const [kindReady, setKindReady] = useState(false);
  const [tab, setTab] = useState<HubTab>('workspaces');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session) return;
    setKind(getAccountKind(session.wallet_address));
    setKindReady(true);
  }, [session]);

  useEffect(() => {
    setTab(readTabFromUrl());
    setReady(true);
  }, []);

  const useWorkspaces = useCallback(() => {
    if (!session) return;
    setAccountKind(session.wallet_address, 'business');
    const url = new URL(window.location.href);
    url.searchParams.delete('tab');
    window.history.replaceState(null, '', url.pathname + url.search);
    setTab('workspaces');
    setKind('business');
  }, [session]);

  const usePersonal = useCallback(() => {
    if (!session) return;
    setAccountKind(session.wallet_address, 'individual');
    const url = new URL(window.location.href);
    url.searchParams.delete('tab');
    window.history.replaceState(null, '', url.pathname + url.search);
    setKind('individual');
  }, [session]);

  const selectTab = useCallback((next: string) => {
    if (!isHubTab(next)) return;
    startTransition(() => {
      setTab(next);
      const url = new URL(window.location.href);
      if (next === 'workspaces') url.searchParams.delete('tab');
      else url.searchParams.set('tab', next);
      window.history.replaceState(null, '', url.pathname + url.search);
    });
  }, []);

  if (!session) return null;
  if (!kindReady) return <div className="boot" />;
  if (!kind) {
    return (
      <DashboardChrome
        navItems={[]}
        activeId=""
        onSelect={() => undefined}
        breadcrumb="Account / Setup"
        searchPlaceholder="Search"
        identity={{
          title: session.handle ?? 'Hypertron',
          subtitle: session.wallet_address,
        }}
      >
        <KindGate onChosen={setKind} />
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

  return (
    <PrivacyOnboardingGate>
    <DashboardChrome
      navItems={navItems}
      activeId={tab}
      onSelect={selectTab}
      breadcrumb={meta.breadcrumb}
      searchPlaceholder={meta.searchPlaceholder}
      identity={{
        title: session.name.trim() || 'Workspace',
        subtitle: session.wallet_address,
      }}
      mode="workspaces"
      onModeChange={(next) => {
        if (next === 'personal') usePersonal();
      }}
    >
      {!ready ? null : (
        <>
          <TabPanel active={tab === 'workspaces'}>
            <HubWorkspaces />
          </TabPanel>
          <TabPanel active={tab === 'audit'}>
            <HubAudit />
          </TabPanel>
          <TabPanel active={tab === 'billing'}>
            <HubBilling />
          </TabPanel>
          <TabPanel active={tab === 'settings'}>
            <HubSettingsPanel />
          </TabPanel>
        </>
      )}
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
  return (
    <div hidden={!active} className={active ? 'block' : 'hidden'} aria-hidden={!active}>
      {children}
    </div>
  );
}
