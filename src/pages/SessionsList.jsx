import React, { useEffect, useState } from "react";
import { listSessions, revokeSession } from "../api/sessionsApi";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";

function fmtDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

function fmtNumber(value) {
  if (value == null) return "0";
  return Number(value).toLocaleString();
}

export default function SessionsList() {
  const { staff } = useStaffAuth();
  const perms = staff?.permissions || [];

  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState({
    actorType: "all",
    total: 0,
    active: 0,
    revoked: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actorType, setActorType] = useState("all");
  const [status, setStatus] = useState("all");
  const [limit, setLimit] = useState("100");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listSessions({ actorType, status, limit });
      if (data.ok) {
        setSessions(data.sessions || []);
        setSummary(
          data.summary || {
            actorType,
            total: 0,
            active: 0,
            revoked: 0,
          }
        );
      } else {
        setError(data.error || "Failed to load sessions");
      }
    } catch (err) {
      console.error("[Sessions] load error:", err);
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRevoke(id) {
    try {
      await revokeSession(id);
      await load();
    } catch (err) {
      console.error("[Sessions] revoke error:", err);
      setError("Failed to revoke session");
    }
  }

  function canRevoke(session) {
    if (session.actorType === "staff") return perms.includes("staff:manage");
    if (session.actorType === "user") return perms.includes("player:write");
    return false;
  }

  const summaryScope = summary?.actorType || actorType;
  const scopeLabel =
    summaryScope === "user" ? "players" : summaryScope === "staff" ? "staff" : "all actors";

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Session Monitor</h2>
            <p className="panel-subtitle">Inspect live and revoked sessions across the system.</p>
          </div>
          <div className="panel-actions">
            <button className="btn btn-primary" onClick={load} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Actor Type</label>
            <select value={actorType} onChange={(e) => setActorType(e.target.value)} className="select">
              <option value="all">all</option>
              <option value="staff">staff</option>
              <option value="user">player</option>
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="select">
              <option value="all">all</option>
              <option value="active">active</option>
              <option value="revoked">revoked</option>
            </select>
          </div>
          <div className="field">
            <label>Limit</label>
            <input value={limit} onChange={(e) => setLimit(e.target.value)} className="input" />
          </div>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Active Sessions</div>
            <div className="stat-value">{fmtNumber(summary.active)}</div>
            <div className="stat-meta">Scope: {scopeLabel} · currently logged in</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Login Sessions</div>
            <div className="stat-value">{fmtNumber(summary.total)}</div>
            <div className="stat-meta">Scope: {scopeLabel} · active + revoked</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Sessions</h3>
            <p className="panel-subtitle">Loaded {sessions.length} sessions.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>User ID</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Seen</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.actorType}</td>
                  <td>{String(s.userId).slice(0, 10)}</td>
                  <td>{s.role}</td>
                  <td>{s.revokedAt ? "revoked" : "active"}</td>
                  <td>{fmtDate(s.lastSeenAt || s.createdAt)}</td>
                  <td>
                    {s.revokedAt ? (
                      "-"
                    ) : (
                      <button
                        className="btn btn-danger"
                        onClick={() => handleRevoke(s.id)}
                        disabled={!canRevoke(s)}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!sessions.length && !loading && (
                <tr>
                  <td colSpan={6} className="empty">
                    No sessions found.
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
