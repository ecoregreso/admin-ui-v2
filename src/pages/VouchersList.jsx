import React, { useEffect, useMemo, useState } from "react";
import { createVoucher, listVouchers } from "../api/vouchersApi";
import { useStaffAuth } from "../context/StaffAuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const TENANT_STORAGE_KEY = "ptu_tenant_id";

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
  const { staff } = useStaffAuth();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [amount, setAmount] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [currency, setCurrency] = useState("FUN");
  const [tenantId, setTenantId] = useState(() => localStorage.getItem(TENANT_STORAGE_KEY) || "");

  const [created, setCreated] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const requiresTenant = staff?.role === "owner" && !staff?.tenantId;

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

    const resolvedTenantId = requiresTenant ? tenantId.trim() : staff?.tenantId || "";
    if (requiresTenant && !resolvedTenantId) {
      return setError("Tenant ID is required for owner-issued vouchers.");
    }

    try {
      if (resolvedTenantId) {
        localStorage.setItem(TENANT_STORAGE_KEY, resolvedTenantId);
      }
      const data = await createVoucher({
        amount: a,
        bonusAmount: b,
        currency,
        tenantId: resolvedTenantId || undefined,
      });
      setCreated(data);
      setAmount("");
      setBonusAmount("");
      await load();
    } catch (e) {
      console.error(e);
      const message = e?.response?.data?.error || e?.response?.data?.message;
      setError(message || "Failed to create voucher.");
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
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Voucher Operations</h2>
            <p className="panel-subtitle">Create vouchers and print/scan QR for player login.</p>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}

        <form className="form-grid" onSubmit={onCreate}>
          {requiresTenant && (
            <div className="field">
              <label>Tenant ID</label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="input"
                placeholder="Tenant UUID"
                required
              />
            </div>
          )}
          <div className="field">
            <label>Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              required
            />
          </div>

          <div className="field">
            <label>Bonus Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              className="input"
            />
          </div>

          <div className="field">
            <label>Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="select"
            >
              <option value="FUN">FUN</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div className="field" style={{ alignSelf: "end" }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Create Voucher
            </button>
          </div>
        </form>

        {created?.voucher && (
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-header">
              <h3 className="panel-title">Created Voucher</h3>
            </div>
            <div className="grid-3">
              <div>
                <div className="stat-label">User Code</div>
                <div className="stat-value">{created.userCode}</div>
              </div>
              <div>
                <div className="stat-label">PIN</div>
                <div className="stat-value">{created.pin}</div>
              </div>
              <div>
                <div className="stat-label">Voucher Code</div>
                <div className="stat-value">{created.voucher.code}</div>
              </div>
            </div>

            {created.qr?.path && (
              <div style={{ marginTop: 16 }}>
                <div className="stat-label" style={{ marginBottom: 8 }}>
                  QR Code
                </div>
                <img
                  src={`${API_BASE_URL}/${created.qr.path}`}
                  alt="Voucher QR"
                  style={{ width: 180, height: 180, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Recent Vouchers</h3>
            <p className="panel-subtitle">Search by voucher code or user code.</p>
          </div>
          <div className="panel-actions">
            <input
              type="text"
              placeholder="Search (code / userCode)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="select"
            >
              <option value="">All statuses</option>
              <option value="new">new</option>
              <option value="redeemed">redeemed</option>
              <option value="cancelled">cancelled</option>
              <option value="expired">expired</option>
            </select>
            <button className="btn btn-ghost" onClick={load} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Voucher</th>
                <th>User Code</th>
                <th>PIN</th>
                <th>Amount</th>
                <th>Bonus</th>
                <th>Cur</th>
                <th>Status</th>
                <th>Creator</th>
                <th>QR</th>
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
                    ? `user:${String(v.createdByUserId || "").slice(0, 8)}...`
                    : "";

                return (
                  <tr key={v.id}>
                    <td>{fmtDate(v.createdAt)}</td>
                    <td>{v.code}</td>
                    <td>{userCode}</td>
                    <td>{v.pin || "-"}</td>
                    <td>${fmt(v.amount)}</td>
                    <td>${fmt(v.bonusAmount)}</td>
                    <td>{v.currency}</td>
                    <td>{v.status}</td>
                    <td>{creator}</td>
                    <td>
                      {qrPath ? (
                        <a
                          className="tag tag-blue"
                          href={`${API_BASE_URL}/${qrPath}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
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
                  <td colSpan={10} className="empty">
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
