import {
  BriefcaseBusiness,
  Code2,
  Landmark,
  LayoutGrid,
  Receipt,
  Settings,
  ShieldCheck,
} from 'lucide-react';

import type { DashboardNavItem } from './chrome';

/** Inactive workspace nav shown during account / workspace setup. */
export const SETUP_PREVIEW_NAV: DashboardNavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'payments', label: 'Payments', icon: Receipt },
  { id: 'treasury', label: 'Treasury', icon: Landmark },
  { id: 'developers', label: 'Developers', icon: Code2 },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'workspaces', label: 'Workspaces', icon: BriefcaseBusiness },
  { id: 'settings', label: 'Settings', icon: Settings, dividerBefore: true },
];
