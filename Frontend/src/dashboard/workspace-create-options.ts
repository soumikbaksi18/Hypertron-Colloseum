import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Eye,
  Landmark,
  MoreHorizontal,
  Network,
  Rocket,
  Server,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type AccountKind = 'business' | 'individual';

export type TeamInvite = {
  id: string;
  email: string;
  nickname: string;
  role: string;
  permission: string;
};

export type WorkspaceDraft = {
  currentStep: WizardStep;
  accountKind: AccountKind | '';
  workspaceType: string;
  name: string;
  website: string;
  teamSize: string;
  logoDataUrl: string;
  logoName: string;
  invitedMembers: TeamInvite[];
  companyContext: string;
};

export type Option = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

export const BUSINESS_STEPS = [
  'Account type',
  'Workspace Type',
  'Workspace Details',
  'Invite Team',
  'Review & Create',
] as const;

export const INDIVIDUAL_STEPS = ['Account type', 'Your profile'] as const;

export const DEFAULT_DRAFT: WorkspaceDraft = {
  currentStep: 1,
  accountKind: 'individual',
  workspaceType: 'web3-startup',
  name: '',
  website: '',
  teamSize: '1-5',
  logoDataUrl: '',
  logoName: '',
  invitedMembers: [
    {
      id: 'invite-1',
      email: '',
      nickname: '',
      role: '',
      permission: 'full-access',
    },
  ],
  companyContext: '',
};

export const ACCOUNT_KINDS: Option[] = [
  {
    id: 'business',
    title: 'Business',
    description: 'Collect invoices, run treasury, and invite a team.',
    icon: BriefcaseBusiness,
    tone: 'border border-[#C3D0E8]/35 text-[#c9b56a]',
  },
  {
    id: 'individual',
    title: 'Individual',
    description: 'A personal workspace for private USDC and payment links.',
    icon: UserRound,
    tone: 'border border-[#C3D0E8]/35 text-[#c9b56a]',
  },
];

export const WORKSPACE_TYPES: Option[] = [
  {
    id: 'web3-startup',
    title: 'Web3 Startup / Protocol',
    description: 'For early-stage and growth-stage web3 companies',
    icon: Rocket,
    tone: 'border border-[#C3D0E8]/35 text-[#c9b56a]',
  },
  {
    id: 'dao',
    title: 'DAO',
    description: 'For decentralized autonomous organizations',
    icon: Network,
    tone: 'border border-[#C3D0E8]/35 text-[#c9b56a]',
  },
  {
    id: 'agency',
    title: 'Agency',
    description: 'For Web3 marketing, development and service agencies',
    icon: BriefcaseBusiness,
    tone: 'border border-[#C3D0E8]/35 text-[#c9b56a]',
  },
  {
    id: 'foundation',
    title: 'Foundation / Ecosystem',
    description: 'For foundations and ecosystem organizations',
    icon: Landmark,
    tone: 'border border-[#C3D0E8]/35 text-[#c9b56a]',
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure Provider',
    description: 'For tools, platforms and infrastructure teams',
    icon: Server,
    tone: 'border border-[#C3D0E8]/35 text-[#c9b56a]',
  },
  {
    id: 'service-company',
    title: 'Service Company',
    description: 'For Web3-native service and consulting firms',
    icon: UserRound,
    tone: 'border border-[#C3D0E8]/35 text-[#c9b56a]',
  },
  {
    id: 'enterprise',
    title: 'Enterprise Team',
    description: 'For large organizations exploring or building in Web3',
    icon: Building2,
    tone: 'border border-[#C3D0E8]/35 text-[#c9b56a]',
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Something else',
    icon: MoreHorizontal,
    tone: 'border border-[#C3D0E8]/35 text-[#c9b56a]',
  },
];

export const SUGGESTED_ROLES: Array<{
  id: string;
  title: string;
  description: string;
  seats: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBackground: string;
  seatsClassName: string;
}> = [
  {
    id: 'owner',
    title: 'Owner',
    description: 'Full control of workspace and all settings',
    seats: '1 seat',
    icon: ShieldCheck,
    iconClassName: 'text-[#c9b56a]',
    iconBackground: 'border border-[#C3D0E8]/35',
    seatsClassName: 'border border-[#C3D0E8]/35 text-[#C3D0E8]',
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'Manage team, settings and operations',
    seats: '2 seats',
    icon: UserRound,
    iconClassName: 'text-[#c9b56a]',
    iconBackground: 'border border-[#C3D0E8]/35',
    seatsClassName: 'border border-[#C3D0E8]/35 text-[#C3D0E8]',
  },
  {
    id: 'manager',
    title: 'Manager',
    description: 'Manage operations and workflows',
    seats: '5 seats',
    icon: BarChart3,
    iconClassName: 'text-[#c9b56a]',
    iconBackground: 'border border-[#C3D0E8]/35',
    seatsClassName: 'border border-[#C3D0E8]/35 text-[#C3D0E8]',
  },
  {
    id: 'member',
    title: 'Member',
    description: 'View and contribute to assigned tasks',
    seats: '10 seats',
    icon: UserRound,
    iconClassName: 'text-[#c9b56a]',
    iconBackground: 'border border-[#C3D0E8]/35',
    seatsClassName: 'border border-[#C3D0E8]/35 text-[#C3D0E8]',
  },
  {
    id: 'viewer',
    title: 'Viewer',
    description: 'View only access to workspace data',
    seats: 'Unlimited',
    icon: Eye,
    iconClassName: 'text-[#c9b56a]',
    iconBackground: 'border border-[#C3D0E8]/35',
    seatsClassName: 'border border-[#C3D0E8]/35 text-[#C3D0E8]',
  },
];
