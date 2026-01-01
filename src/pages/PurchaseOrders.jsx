import React, { useEffect, useMemo, useState } from "react";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";
import {
  listOrders,
  createOrder,
  getOwnerAddress,
  listMessages,
  postMessage,
  approveOrder,
  confirmPayment,
  markCredited,
  acknowledgeOrder,
  deleteOrder,
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
  const [messagesByOrder, setMessagesByOrder] = useState({});
  const [newMessage, setNewMessage] = useState({});
  const [actionState, setActionState] = useState({});

  const statusLabels = {
    pending: "Step 1: Pending (owner shares wallet)",
    approved: "Step 2: Wallet shared (agent sends BTC)",
    awaiting_credit: "Step 3: Awaiting FUN credit",
    completed: "Step 4: FUN credited (agent confirms)",
    acknowledged: "Step 5: Complete",
  };

  const agentStageHelp = {
    pending: "Waiting for owner to share a wallet. No action needed yet.",
    approved: "Copy the wallet, send BTC, then submit your confirmation / tx hash.",
    awaiting_credit: "Payment submitted. Wait for owner to credit your FUN.",
    completed: "Owner credited FUN. Confirm receipt to close the order.",
    acknowledged: "Order is complete.",
  };

  const ownerStageHelp = {
    pending: "Share a BTC wallet and approve to move this order forward.",
    approved: "Waiting for agent payment confirmation.",
    awaiting_credit: "Agent posted confirmation. Credit FUN, then mark credited.",
    completed: "Waiting for agent to confirm receipt.",
    acknowledged: "Order is complete.",
  };

  const isFinance = useMemo(
    () => (staff?.permissions || []).includes("finance:write"),
    [staff]
  );
  const canPlaceOrder = useMemo(
    () => staff?.role === "agent" || staff?.role === "distributor",
    [staff]
  );

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
        setActionState((prev) => ({
          ...prev,
          [o.id]: {
            ...(prev[o.id] || {}),
            approveAddress: prev[o.id]?.approveAddress || o.ownerBtcAddress || addrRes?.ownerBtcAddress || "",
          },
        }));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!canPlaceOrder) {
      setError("Only agents or distributors can place funcoin orders.");
      return;
    }

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
      });
      setFunAmount("");
      setBtcAmount("");
      setBtcRate("");
      setNote("");
      setSuccess("Order submitted. Waiting for owner to share a wallet address.");
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

  function updateAction(orderId, field, value) {
    setActionState((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] || {}), [field]: value },
    }));
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

  async function doApprove(order) {
    const addr =
      (actionState[order.id]?.approveAddress || "").trim() ||
      ownerBtcAddress.trim();
    if (!addr) {
      setError("Wallet address required to approve.");
      return;
    }
    try {
      setError("");
      await approveOrder(order.id, {
        ownerBtcAddress: addr,
        note: actionState[order.id]?.approveNote || "",
      });
      await load();
    } catch (err) {
      console.error(err);
      setError("Failed to approve order.");
    }
  }

  async function doConfirm(order) {
    const code = (actionState[order.id]?.confirmationCode || "").trim();
    if (!code) {
      setError("Confirmation is required.");
      return;
    }
    try {
      setError("");
      await confirmPayment(order.id, {
        confirmationCode: code,
        note: actionState[order.id]?.confirmationNote || "",
      });
      await load();
    } catch (err) {
      console.error(err);
      setError("Failed to submit confirmation.");
    }
  }

  async function doMarkCredited(order) {
    try {
      setError("");
      await markCredited(order.id, { note: actionState[order.id]?.creditNote || "" });
      await load();
    } catch (err) {
      console.error(err);
      setError("Failed to mark credited.");
    }
  }

  async function doAcknowledge(order) {
    try {
      setError("");
      await acknowledgeOrder(order.id, { note: actionState[order.id]?.ackNote || "" });
      await load();
    } catch (err) {
      console.error(err);
      setError("Failed to confirm receipt.");
    }
  }

  async function doDelete(order) {
    if (!window.confirm("Delete this order and its thread?")) return;
    try {
      setError("");
      await deleteOrder(order.id);
      await load();
    } catch (err) {
      console.error(err);
      setError("Failed to delete order.");
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Funcoin Purchase (BTC)</h2>
          <p className="panel-subtitle">
            Multi-step flow: Agent submits request → Owner shares wallet → Agent posts confirmation →
            Owner credits FUN → Agent confirms receipt. Thread shows the history.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {!canPlaceOrder && (
        <div className="alert alert-info">
          Only agents or distributors can place funcoin orders. You can still view existing requests.
        </div>
      )}

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
            disabled={!canPlaceOrder || loading}
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
              disabled={!canPlaceOrder || loading}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchRate}
              disabled={!canPlaceOrder || loading}
            >
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
            disabled={!canPlaceOrder || loading}
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
            disabled={!canPlaceOrder || loading}
          />
        </div>
        <div className="field span-2">
          <button type="submit" className="btn" disabled={!canPlaceOrder || loading}>
            {loading ? "Submitting..." : "Submit Order"}
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
              <th>Status</th>
              <th>Wallet</th>
              <th>Confirmation</th>
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
                <td>
                  <div className="badge">{statusLabels[o.status] || o.status}</div>
                </td>
                <td>
                  {o.ownerBtcAddress ? (
                    <div className="wallet-cell">
                      <code>{o.ownerBtcAddress}</code>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => navigator.clipboard.writeText(o.ownerBtcAddress)}
                      >
                        Copy
                      </button>
                    </div>
                  ) : (
                    <span className="muted small">Pending</span>
                  )}
                </td>
                <td>{o.confirmationCode || <span className="muted small">—</span>}</td>
                <td>{o.requestedBy || "agent"}</td>
                <td>{new Date(o.updatedAt || o.createdAt).toLocaleString()}</td>
                <td>
                  <div className="thread">
                    <div className="order-stage-help">
                      <div className="small muted">
                        {(isFinance ? ownerStageHelp[o.status] : agentStageHelp[o.status]) ||
                          "Follow the next action in this thread."}
                      </div>
                    </div>
                    <div className="order-actions">
                      {isFinance && o.status === "pending" && (
                        <div className="action-block">
                          <label className="small">Step 1: Share wallet & approve</label>
                          <input
                            className="input"
                            placeholder="bc1..."
                            value={actionState[o.id]?.approveAddress || ""}
                            onChange={(e) => updateAction(o.id, "approveAddress", e.target.value)}
                          />
                          <input
                            className="input"
                            placeholder="Optional note"
                            value={actionState[o.id]?.approveNote || ""}
                            onChange={(e) => updateAction(o.id, "approveNote", e.target.value)}
                          />
                          <button className="btn" type="button" onClick={() => doApprove(o)}>
                            Step 1: Send address & approve
                          </button>
                        </div>
                      )}

                      {!isFinance && o.status === "approved" && (
                        <div className="action-block">
                          <label className="small">Step 2: Submit BTC confirmation</label>
                          <input
                            className="input"
                            placeholder="Tx hash / reference"
                            value={actionState[o.id]?.confirmationCode || ""}
                            onChange={(e) => updateAction(o.id, "confirmationCode", e.target.value)}
                          />
                          <input
                            className="input"
                            placeholder="Optional note"
                            value={actionState[o.id]?.confirmationNote || ""}
                            onChange={(e) => updateAction(o.id, "confirmationNote", e.target.value)}
                          />
                          <button className="btn" type="button" onClick={() => doConfirm(o)}>
                            Step 2: Submit confirmation
                          </button>
                        </div>
                      )}

                      {isFinance && o.status === "awaiting_credit" && (
                        <div className="action-block">
                          <label className="small">Step 3: Mark FUN credited</label>
                          <input
                            className="input"
                            placeholder="Optional note"
                            value={actionState[o.id]?.creditNote || ""}
                            onChange={(e) => updateAction(o.id, "creditNote", e.target.value)}
                          />
                          <button className="btn" type="button" onClick={() => doMarkCredited(o)}>
                            Step 3: Mark credited
                          </button>
                        </div>
                      )}

                      {!isFinance && o.status === "completed" && (
                        <div className="action-block">
                          <label className="small">Step 4: Confirm FUN received</label>
                          <input
                            className="input"
                            placeholder="Optional note"
                            value={actionState[o.id]?.ackNote || ""}
                            onChange={(e) => updateAction(o.id, "ackNote", e.target.value)}
                          />
                          <button className="btn" type="button" onClick={() => doAcknowledge(o)}>
                            Step 4: Credits received
                          </button>
                        </div>
                      )}

                      {isFinance && (
                        <div className="action-block">
                          <button className="btn btn-secondary" type="button" onClick={() => doDelete(o)}>
                            Delete order
                          </button>
                        </div>
                      )}
                    </div>
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
