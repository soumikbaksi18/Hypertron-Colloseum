import {
  Code2,
  CreditCard,
  Landmark,
  LayoutGrid,
  Receipt,
  Settings,
  ShieldCheck,
} from 'lucide-react';

import type { DashboardNavItem } from './chrome';

/** Tools inside a subscribed workspace. The app root is /app, not a nav item. */
export const APP_NAV: DashboardNavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'payments', label: 'Payments', icon: Receipt },
  { id: 'treasury', label: 'Treasury', icon: Landmark },
  { id: 'developers', label: 'Developers', icon: Code2 },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings, dividerBefore: true },
];

/** Account nav on the app root. Workspace tools appear only after you open one. */
export const HUB_NAV: DashboardNavItem[] = [
  { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
];
