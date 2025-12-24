import React, { useEffect, useMemo, useState } from "react";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";
import {
  listOrders,
  createOrder,
  getOwnerAddress,
  setOwnerAddress,
  listMessages,
  postMessage,
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

  const [ownerBtcAddress, setOwnerBtcAddressState] = useState("");
  const canManageOwnerAddr = useMemo(
    () => (staff?.permissions || []).includes("finance:write"),
    [staff]
  );
  const [messagesByOrder, setMessagesByOrder] = useState({});
  const [newMessage, setNewMessage] = useState({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listOrders();
      setOrders(data.orders || []);
      const addrRes = await getOwnerAddress();
      setOwnerBtcAddressState(addrRes?.ownerBtcAddress || "");
      // preload messages for visible orders
      for (const o of data.orders || []) {
        await loadMessages(o.id);
      }
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
      const res = await createOrder({
        funAmount: amountNum,
        btcAmount: btcNum,
        btcRate: Number(btcRate) || null,
        note: note.trim(),
        requestedBy: staff?.username || "agent",
        ownerBtcAddress: ownerBtcAddress.trim(),
      });
      // post an automatic message with the note if present
      if (note.trim()) {
        await postMessage(res.order.id, note.trim());
      }
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
    setOwnerAddress(addr);
  }

  async function loadMessages(orderId) {
    try {
      const res = await listMessages(orderId);
      setMessagesByOrder((prev) => ({ ...prev, [orderId]: res.messages || [] }));
    } catch (err) {
      console.error(err);
    }
  }

  async function sendMessage(orderId, body) {
    if (!body.trim()) return;
    try {
      await postMessage(orderId, body.trim());
      await loadMessages(orderId);
      setNewMessage((prev) => ({ ...prev, [orderId]: "" }));
    } catch (err) {
      console.error(err);
      setError("Failed to send message.");
    }
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
              <th>Thread</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
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
                <td>
                  <div className="thread">
                    <div className="thread-messages">
                      {(messagesByOrder[o.id] || []).map((m) => (
                        <div key={m.id} className="thread-message">
                          <div className="thread-meta">
                            <strong>{m.sender}</strong>{" "}
                            <span className="muted small">{new Date(m.createdAt).toLocaleString()}</span>
                          </div>
                          <div>{m.body}</div>
                        </div>
                      ))}
                      {!(messagesByOrder[o.id] || []).length && (
                        <div className="muted small">No messages yet.</div>
                      )}
                    </div>
                    <div className="thread-input">
                      <input
                        className="input"
                        placeholder="Type a message (e.g., owner BTC address reply)..."
                        value={newMessage[o.id] || ""}
                        onChange={(e) => setNewMessage((prev) => ({ ...prev, [o.id]: e.target.value }))}
                      />
                      <button className="btn btn-secondary" onClick={() => sendMessage(o.id, newMessage[o.id] || "")}>
                        Send
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
