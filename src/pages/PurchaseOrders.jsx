import React, { useEffect, useMemo, useState } from "react";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";
import {
  listOrders,
  createOrder,
  getOwnerBtcAddress,
  setOwnerBtcAddress,
} from "../api/purchaseOrdersApi.js";

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

  const [ownerBtcAddress, setOwnerBtcAddressState] = useState(getOwnerBtcAddress());
  const canManageOwnerAddr = useMemo(
    () => (staff?.permissions || []).includes("finance:write"),
    [staff]
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listOrders();
      setOrders(data);
      setOwnerBtcAddressState(getOwnerBtcAddress());
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
    if (!ownerBtcAddress.trim()) {
      setError("Owner BTC address is required.");
      return;
    }

    try {
      await createOrder({
        funAmount: amountNum,
        btcAmount: btcNum,
        btcRate: Number(btcRate) || null,
        note: note.trim(),
        requestedBy: staff?.username || "agent",
        ownerBtcAddress: ownerBtcAddress.trim(),
      });
      setFunAmount("");
      setBtcAmount("");
      setBtcRate("");
      setNote("");
      setSuccess("Order submitted. Send BTC to the owner address shown below.");
      await load();
    } catch (e) {
      console.error(e);
      setError("Failed to submit request.");
    }
  }

  async function fetchRate() {
    try {
      setError("");
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
      );
      const data = await res.json();
      const rate = Number(data?.bitcoin?.usd);
      if (Number.isFinite(rate) && rate > 0) {
        setBtcRate(rate);
        const fun = Number(funAmount);
        if (Number.isFinite(fun) && fun > 0) {
          setBtcAmount((fun / rate).toFixed(8));
        }
      } else {
        setError("Could not fetch BTC rate.");
      }
    } catch (err) {
      console.error(err);
      setError("Could not fetch BTC rate.");
    }
  }

  function updateOwnerAddress(addr) {
    setOwnerBtcAddressState(addr);
    setOwnerBtcAddress(addr);
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Funcoin Purchase (BTC)</h2>
          <p className="panel-subtitle">
            Agents/Operators enter FUN amount → auto BTC conversion → submit to see the owner BTC address for payment.
            Single-step flow; no approval queue. Owner can update the BTC address below.
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
            onChange={(e) => {
              const val = e.target.value;
              setFunAmount(val);
              const fun = Number(val);
              const rate = Number(btcRate);
              if (Number.isFinite(fun) && Number.isFinite(rate) && rate > 0) {
                setBtcAmount((fun / rate).toFixed(8));
              }
            }}
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
            <button type="button" className="btn btn-secondary" onClick={fetchRate}>
              Fetch Rate
            </button>
          </div>
        </div>
        <div className="field">
          <label>BTC Amount (auto, editable)</label>
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
            {loading ? "Submitting..." : "Submit Order"}
          </button>
        </div>
      </form>

      <div className="panel" style={{ marginTop: "12px" }}>
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Owner BTC Address</h3>
            <p className="panel-subtitle">
              Agents copy this address after submitting. Owner can update it below.
            </p>
          </div>
        </div>
        <div className="form-grid">
          <div className="field span-2">
            <label>Current Owner BTC Address</label>
            <input
              className="input"
              value={ownerBtcAddress}
              onChange={(e) => updateOwnerAddress(e.target.value)}
              disabled={!canManageOwnerAddr}
              placeholder="bc1..."
            />
            {!canManageOwnerAddr && (
              <div className="muted small">View-only. Finance can update this.</div>
            )}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>FUN</th>
              <th>BTC</th>
              <th>Owner BTC</th>
              <th>Requested By</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
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
                <td>{o.requestedBy || "agent"}</td>
                <td>{new Date(o.updatedAt || o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
