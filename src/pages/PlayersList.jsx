import React, { useEffect, useState } from "react";
import {
  listPlayers,
  getPlayer,
  adjustPlayerBalance,
  getPlayerTransactions,
  getPlayerRounds,
  getPlayerSessions,
} from "../api/playersApi";

function formatNumber(n) {
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

export default function PlayersList() {
  const [players, setPlayers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState("transactions");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [error, setError] = useState("");

  async function loadPlayers() {
    setLoading(true);
    setError("");
    try {
      const data = await listPlayers({ search, status });
      if (data.ok) {
        setPlayers(data.players || []);
      } else {
        setError(data.error || "Failed to load players");
      }
    } catch (err) {
      console.error("[PlayersList] load error:", err);
      setError("Failed to load players");
    } finally {
      setLoading(false);
    }
  }

  async function loadPlayerDetail(id) {
    if (!id) return;
    setDetailLoading(true);
    setError("");
    try {
      const [playerRes, txRes, roundsRes, sessionsRes] = await Promise.all([
        getPlayer(id),
        getPlayerTransactions(id, { limit: 50 }),
        getPlayerRounds(id, { limit: 200 }),
        getPlayerSessions(id, { limit: 200 }),
      ]);

      if (!playerRes?.ok) {
        setError(playerRes?.error || "Failed to load player");
        return;
      }

      setDetail({
        player: playerRes.player,
        transactions: txRes?.ok ? txRes.transactions || [] : [],
        rounds: roundsRes?.ok ? roundsRes.rounds || [] : [],
        sessions: sessionsRes?.ok ? sessionsRes.sessions || [] : [],
      });
    } catch (err) {
      console.error("[PlayersList] getPlayer error:", err);
      setError("Failed to load player");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSelectPlayer(id) {
    setSelectedId(id);
    await loadPlayerDetail(id);
  }

  async function handleAdjustBalance() {
    if (!selectedId) return;
    if (!adjustAmount) return;

    const amountValue = Number(adjustAmount);
    if (!Number.isFinite(amountValue) || amountValue === 0) {
      setError("Adjustment amount must be non-zero.");
      return;
    }

    try {
      const data = await adjustPlayerBalance(selectedId, {
        amount: amountValue,
        reason: adjustReason || "Manual adjustment",
        currency: detail?.player?.currency || "FUN",
      });
      if (data.ok) {
        setAdjustAmount("");
        setAdjustReason("");
        await loadPlayers();
        await loadPlayerDetail(selectedId);
      } else {
        setError(data.error || "Failed to adjust balance");
      }
    } catch (err) {
      console.error("[PlayersList] adjust error:", err);
      setError("Failed to adjust balance");
    }
  }

  const playerInfo = detail?.player || null;
  const transactions = detail?.transactions || [];
  const rounds = detail?.rounds || [];
  const sessions = detail?.sessions || [];
  const playerStatus =
    playerInfo?.status ?? (playerInfo?.isActive ? "active" : "inactive");
  const isActive = playerInfo?.isActive ?? playerStatus === "active";

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Player Management</h2>
            <p className="panel-subtitle">Monitor activity, balances, and gameplay telemetry.</p>
          </div>
          <div className="panel-actions">
            <input
              type="text"
              placeholder="Search by user code, email, or ID"
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="btn btn-primary" onClick={loadPlayers} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
        {error && <div className="alert">{error}</div>}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Player List</h3>
              <p className="panel-subtitle">Select a player to inspect details.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User Code</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const statusLabel =
                    p.status ?? (p.isActive ? "active" : "inactive");
                  return (
                    <tr
                      key={p.id}
                      className={p.id === selectedId ? "table-row-active" : undefined}
                      onClick={() => handleSelectPlayer(p.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{String(p.id).slice(0, 8)}</td>
                      <td>{p.userCode}</td>
                      <td>${formatNumber(p.balance)}</td>
                      <td>{statusLabel}</td>
                    </tr>
                  );
                })}
                {!players.length && !loading && (
                  <tr>
                    <td colSpan={4} className="empty">
                      No players found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Player Detail</h3>
              <p className="panel-subtitle">Balances, sessions, and round history.</p>
            </div>
          </div>

          {detailLoading && <div className="empty">Loading player detail...</div>}

          {!detailLoading && !playerInfo && (
            <div className="empty">Select a player from the list to view details.</div>
          )}

          {playerInfo && (
            <div className="stack">
              <div className="grid-3">
                <div>
                  <div className="stat-label">User Code</div>
                  <div className="stat-value">{playerInfo.userCode}</div>
                </div>
                <div>
                  <div className="stat-label">Balance</div>
                  <div className="stat-value">${formatNumber(playerInfo.balance)}</div>
                </div>
                <div>
                  <div className="stat-label">Status</div>
                  <div className="stat-value">{isActive ? "active" : "inactive"}</div>
                </div>
              </div>

              <div className="panel" style={{ padding: 14 }}>
                <div className="panel-title">Manual Balance Adjustment</div>
                <div className="panel-subtitle">
                  Use positive values to credit, negative to debit.
                </div>
                <div className="form-grid" style={{ marginTop: 12 }}>
                  <div className="field">
                    <label>Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      placeholder="e.g. 50 or -25"
                      className="input"
                    />
                  </div>
                  <div className="field">
                    <label>Reason</label>
                    <input
                      type="text"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="Reason"
                      className="input"
                    />
                  </div>
                  <div className="field" style={{ alignSelf: "end" }}>
                    <button className="btn btn-secondary" onClick={handleAdjustBalance}>
                      Apply Adjustment
                    </button>
                  </div>
                </div>
              </div>

              <div className="tab-bar">
                <div className={`tab ${detailTab === "transactions" ? "active" : ""}`} onClick={() => setDetailTab("transactions")}>
                  Transactions
                </div>
                <div className={`tab ${detailTab === "rounds" ? "active" : ""}`} onClick={() => setDetailTab("rounds")}>
                  Rounds
                </div>
                <div className={`tab ${detailTab === "sessions" ? "active" : ""}`} onClick={() => setDetailTab("sessions")}>
                  Sessions
                </div>
              </div>

              {detailTab === "transactions" && (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>After</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id}>
                          <td>{t.type}</td>
                          <td>${formatNumber(t.amount)}</td>
                          <td>${formatNumber(t.balanceAfter)}</td>
                          <td>{fmtDate(t.createdAt)}</td>
                        </tr>
                      ))}
                      {!transactions.length && (
                        <tr>
                          <td colSpan={4} className="empty">
                            No transactions recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {detailTab === "rounds" && (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Game</th>
                        <th>Bet</th>
                        <th>Win</th>
                        <th>Status</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rounds.map((r) => (
                        <tr key={r.id}>
                          <td>{r.gameId}</td>
                          <td>${formatNumber(r.betAmount)}</td>
                          <td>${formatNumber(r.winAmount)}</td>
                          <td>{r.status}</td>
                          <td>{fmtDate(r.createdAt)}</td>
                        </tr>
                      ))}
                      {!rounds.length && (
                        <tr>
                          <td colSpan={5} className="empty">
                            No rounds recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {detailTab === "sessions" && (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Session</th>
                        <th>Status</th>
                        <th>Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.id}>
                          <td>{String(s.id).slice(0, 8)}</td>
                          <td>{s.revokedAt ? "revoked" : "active"}</td>
                          <td>{fmtDate(s.lastSeenAt || s.createdAt)}</td>
                        </tr>
                      ))}
                      {!sessions.length && (
                        <tr>
                          <td colSpan={3} className="empty">
                            No sessions recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
