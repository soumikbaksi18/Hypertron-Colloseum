export type HubTab = 'workspaces' | 'billing' | 'settings';

export const HUB_TABS: { id: HubTab; label: string }[] = [
  { id: 'workspaces', label: 'Workspaces' },
  { id: 'billing', label: 'Billing & Plans' },
  { id: 'settings', label: 'Settings' },
];

export function isHubTab(value: string | null | undefined): value is HubTab {
  return value === 'workspaces' || value === 'billing' || value === 'settings';
}
