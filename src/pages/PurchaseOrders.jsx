import React, { useEffect, useMemo, useState } from "react";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";
import {
  listOrders,
  createOrder,
  updateOrderStatus,
} from "../api/purchaseOrdersApi.js";

// Simple status pill component
function StatusPill({ status }) {
  const map = {
    pending: { label: "Pending owner review", className: "pill pill-warn" },
    approved: { label: "Approved", className: "pill pill-success" },
    rejected: { label: "Rejected", className: "pill pill-danger" },
  };
  const meta = map[status] || { label: status, className: "pill" };
  return <span className={meta.className}>{meta.label}</span>;
}

export default function PurchaseOrders() {
  const { staff } = useStaffAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [funAmount, setFunAmount] = useState("");
  const [btcAmount, setBtcAmount] = useState("");
  const [btcRate, setBtcRate] = useState(""); // FUN per BTC (1 FUN ≈ 1 USD)
  const [note, setNote] = useState("");
  const [ownerBtcAddress, setOwnerBtcAddress] = useState("");

  const canApprove = useMemo(
    () => (staff?.permissions || []).includes("finance:write"),
    [staff]
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listOrders();
      setOrders(data);
    } catch (e) {
      console.error(e);
      setError("Failed to load purchase orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const amountNum = Number(funAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter a FUN amount greater than 0.");
      return;
    }
    const btcNum = Number(btcAmount);
    if (!Number.isFinite(btcNum) || btcNum <= 0) {
      setError("Enter a BTC amount greater than 0.");
      return;
    }

    try {
      await createOrder({
        funAmount: amountNum,
        btcAmount: btcNum,
        btcRate: Number(btcRate) || null,
        note: note.trim(),
        requestedBy: staff?.username || "agent",
      });
      setFunAmount("");
      setBtcAmount("");
      setBtcRate("");
      setNote("");
      setSuccess("Request submitted. Awaiting owner approval.");
      await load();
    } catch (e) {
      console.error(e);
      setError("Failed to submit request.");
    }
  }

  async function changeStatus(id, next) {
    if (next === "approved" && !ownerBtcAddress.trim()) {
      setError("Owner BTC address is required to approve.");
      return;
    }
    setError("");
    setSuccess("");
    try {
      await updateOrderStatus(id, next, staff?.username || "owner", ownerBtcAddress.trim());
      setOwnerBtcAddress("");
      await load();
    } catch (e) {
      console.error(e);
      setError("Failed to update status.");
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Funcoin Purchase Requests (BTC)</h2>
          <p className="panel-subtitle">
            Agents/Operators can request FUN credit; owner reviews and responds with an approved order and BTC target.
            No PII stored—only wallet addresses and amounts.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field">
          <label>FUN Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={funAmount}
            onChange={(e) => setFunAmount(e.target.value)}
            className="input"
            placeholder="e.g., 1000"
            required
          />
        </div>
        <div className="field">
          <label>BTC Rate (FUN per BTC)</label>
          <div className="input-with-button">
            <input
              type="number"
              min="0"
              step="0.01"
              value={btcRate}
              onChange={(e) => {
                setBtcRate(e.target.value);
                const rate = Number(e.target.value);
                const fun = Number(funAmount);
                if (Number.isFinite(rate) && rate > 0 && Number.isFinite(fun)) {
                  setBtcAmount((fun / rate).toFixed(8));
                }
              }}
              className="input"
              placeholder="e.g., 60000 (FUN per BTC)"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  setError("");
                  const res = await fetch(
                    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
                  );
                  const data = await res.json();
                  // Treat FUN 1:1 with USD; btcRate = price of 1 BTC in FUN.
                  const rate = Number(data?.bitcoin?.usd);
                  if (Number.isFinite(rate) && rate > 0) {
                    setBtcRate(rate);
                    const fun = Number(funAmount);
                    if (Number.isFinite(fun) && fun > 0) {
                      setBtcAmount((fun / rate).toFixed(8));
                    }
                  } else {
                    setError("Could not fetch BTC/USD rate.");
                  }
                } catch (err) {
                  console.error(err);
                  setError("Could not fetch BTC/USD rate.");
                }
              }}
            >
              Fetch Rate
            </button>
          </div>
        </div>
        <div className="field">
          <label>BTC Amount (auto-calculated, editable)</label>
          <input
            type="number"
            min="0"
            step="0.00000001"
            value={btcAmount}
            onChange={(e) => setBtcAmount(e.target.value)}
            className="input"
            placeholder="Auto-calculated from FUN and rate"
            required
          />
        </div>
        <div className="field span-2">
          <label>Note (optional)</label>
          <textarea
            className="input"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any context for this request (optional)"
          />
        </div>
        <div className="field span-2">
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Submitting..." : "Submit Purchase Request"}
          </button>
        </div>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>FUN</th>
              <th>BTC</th>
              <th>Owner BTC</th>
              <th>Status</th>
              <th>Requested By</th>
              <th>Updated</th>
              {canApprove && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={canApprove ? 7 : 6} className="muted">
                  No purchase requests yet.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{Number(o.funAmount || 0).toLocaleString()}</td>
                <td>
                  {Number(o.btcAmount || 0).toFixed(8)}
                  {o.btcRate ? (
                    <div className="muted small">Rate: {Number(o.btcRate).toLocaleString()} FUN / BTC</div>
                  ) : null}
                </td>
                <td>{o.ownerBtcAddress ? <code>{o.ownerBtcAddress}</code> : <span className="muted small">Not set</span>}</td>
                <td>
                  <StatusPill status={o.status} />
                </td>
                <td>{o.requestedBy || "agent"}</td>
                <td>{new Date(o.updatedAt || o.createdAt).toLocaleString()}</td>
                {canApprove && (
                  <td>
                    {o.status === "pending" && (
                      <div className="btn-group">
                        <input
                          type="text"
                          className="input"
                          placeholder="Owner BTC address"
                          value={ownerBtcAddress}
                          onChange={(e) => setOwnerBtcAddress(e.target.value)}
                          style={{ marginBottom: "6px" }}
                        />
                        <button className="btn btn-secondary" onClick={() => changeStatus(o.id, "approved")}>
                          Approve
                        </button>
                        <button className="btn btn-danger" onClick={() => changeStatus(o.id, "rejected")}>
                          Reject
                        </button>
                      </div>
                    )}
                    {o.status !== "pending" && (
                      <span className="muted small">No actions</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
