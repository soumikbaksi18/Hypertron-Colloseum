import { useNavigate } from "react-router-dom";
import { useWalletSession } from "../../context/WalletContext";

export function HubAudit() {
  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight text-slate-950">
        Audit
      </h1>
      <p className="mt-1 max-w-xl text-sm text-slate-500">
        Account-level activity across your workspaces. Invoice and agent events
        stay inside each workspace.
      </p>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">No account events yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Workspace creation and access will show up here.
        </p>
      </div>
    </div>
  );
}

export function HubBilling() {
  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight text-slate-950">
        Billing &amp; Plans
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Every new workspace starts on Starter.
      </p>
      <article className="mt-6 max-w-lg rounded-2xl border border-[#E7B66D]/40 bg-[linear-gradient(135deg,#fffdf9_0%,#f8f0e2_100%)] p-6">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#E7B66D] uppercase">
          Current plan
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">Starter</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Payment links, developer keys, and the agent console for each workspace
          you create. Plan changes are coming soon.
        </p>
      </article>
    </div>
  );
}

export function HubSettingsPanel() {
  const navigate = useNavigate();
  const { session, signOut } = useWalletSession();

  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight text-slate-950">
        Settings
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        This wallet owns the workspaces on the account. Payout addresses live
        inside each workspace.
      </p>
      <div className="mt-6 max-w-lg rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          Signed in
        </p>
        <p className="mt-2 break-all font-mono text-sm text-slate-800">
          {session?.wallet_address}
        </p>
        <button
          type="button"
          onClick={() => {
            void signOut().then(() => navigate("/"));
          }}
          className="mt-5 inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
