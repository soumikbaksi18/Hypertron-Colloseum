import { useEffect, useState } from "react";
import {
  CreditCard,
  LayoutGrid,
  ScrollText,
  Settings,
} from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import "../../account/account.css";
import { PhantomGate } from "../../components/PhantomGate";
import { DashboardChrome } from "../../components/dashboard/dashboard-chrome";
import { HubAudit, HubBilling, HubSettingsPanel } from "../../components/dashboard/hub-panels";
import { HubWorkspaces } from "../../components/dashboard/hub-workspaces";
import { useWalletSession } from "../../context/WalletContext";
import { listWorkspaces, type WorkspaceRecord } from "../../lib/workspaces";

const NAV = [
  { id: "workspaces", label: "Workspaces", icon: LayoutGrid },
  { id: "audit", label: "Audit", icon: ScrollText },
  { id: "billing", label: "Billing & Plans", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type HubTab = (typeof NAV)[number]["id"];

const META: Record<HubTab, { breadcrumb: string; searchPlaceholder: string }> = {
  workspaces: {
    breadcrumb: "Account / Workspaces",
    searchPlaceholder: "Search workspaces",
  },
  audit: {
    breadcrumb: "Account / Audit",
    searchPlaceholder: "Search audit log",
  },
  billing: {
    breadcrumb: "Account / Billing",
    searchPlaceholder: "Search billing",
  },
  settings: {
    breadcrumb: "Account / Settings",
    searchPlaceholder: "Search settings",
  },
};

function isHubTab(value: string | null): value is HubTab {
  return NAV.some((item) => item.id === value);
}

export function DashboardPage() {
  const location = useLocation();
  const { ready, session } = useWalletSession();
  const [tab, setTab] = useState<HubTab>("workspaces");
  const [query, setQuery] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(location.search).get("tab");
    setTab(isHubTab(value) ? value : "workspaces");
  }, [location.search]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void listWorkspaces().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setWorkspaces(result.workspaces);
        setError(null);
      } else {
        setWorkspaces([]);
        setError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!ready || (session && workspaces === null)) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#0F1939] text-sm text-white/60">
        Loading…
      </div>
    );
  }

  if (!session) return <PhantomGate />;

  const allowEmpty =
    typeof location.state === "object" &&
    location.state !== null &&
    "allowEmpty" in location.state &&
    Boolean((location.state as { allowEmpty?: boolean }).allowEmpty);

  if (workspaces && workspaces.length === 0 && !error && !allowEmpty) {
    return <Navigate to="/dashboard/workspaces/new" replace />;
  }

  const meta = META[tab];
  const identityTitle = workspaces?.[0]?.name?.trim() || "Account";

  function selectTab(next: string) {
    if (!isHubTab(next)) return;
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "workspaces") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.pathname + url.search);
  }

  return (
    <DashboardChrome
      navItems={[...NAV]}
      activeId={tab}
      onSelect={selectTab}
      breadcrumb={meta.breadcrumb}
      searchPlaceholder={meta.searchPlaceholder}
      searchValue={query}
      onSearchChange={setQuery}
      identityTitle={identityTitle}
      identitySubtitle={session.wallet_address}
    >
      {error ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {error}
        </p>
      ) : null}
      {tab === "workspaces" ? (
        <HubWorkspaces workspaces={workspaces ?? []} query={query} />
      ) : null}
      {tab === "audit" ? <HubAudit /> : null}
      {tab === "billing" ? <HubBilling /> : null}
      {tab === "settings" ? <HubSettingsPanel /> : null}
    </DashboardChrome>
  );
}
