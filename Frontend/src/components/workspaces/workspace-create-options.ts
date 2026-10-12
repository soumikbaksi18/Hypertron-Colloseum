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
} from "lucide-react";

export type WizardStep = 1 | 2 | 3 | 4;

export type TeamInvite = {
  id: string;
  email: string;
  nickname: string;
  role: string;
  permission: string;
};

export type ContextStatus = "idle" | "loading" | "ready" | "error";

export type WorkspaceDraft = {
  currentStep: WizardStep;
  workspaceType: string;
  name: string;
  website: string;
  teamSize: string;
  logoDataUrl: string;
  logoName: string;
  invitedMembers: TeamInvite[];
  companyContext: string;
  contextApproved: boolean;
  contextStatus: ContextStatus;
  contextError: string;
  contextSourceUrl: string;
};

export type Option = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

export const STEPS = [
  "Workspace Type",
  "Workspace Details",
  "Invite Team",
  "Review & Create",
] as const;

export const DEFAULT_DRAFT: WorkspaceDraft = {
  currentStep: 1,
  workspaceType: "web3-startup",
  name: "",
  website: "",
  teamSize: "1-5",
  logoDataUrl: "",
  logoName: "",
  invitedMembers: [
    {
      id: "invite-1",
      email: "",
      nickname: "",
      role: "",
      permission: "full-access",
    },
  ],
  companyContext: "",
  contextApproved: false,
  contextStatus: "idle",
  contextError: "",
  contextSourceUrl: "",
};

export const WORKSPACE_TYPES: Option[] = [
  {
    id: "web3-startup",
    title: "Web3 Startup / Protocol",
    description: "For early-stage and growth-stage web3 companies",
    icon: Rocket,
    tone: "bg-[#F8F0E2] text-[#E7B66D]",
  },
  {
    id: "dao",
    title: "DAO",
    description: "For decentralized autonomous organizations",
    icon: Network,
    tone: "bg-[#F8F0E2] text-[#E7B66D]",
  },
  {
    id: "agency",
    title: "Agency",
    description: "For Web3 marketing, development and service agencies",
    icon: BriefcaseBusiness,
    tone: "bg-[#F8F0E2] text-[#E7B66D]",
  },
  {
    id: "foundation",
    title: "Foundation / Ecosystem",
    description: "For foundations and ecosystem organizations",
    icon: Landmark,
    tone: "bg-[#F8F0E2] text-[#E7B66D]",
  },
  {
    id: "infrastructure",
    title: "Infrastructure Provider",
    description: "For tools, platforms and infrastructure teams",
    icon: Server,
    tone: "bg-[#F8F0E2] text-[#E7B66D]",
  },
  {
    id: "service-company",
    title: "Service Company",
    description: "For Web3-native service and consulting firms",
    icon: UserRound,
    tone: "bg-[#F8F0E2] text-[#E7B66D]",
  },
  {
    id: "enterprise",
    title: "Enterprise Team",
    description: "For large organizations exploring or building in Web3",
    icon: Building2,
    tone: "bg-[#F8F0E2] text-[#E7B66D]",
  },
  {
    id: "other",
    title: "Other",
    description: "Something else",
    icon: MoreHorizontal,
    tone: "bg-[#F8F0E2] text-[#E7B66D]",
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
    id: "owner",
    title: "Owner",
    description: "Full control of workspace and all settings",
    seats: "1 seat",
    icon: ShieldCheck,
    iconClassName: "text-[#E7B66D]",
    iconBackground: "bg-[#F8F0E2]",
    seatsClassName: "bg-[#F8F0E2] text-[#0F1939]",
  },
  {
    id: "admin",
    title: "Admin",
    description: "Manage team, settings and operations",
    seats: "2 seats",
    icon: UserRound,
    iconClassName: "text-[#E7B66D]",
    iconBackground: "bg-[#F8F0E2]",
    seatsClassName: "bg-[#F8F0E2] text-[#0F1939]",
  },
  {
    id: "manager",
    title: "Manager",
    description: "Manage operations and workflows",
    seats: "5 seats",
    icon: BarChart3,
    iconClassName: "text-[#E7B66D]",
    iconBackground: "bg-[#F8F0E2]",
    seatsClassName: "bg-[#F8F0E2] text-[#0F1939]",
  },
  {
    id: "member",
    title: "Member",
    description: "View and contribute to assigned tasks",
    seats: "10 seats",
    icon: UserRound,
    iconClassName: "text-[#E7B66D]",
    iconBackground: "bg-[#F8F0E2]",
    seatsClassName: "bg-[#F8F0E2] text-[#0F1939]",
  },
  {
    id: "viewer",
    title: "Viewer",
    description: "View only access to workspace data",
    seats: "Unlimited",
    icon: Eye,
    iconClassName: "text-[#E7B66D]",
    iconBackground: "bg-[#F8F0E2]",
    seatsClassName: "bg-[#F8F0E2] text-[#0F1939]",
  },
];
