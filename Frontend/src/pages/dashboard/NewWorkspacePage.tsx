import { PhantomGate } from "../../components/PhantomGate";
import { WorkspaceCreateWizard } from "../../components/workspaces/workspace-create-wizard";
import { useWalletSession } from "../../context/WalletContext";

export function NewWorkspacePage() {
  const { ready, session } = useWalletSession();

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#0F1939] text-sm text-white/60">
        Loading…
      </div>
    );
  }

  if (!session) return <PhantomGate />;

  return <WorkspaceCreateWizard />;
}
