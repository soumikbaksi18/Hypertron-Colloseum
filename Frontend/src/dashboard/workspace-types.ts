export type WorkspaceTab =
  | 'overview'
  | 'payments'
  | 'treasury'
  | 'developers'
  | 'auditor'
  | 'workspaces'
  | 'settings';

export const WORKSPACE_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'payments', label: 'Payments' },
  { id: 'treasury', label: 'Treasury' },
  { id: 'developers', label: 'Developers' },
  { id: 'auditor', label: 'Auditor' },
  { id: 'workspaces', label: 'Workspaces' },
  { id: 'settings', label: 'Settings' },
];

export function isWorkspaceTab(
  value: string | null | undefined,
): value is WorkspaceTab {
  return (
    value === 'overview' ||
    value === 'payments' ||
    value === 'treasury' ||
    value === 'developers' ||
    value === 'auditor' ||
    value === 'workspaces' ||
    value === 'settings'
  );
}
