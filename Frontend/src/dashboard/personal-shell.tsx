import { startTransition, useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ScanEye,
  Settings,
  Wallet,
} from 'lucide-react';

import { useWalletSession } from '../context/WalletContext';
import { AuditorPage } from './auditor-page';
import { DashboardChrome, type BreadcrumbCrumb } from './chrome';
import {
  PersonalActivity,
  PersonalSettings,
  PersonalWallet,
} from './personal-pages';

type PersonalTab = 'wallet' | 'activity' | 'auditor' | 'settings';

const TABS: { id: PersonalTab; label: string; icon: typeof Wallet }[] = [
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'activity', label: 'Activity', icon: ArrowLeftRight },
  { id: 'auditor', label: 'Auditor', icon: ScanEye },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const META: Record<PersonalTab, { breadcrumb: string; searchPlaceholder: string }> = {
  wallet: { breadcrumb: 'Personal / Wallet', searchPlaceholder: 'Search wallet' },
  activity: { breadcrumb: 'Personal / Activity', searchPlaceholder: 'Search activity' },
  auditor: { breadcrumb: 'Personal / Auditor', searchPlaceholder: 'Search auditor' },
  settings: { breadcrumb: 'Personal / Settings', searchPlaceholder: 'Search settings' },
};

function isPersonalTab(value: string | null): value is PersonalTab {
  return (
    value === 'wallet' ||
    value === 'activity' ||
    value === 'auditor' ||
    value === 'settings'
  );
}

export function PersonalShell({
  onUseWorkspaces,
  onGoApp,
}: {
  onUseWorkspaces: () => void;
  onGoApp: () => void;
}) {
  const { session } = useWalletSession();
  const [tab, setTab] = useState<PersonalTab>('wallet');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('tab');
    setTab(isPersonalTab(value) ? value : 'wallet');
    setReady(true);
  }, []);

  const selectTab = useCallback((next: string) => {
    if (!isPersonalTab(next)) return;
    startTransition(() => {
      setTab(next);
      const url = new URL(window.location.href);
      if (next === 'wallet') url.searchParams.delete('tab');
      else url.searchParams.set('tab', next);
      window.history.replaceState(null, '', url.pathname + url.search);
    });
  }, []);

  if (!session) return null;

  const untitled = !session.name.trim() || /^untitled/i.test(session.name);
  const title = untitled ? session.handle ?? 'Personal' : session.name.trim();
  const meta = META[tab];
  const section = meta.breadcrumb.split('/').pop()?.trim() || 'Wallet';
  const breadcrumb: BreadcrumbCrumb[] = [
    { label: 'App', onSelect: onGoApp },
    tab === 'wallet'
      ? { label: 'Personal' }
      : { label: 'Personal', onSelect: () => selectTab('wallet') },
    { label: section },
  ];

  return (
    <DashboardChrome
      navItems={TABS}
      activeId={tab}
      onSelect={selectTab}
      breadcrumb={breadcrumb}
      searchPlaceholder={meta.searchPlaceholder}
      identity={{
        title,
        subtitle: session.wallet_address,
      }}
      mode="personal"
      variant="canvas"
      onModeChange={(next) => {
        if (next === 'workspaces') onUseWorkspaces();
      }}
    >
      {!ready ? null : (
        <>
          {tab === 'wallet' ? <PersonalWallet /> : null}
          {tab === 'activity' ? <PersonalActivity /> : null}
          {tab === 'auditor' ? <AuditorPage /> : null}
          {tab === 'settings' ? <PersonalSettings /> : null}
        </>
      )}
    </DashboardChrome>
  );
}
