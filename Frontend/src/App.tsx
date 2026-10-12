import { Navigate, Route, Routes } from 'react-router-dom';

import { WalletSessionProvider } from './context/WalletContext';
import { DashAuth } from './dashboard/dash-auth';
import { HubShell } from './dashboard/hub-shell';
import { WorkspaceCreateWizard } from './dashboard/workspace-create-wizard';
import { WorkspaceShell } from './dashboard/workspace-shell';
import { LandingPage } from './pages/LandingPage';
import { AppShell } from './pages/AppShell';
import { AgentAuthorityPage } from './pages/app/AgentAuthorityPage';
import { AgentsLayout } from './pages/app/AgentsLayout';
import { ApprovalsPage } from './pages/app/ApprovalsPage';
import { PaymentsPage } from './pages/app/PaymentsPage';
import { ReconcilePage } from './pages/app/ReconcilePage';
import { RequestPage } from './pages/app/RequestPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { SlidesPage } from './pages/SlidesPage';
import './components/KeyGate.css';
import './App.css';

export default function App() {
  return (
    <WalletSessionProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pay/:id" element={<CheckoutPage />} />
        <Route path="/slides" element={<SlidesPage />} />
        <Route
          path="/app"
          element={
            <DashAuth>
              <HubShell />
            </DashAuth>
          }
        />
        <Route
          path="/app/workspaces/new"
          element={
            <DashAuth>
              <WorkspaceCreateWizard />
            </DashAuth>
          }
        />
        <Route
          path="/app/w/:workspaceId"
          element={
            <DashAuth>
              <WorkspaceShell />
            </DashAuth>
          }
        />
        <Route path="/app/payments" element={<Navigate to="/app" replace />} />
        <Route path="/app/developers" element={<Navigate to="/app" replace />} />
        <Route path="/app/settings" element={<Navigate to="/app?tab=settings" replace />} />
        <Route path="/app/agents" element={<AppShell />}>
          <Route element={<AgentsLayout />}>
            <Route index element={<AgentAuthorityPage />} />
            <Route path="request" element={<RequestPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="ledger" element={<PaymentsPage />} />
            <Route path="reconcile" element={<ReconcilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </WalletSessionProvider>
  );
}
