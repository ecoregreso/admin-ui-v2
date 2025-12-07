// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ReportsDashboard from "./pages/ReportsDashboard.jsx";
import AdminLayout from "./layout/AdminLayout.jsx";
import { useStaffAuth } from "./context/StaffAuthContext.jsx";

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useStaffAuth();

  if (loading) {
    return <div className="text-slate-200 p-6">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="reports" element={<ReportsDashboard />} />
          {/* add more protected pages here */}
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

