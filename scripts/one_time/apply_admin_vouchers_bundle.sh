#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "==> Writing src/api/vouchersApi.js"
cat > src/api/vouchersApi.js <<'JS'
// src/api/vouchersApi.js
import api from "./client";

export async function listVouchers({ limit = 200 } = {}) {
  const res = await api.get(`/api/v1/vouchers?limit=${limit}`);
  return res.data; // array
}

export async function createVoucher({ amount, bonusAmount = 0, currency = "FUN" }) {
  const res = await api.post("/api/v1/vouchers", { amount, bonusAmount, currency });
  return res.data; // { voucher, pin, userCode, qr }
}
JS

echo "==> Fixing src/api/reportsApi.js to match backend mount (/api/v1/admin/reports)"
cat > src/api/reportsApi.js <<'JS'
// src/api/reportsApi.js
import api from "./client";

/**
 * GET /api/v1/admin/reports/range?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function fetchRangeReport({ from, to }) {
  const res = await api.get("/api/v1/admin/reports/range", {
    params: { from, to },
  });
  return res.data;
}
JS

echo "==> Writing full src/pages/VouchersList.jsx"
cat > src/pages/VouchersList.jsx <<'JS'
import React, { useEffect, useMemo, useState } from "react";
import { createVoucher, listVouchers } from "../api/vouchersApi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function fmt(n) {
  if (n == null) return "0";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(s) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return "";
  }
}

export default function VouchersList() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [amount, setAmount] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [currency, setCurrency] = useState("FUN");

  const [created, setCreated] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    setError("");
    setLoading(true);
    try {
      const data = await listVouchers({ limit: 200 });
      setVouchers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load vouchers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setError("");
    setCreated(null);

    const a = Number(amount);
    const b = Number(bonusAmount || 0);

    if (!Number.isFinite(a) || a <= 0) return setError("Amount must be > 0.");
    if (!Number.isFinite(b) || b < 0) return setError("Bonus must be >= 0.");

    try {
      const data = await createVoucher({ amount: a, bonusAmount: b, currency });
      setCreated(data);
      setAmount("");
      setBonusAmount("");
      await load();
    } catch (e) {
      console.error(e);
      setError("Failed to create voucher.");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vouchers.filter((v) => {
      if (status && v.status !== status) return false;
      if (!q) return true;
      const code = String(v.code || "").toLowerCase();
      const userCode = String(v?.metadata?.userCode || "").toLowerCase();
      return code.includes(q) || userCode.includes(q);
    });
  }, [vouchers, search, status]);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-title">Vouchers</div>
        <div className="card-subtext">Create vouchers and print/scan QR for player login.</div>

        {error && (
          <div className="mt-3 text-sm text-red-300 bg-red-950/30 border border-red-900 rounded p-2">
            {error}
          </div>
        )}

        <form className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end" onSubmit={onCreate}>
          <div>
            <label className="text-xs text-slate-400">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Bonus Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100"
            >
              <option value="FUN">FUN</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            Create Voucher
          </button>
        </form>

        {created?.voucher && (
          <div className="mt-4 border border-slate-800 rounded p-3 bg-slate-950/40">
            <div className="text-sm text-slate-200 font-medium">Created</div>

            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="text-slate-300">
                <div className="text-slate-500">User Code</div>
                <div className="font-mono text-slate-100">{created.userCode}</div>
              </div>
              <div className="text-slate-300">
                <div className="text-slate-500">PIN</div>
                <div className="font-mono text-slate-100">{created.pin}</div>
              </div>
              <div className="text-slate-300">
                <div className="text-slate-500">Voucher Code</div>
                <div className="font-mono text-slate-100">{created.voucher.code}</div>
              </div>
            </div>

            {created.qr?.path && (
              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-2">QR</div>
                <img
                  src={`${API_BASE_URL}/${created.qr.path}`}
                  alt="Voucher QR"
                  className="w-48 h-48 rounded border border-slate-800 bg-white"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <div className="card-title">Recent vouchers</div>
            <div className="card-subtext">Search by voucher code or user code.</div>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search (code / userCode)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100"
            >
              <option value="">All statuses</option>
              <option value="new">new</option>
              <option value="redeemed">redeemed</option>
              <option value="cancelled">cancelled</option>
              <option value="expired">expired</option>
            </select>
            <button className="btn-secondary" onClick={load} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="py-1 pr-2">Created</th>
                <th className="py-1 pr-2">Voucher</th>
                <th className="py-1 pr-2">UserCode</th>
                <th className="py-1 pr-2 text-right">Amount</th>
                <th className="py-1 pr-2 text-right">Bonus</th>
                <th className="py-1 pr-2">Cur</th>
                <th className="py-1 pr-2">Status</th>
                <th className="py-1 pr-2">Creator</th>
                <th className="py-1 pr-2">QR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => {
                const userCode = v?.metadata?.userCode || "";
                const qrPath = v?.metadata?.qrPath || "";
                const creator =
                  v.createdByActorType === "staff"
                    ? `staff#${v.createdByStaffId}`
                    : v.createdByActorType === "user"
                    ? `user:${String(v.createdByUserId || "").slice(0, 8)}…`
                    : "";

                return (
                  <tr key={v.id} className="border-b border-slate-800 hover:bg-slate-900">
                    <td className="py-1 pr-2 text-xs">{fmtDate(v.createdAt)}</td>
                    <td className="py-1 pr-2 text-xs font-mono">{v.code}</td>
                    <td className="py-1 pr-2 text-xs font-mono">{userCode}</td>
                    <td className="py-1 pr-2 text-xs text-right">{fmt(v.amount)}</td>
                    <td className="py-1 pr-2 text-xs text-right">{fmt(v.bonusAmount)}</td>
                    <td className="py-1 pr-2 text-xs">{v.currency}</td>
                    <td className="py-1 pr-2 text-xs">{v.status}</td>
                    <td className="py-1 pr-2 text-xs">{creator}</td>
                    <td className="py-1 pr-2 text-xs">
                      {qrPath ? (
                        <a
                          className="text-cyan-300 hover:text-cyan-200"
                          href={`${API_BASE_URL}/${qrPath}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          view
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && !loading && (
                <tr>
                  <td colSpan={9} className="py-3 text-center text-xs text-slate-500">
                    No vouchers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
JS

echo "==> Writing full src/App.jsx (add /vouchers route)"
cat > src/App.jsx <<'JS'
// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ReportsDashboard from "./pages/ReportsDashboard.jsx";
import VouchersList from "./pages/VouchersList.jsx";
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
          <Route path="vouchers" element={<VouchersList />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
JS

echo "==> Writing full src/layout/AdminLayout.jsx (add Vouchers nav)"
cat > src/layout/AdminLayout.jsx <<'JS'
// src/layout/AdminLayout.jsx
import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors " +
        (isActive
          ? "bg-slate-800 text-cyan-300"
          : "text-slate-300 hover:bg-slate-800/70 hover:text-white")
      }
    >
      {({ isActive }) => (
        <>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: isActive ? "#4fd1ff" : "rgba(255,255,255,0.22)",
            }}
          />
          {children}
        </>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { staff, logout } = useStaffAuth();

  return (
    <div className="app-shell min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="sidebar w-64 border-r border-slate-800 bg-slate-950/80 backdrop-blur">
        <div
          style={{
            padding: "18px 18px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 0.5 }}>
            PlayTime USA
          </div>
          <div style={{ fontSize: 12, color: "rgba(226,232,240,0.7)", marginTop: 4 }}>
            Admin Control Panel
          </div>
        </div>

        <nav
          style={{
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <NavItem to="/dashboard">Dashboard</NavItem>
          <NavItem to="/reports">Reports</NavItem>
          <NavItem to="/vouchers">Vouchers</NavItem>
        </nav>

        <div
          style={{
            marginTop: "auto",
            padding: 16,
            borderTop: "1px solid rgba(148,163,184,0.2)",
            fontSize: 13,
          }}
        >
          {staff && (
            <>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>{staff.username}</div>
              <div style={{ color: "rgba(148,163,184,0.9)", marginBottom: 10 }}>
                Role: {staff.role}
              </div>
            </>
          )}

          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between bg-slate-950/80 backdrop-blur">
          <div className="text-sm text-slate-400">
            {staff ? `Logged in as ${staff.username} (${staff.role})` : "Not authenticated"}
          </div>
        </header>

        <section className="flex-1 p-6 bg-slate-950">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
JS

echo "==> Done."
