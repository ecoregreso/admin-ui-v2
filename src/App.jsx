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
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
