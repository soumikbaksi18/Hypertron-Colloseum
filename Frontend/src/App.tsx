import { Navigate, Route, Routes } from 'react-router-dom';

import { WalletSessionProvider } from './context/WalletContext';
import { LandingPage } from './pages/LandingPage';
import { AppShell } from './pages/AppShell';
import { OverviewPage } from './pages/app/OverviewPage';
import { CollectPaymentsPage } from './pages/app/CollectPaymentsPage';
import { DevelopersPage } from './pages/app/DevelopersPage';
import { SettingsPage } from './pages/app/SettingsPage';
import { AgentsLayout } from './pages/app/AgentsLayout';
import { AgentAuthorityPage } from './pages/app/AgentAuthorityPage';
import { RequestPage } from './pages/app/RequestPage';
import { ApprovalsPage } from './pages/app/ApprovalsPage';
import { PaymentsPage } from './pages/app/PaymentsPage';
import { ReconcilePage } from './pages/app/ReconcilePage';
import { CheckoutPage } from './pages/CheckoutPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { NewWorkspacePage } from './pages/dashboard/NewWorkspacePage';
import './components/KeyGate.css';
import './App.css';

export default function App() {
  return (
    <WalletSessionProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pay/:id" element={<CheckoutPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/workspaces/new" element={<NewWorkspacePage />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="payments" element={<CollectPaymentsPage />} />
          <Route path="developers" element={<DevelopersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="agents" element={<AgentsLayout />}>
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
