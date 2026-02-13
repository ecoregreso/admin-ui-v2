import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ReportsDashboard from "./pages/ReportsDashboard.jsx";
import VouchersList from "./pages/VouchersList.jsx";
import PlayersList from "./pages/PlayersList.jsx";
import StaffList from "./pages/StaffList.jsx";
import FinanceQueue from "./pages/FinanceQueue.jsx";
import TransactionsList from "./pages/TransactionsList.jsx";
import SessionsList from "./pages/SessionsList.jsx";
import AuditLog from "./pages/AuditLog.jsx";
import SafetyDashboard from "./pages/SafetyDashboard.jsx";
import PurchaseOrders from "./pages/PurchaseOrders.jsx";
import Messages from "./pages/Messages.jsx";
import Maintenance from "./pages/Maintenance.jsx";
import AnalyticsOverview from "./pages/analytics/AnalyticsOverview.jsx";
import AnalyticsRevenue from "./pages/analytics/AnalyticsRevenue.jsx";
import AnalyticsPlayers from "./pages/analytics/AnalyticsPlayers.jsx";
import AnalyticsGames from "./pages/analytics/AnalyticsGames.jsx";
import AnalyticsOps from "./pages/analytics/AnalyticsOps.jsx";
import AnalyticsFunnel from "./pages/analytics/AnalyticsFunnel.jsx";
import AnalyticsAudit from "./pages/analytics/AnalyticsAudit.jsx";
import AnalyticsLtv from "./pages/analytics/AnalyticsLtv.jsx";
import Jackpots from "./pages/analytics/Jackpots.jsx";
import SecurityLab from "./pages/SecurityLab.jsx";
import SystemSettings from "./pages/SystemSettings.jsx";
import ShiftReconciliation from "./pages/ShiftReconciliation.jsx";
import AdminLayout from "./layout/AdminLayout.jsx";
import { useStaffAuth } from "./context/StaffAuthContext.jsx";

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useStaffAuth();

  if (loading) {
    return <div className="panel">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AccessDenied({ title, detail }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      <p className="panel-subtitle">{detail}</p>
    </div>
  );
}

function RequirePermission({ permission, children }) {
  const { staff } = useStaffAuth();
  const perms = staff?.permissions || [];
  const required = Array.isArray(permission) ? permission : [permission];
  const ok = required.some((perm) => perms.includes(perm));

  if (!ok) {
    return (
      <AccessDenied
        title="Access denied"
        detail="Your role does not include the permissions required for this module."
      />
    );
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={
              <RequirePermission permission="finance:read">
                <Dashboard />
              </RequirePermission>
            }
          />
          <Route
            path="dashboard"
            element={
              <RequirePermission permission="finance:read">
                <Dashboard />
              </RequirePermission>
            }
          />
          <Route
            path="players"
            element={
              <RequirePermission permission="player:read">
                <PlayersList />
              </RequirePermission>
            }
          />
          <Route
            path="vouchers"
            element={
              <RequirePermission permission="voucher:read">
                <VouchersList />
              </RequirePermission>
            }
          />
          <Route
            path="reports"
            element={
              <RequirePermission permission="finance:read">
                <ReportsDashboard />
              </RequirePermission>
            }
          />
          <Route
            path="safety"
            element={
              <RequirePermission permission="player:read">
                <SafetyDashboard />
              </RequirePermission>
            }
          />
          <Route
            path="analytics"
            element={
              <RequirePermission permission="finance:read">
                <AnalyticsOverview />
              </RequirePermission>
            }
          />
          <Route
            path="analytics/revenue"
            element={
              <RequirePermission permission="finance:read">
                <AnalyticsRevenue />
              </RequirePermission>
            }
          />
          <Route
            path="analytics/players"
            element={
              <RequirePermission permission="finance:read">
                <AnalyticsPlayers />
              </RequirePermission>
            }
          />
          <Route
            path="analytics/games"
            element={
              <RequirePermission permission="finance:read">
                <AnalyticsGames />
              </RequirePermission>
            }
          />
          <Route
            path="analytics/ops"
            element={
              <RequirePermission permission="finance:read">
                <AnalyticsOps />
              </RequirePermission>
            }
          />
          <Route
            path="analytics/funnel"
            element={
              <RequirePermission permission="finance:read">
                <AnalyticsFunnel />
              </RequirePermission>
            }
          />
          <Route
            path="analytics/ltv"
            element={
              <RequirePermission permission="finance:read">
                <AnalyticsLtv />
              </RequirePermission>
            }
          />
          <Route
            path="analytics/jackpots"
            element={
              <RequirePermission permission="finance:read">
                <Jackpots />
              </RequirePermission>
            }
          />
          <Route
            path="analytics/audit"
            element={
              <RequirePermission permission="finance:read">
                <AnalyticsAudit />
              </RequirePermission>
            }
          />
          <Route
            path="transactions"
            element={
              <RequirePermission permission="finance:read">
                <TransactionsList />
              </RequirePermission>
            }
          />
          <Route
            path="finance-queue"
            element={
              <RequirePermission permission={["finance:write", "finance:read"]}>
                <FinanceQueue />
              </RequirePermission>
            }
          />
          <Route
            path="finance/shifts"
            element={
              <RequirePermission permission="finance:read">
                <ShiftReconciliation />
              </RequirePermission>
            }
          />
          <Route
            path="purchase-orders"
            element={
              <RequirePermission permission="finance:read">
                <PurchaseOrders />
              </RequirePermission>
            }
          />
          <Route
            path="messages"
            element={
              <RequirePermission permission="player:read">
                <Messages />
              </RequirePermission>
            }
          />
          <Route
            path="pam"
            element={
              <RequirePermission permission="staff:manage">
                <StaffList />
              </RequirePermission>
            }
          />
          <Route
            path="sessions"
            element={
              <RequirePermission permission={["staff:manage", "player:read"]}>
                <SessionsList />
              </RequirePermission>
            }
          />
          <Route
            path="audit"
            element={
              <RequirePermission permission="staff:manage">
                <AuditLog />
              </RequirePermission>
            }
          />
          <Route
            path="maintenance"
            element={
              <RequirePermission permission="tenant:manage">
                <Maintenance />
              </RequirePermission>
            }
          />
          <Route
            path="security/lab"
            element={
              <RequirePermission permission="staff:manage">
                <SecurityLab />
              </RequirePermission>
            }
          />
          <Route
            path="system/settings"
            element={
              <RequirePermission permission="finance:read">
                <SystemSettings />
              </RequirePermission>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
