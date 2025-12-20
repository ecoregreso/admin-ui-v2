import React, { useEffect, useState } from "react";
import { listAuditEvents } from "../api/auditApi";

function fmtNumber(n) {
  if (n == null) return "0";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

function describeEvent(event) {
  switch (event.type) {
    case "transaction":
      return `${event.subtype} ${event.reference ? `(${event.reference})` : ""}`;
    case "voucher_created":
      return `Voucher created ${event.code}`;
    case "voucher_redeemed":
      return `Voucher redeemed ${event.code}`;
    case "game_round":
      return `Round ${event.gameId} bet ${fmtNumber(event.betAmount)} win ${fmtNumber(event.winAmount)}`;
    default:
      return event.type;
  }
}

export default function AuditLog() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState("120");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listAuditEvents({ limit });
      if (data.ok) {
        setEvents(data.events || []);
      } else {
        setError(data.error || "Failed to load audit log");
      }
    } catch (err) {
      console.error("[AuditLog] load error:", err);
      setError("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Audit Log</h2>
            <p className="panel-subtitle">Merged activity stream across vouchers, rounds, and transactions.</p>
          </div>
          <div className="panel-actions">
            <input
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="input"
              style={{ width: 100 }}
            />
            <button className="btn btn-primary" onClick={load} disabled={loading}>
              {loading ? "Loading..." : "Load"}
            </button>
          </div>
        </div>
        {error && <div className="alert">{error}</div>}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Events</h3>
            <p className="panel-subtitle">{events.length} recent events.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Actor</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.type}</td>
                  <td>{describeEvent(e)}</td>
                  <td>
                    {e.amount != null
                      ? `$${fmtNumber(e.amount)}`
                      : e.betAmount != null
                      ? `$${fmtNumber(e.betAmount)}`
                      : "-"}
                  </td>
                  <td>
                    {e.actor?.staffId
                      ? `staff#${e.actor.staffId}`
                      : e.actor?.userId
                      ? `user:${String(e.actor.userId).slice(0, 8)}`
                      : e.playerId
                      ? `player:${String(e.playerId).slice(0, 8)}`
                      : "-"}
                  </td>
                  <td>{fmtDate(e.createdAt)}</td>
                </tr>
              ))}
              {!events.length && !loading && (
                <tr>
                  <td colSpan={5} className="empty">
                    No audit events found.
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
