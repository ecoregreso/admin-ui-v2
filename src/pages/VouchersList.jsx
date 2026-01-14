import React, { useEffect, useMemo, useState } from "react";
import { useStaffAuth } from "../context/StaffAuthContext";
import { createVoucher, listVouchers } from "../api/vouchersApi";
import { buildApiUrl } from "../api/client";

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
  const { staff } = useStaffAuth();
  const isOwner = staff?.role === "owner";
  const [ownerTenantId, setOwnerTenantId] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return (localStorage.getItem("ptu_owner_tenant_id") || "").trim();
    } catch {
      return "";
    }
  });

  const [created, setCreated] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");
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
      setError(e?.response?.data?.error || e?.message || "Failed to load vouchers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (isOwner) {
        localStorage.setItem("ptu_owner_tenant_id", ownerTenantId);
      } else {
        localStorage.removeItem("ptu_owner_tenant_id");
      }
    } catch (err) {
      console.warn("[VouchersList] failed to persist owner tenant id:", err);
    }
  }, [isOwner, ownerTenantId]);

  async function onCreate(e) {
    e.preventDefault();
    setError("");
    setCreated(null);

    const a = Number(amount);
    const b = Number(bonusAmount || 0);

    if (!Number.isFinite(a) || a <= 0) return setError("Amount must be > 0.");
    if (!Number.isFinite(b) || b < 0) return setError("Bonus must be >= 0.");

    const ownerTenant = ownerTenantId.trim();
    if (isOwner && !ownerTenant) {
      return setError("Owner must provide a tenant ID before creating vouchers.");
    }

    try {
      const payload = { amount: a, bonusAmount: b, currency };
      if (isOwner) {
        payload.tenantId = ownerTenant;
      }
      const data = await createVoucher(payload);
      setCreated(data);
      setAmount("");
      setBonusAmount("");
      await load();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || e?.message || "Failed to create voucher.");
    }
  }

  async function copyToClipboard(value, label) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopyStatus(`${label} copied.`);
    } catch (err) {
      console.error(err);
      setCopyStatus("Copy failed.");
    }
    setTimeout(() => setCopyStatus(""), 2000);
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

          {isOwner && (
            <div className="field">
              <label>Tenant ID</label>
              <input
                type="text"
                value={ownerTenantId}
                onChange={(e) => setOwnerTenantId(e.target.value || "")}
                className="input"
                placeholder="Tenant UUID"
              />
              <div className="hint">Owners must specify the tenant to issue a voucher.</div>
            </div>
          )}

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
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => copyToClipboard(created.userCode, "User code")}
                >
                  Copy
                </button>
              </div>
              <div>
                <div className="stat-label">PIN</div>
                <div className="stat-value">{created.pin}</div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => copyToClipboard(created.pin, "PIN")}
                >
                  Copy
                </button>
              </div>
              <div>
                <div className="stat-label">Voucher Code</div>
                <div className="stat-value">{created.voucher.code}</div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => copyToClipboard(created.voucher.code, "Voucher code")}
                >
                  Copy
                </button>
              </div>
            </div>
            {copyStatus && <div className="hint" style={{ marginTop: 8 }}>{copyStatus}</div>}

            {created.qr?.path && (
              <div style={{ marginTop: 16 }}>
                <div className="stat-label" style={{ marginBottom: 8 }}>
                  QR Code
                </div>
                <img
                  src={buildApiUrl(created.qr.path)}
                  alt="Voucher QR"
                  style={{ width: 180, height: 180, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)" }}
                />
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      copyToClipboard(buildApiUrl(created.qr.path), "QR url")
                    }
                  >
                    Copy QR URL
                  </button>
                </div>
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
                          href={buildApiUrl(qrPath)}
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
