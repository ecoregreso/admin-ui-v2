import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
import { terminateVoucher } from "../api/vouchersApi";

export default function FinanceQueue() {
  const { staff } = useStaffAuth();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deps, setDeps] = useState([]);
  const [wds, setWds] = useState([]);
  const [txidByIntent, setTxidByIntent] = useState({});
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherReason, setVoucherReason] = useState("");
  const [voucherBusy, setVoucherBusy] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [voucherStatus, setVoucherStatus] = useState("");
  const [ownerTenantId, setOwnerTenantId] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return (localStorage.getItem("ptu_owner_tenant_id") || "").trim();
    } catch {
      return "";
    }
  });
  const isOwner = staff?.role === "owner";
  const canVoucherCashout = (staff?.permissions || []).includes("voucher:terminate");

  const tokenPresent = useMemo(
    () => !!localStorage.getItem("ptu_staff_token"),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (isOwner) {
        localStorage.setItem("ptu_owner_tenant_id", ownerTenantId);
      }
    } catch {
      // ignore localStorage failures
    }
  }, [isOwner, ownerTenantId]);

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const [d, w] = await Promise.all([
        api.get("/api/v1/deposits/admin/pending"),
        api.get("/api/v1/withdrawals/admin/pending"),
      ]);
      setDeps(d.data.intents || []);
      setWds(w.data.intents || []);
    } catch (e) {
      const message = e?.response?.data?.error || e.message || String(e);
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  async function markPaid(intentId) {
    const txid = txidByIntent[intentId] || `manual-${Date.now()}`;
    try {
      await api.post("/api/v1/deposits/dev/mark-paid", { intentId, txid });
      await refresh();
    } catch (e) {
      const message = e?.response?.data?.error || e.message || String(e);
      setErr(message);
    }
  }

  async function markSent(intentId) {
    const txid = txidByIntent[intentId] || `manual-${Date.now()}`;
    try {
      await api.post("/api/v1/withdrawals/dev/mark-sent", { intentId, txid });
      await refresh();
    } catch (e) {
      const message = e?.response?.data?.error || e.message || String(e);
      setErr(message);
    }
  }

  async function cashoutVoucher(e) {
    e.preventDefault();
    setVoucherError("");
    setVoucherStatus("");

    if (!canVoucherCashout) {
      setVoucherError("You do not have permission to cashout vouchers.");
      return;
    }
    const code = String(voucherCode || "").trim();
    if (!code) {
      setVoucherError("Voucher code is required.");
      return;
    }
    const ownerTenant = String(ownerTenantId || "").trim();
    if (isOwner && !ownerTenant) {
      setVoucherError("Owner must provide a tenant ID.");
      return;
    }

    setVoucherBusy(true);
    try {
      const data = await terminateVoucher({
        code,
        reason: String(voucherReason || "").trim() || undefined,
        tenantId: isOwner ? ownerTenant : undefined,
      });
      const terminatedCode = data?.voucher?.code || code;
      setVoucherStatus(`Voucher ${terminatedCode} cashout completed.`);
      setVoucherCode("");
      setVoucherReason("");
    } catch (error) {
      const message =
        error?.response?.data?.error || error?.message || "Failed to cashout voucher.";
      setVoucherError(message);
    } finally {
      setVoucherBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Finance Queue</h2>
            <p className="panel-subtitle">Pending deposit and withdrawal intents.</p>
          </div>
          <div className="panel-actions">
            <button className="btn btn-primary" onClick={refresh} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
        {!tokenPresent && (
          <div className="alert">No staff token found in localStorage. Login first.</div>
        )}
        {err && (
          <div className="alert">
            {err} (Bitcoin queue may be disabled if ENABLE_BITCOIN is not set)
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Voucher Cashout</h3>
            <p className="panel-subtitle">
              Terminates a voucher for cashier cashout operations. Jackpot wins are handled separately.
            </p>
          </div>
        </div>

        {voucherError && <div className="alert alert-error">{voucherError}</div>}
        {voucherStatus && <div className="alert">{voucherStatus}</div>}
        {!voucherError && !canVoucherCashout && (
          <div className="alert">You do not have permission to cashout vouchers.</div>
        )}

        <form className="form-grid" onSubmit={cashoutVoucher}>
          <div className="field">
            <label>Voucher Code</label>
            <input
              className="input"
              type="text"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value || "")}
              placeholder="Voucher code"
              disabled={voucherBusy || !canVoucherCashout}
            />
          </div>
          <div className="field">
            <label>Reason</label>
            <input
              className="input"
              type="text"
              value={voucherReason}
              onChange={(e) => setVoucherReason(e.target.value || "")}
              placeholder="optional reason"
              disabled={voucherBusy || !canVoucherCashout}
            />
          </div>
          {isOwner && (
            <div className="field">
              <label>Tenant ID</label>
              <input
                className="input"
                type="text"
                value={ownerTenantId}
                onChange={(e) => setOwnerTenantId(e.target.value || "")}
                placeholder="Tenant UUID"
                disabled={voucherBusy}
              />
            </div>
          )}
          <div className="field" style={{ alignSelf: "end" }}>
            <button
              className="btn btn-danger"
              type="submit"
              disabled={voucherBusy || !canVoucherCashout}
            >
              {voucherBusy ? "Processing..." : "Cashout Voucher"}
            </button>
          </div>
        </form>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Pending Deposits</h3>
              <p className="panel-subtitle">{deps.length} intents</p>
            </div>
          </div>
          {deps.length === 0 && <div className="empty">None</div>}
          {deps.map((i) => (
            <div key={i.id} className="panel" style={{ marginBottom: 12 }}>
              <div className="inline" style={{ justifyContent: "space-between" }}>
                <div>
                  <div className="stat-label">Amount</div>
                  <div className="stat-value">{i.amountFun} FUN</div>
                  <div className="stat-meta">{i.id}</div>
                  <div className="stat-meta">expires: {String(i.expiresAt)}</div>
                </div>
                <div className="stack" style={{ minWidth: 220 }}>
                  <input
                    className="input"
                    placeholder="txid (optional)"
                    value={txidByIntent[i.id] || ""}
                    onChange={(e) =>
                      setTxidByIntent((m) => ({ ...m, [i.id]: e.target.value }))
                    }
                  />
                  <button className="btn btn-secondary" onClick={() => markPaid(i.id)}>
                    Mark Paid
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Pending Withdrawals</h3>
              <p className="panel-subtitle">{wds.length} intents</p>
            </div>
          </div>
          {wds.length === 0 && <div className="empty">None</div>}
          {wds.map((i) => (
            <div key={i.id} className="panel" style={{ marginBottom: 12 }}>
              <div className="inline" style={{ justifyContent: "space-between" }}>
                <div>
                  <div className="stat-label">Amount</div>
                  <div className="stat-value">{i.amountFun} FUN</div>
                  <div className="stat-meta">{i.id}</div>
                  <div className="stat-meta">to: {i.address}</div>
                  <div className="stat-meta">expires: {String(i.expiresAt)}</div>
                </div>
                <div className="stack" style={{ minWidth: 220 }}>
                  <input
                    className="input"
                    placeholder="txid (optional)"
                    value={txidByIntent[i.id] || ""}
                    onChange={(e) =>
                      setTxidByIntent((m) => ({ ...m, [i.id]: e.target.value }))
                    }
                  />
                  <button className="btn btn-secondary" onClick={() => markSent(i.id)}>
                    Mark Sent
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
