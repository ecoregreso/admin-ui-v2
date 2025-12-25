import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fetchDashboard } from "../api/dashboardApi";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";

function fmtNumber(value, digits = 2) {
  if (value == null) return "0";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function fmtDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

export default function Dashboard() {
  const { staff } = useStaffAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchDashboard();
      if (!res.ok) throw new Error(res.error || "Failed to load dashboard");
      setData(res);
    } catch (err) {
      console.error("[Dashboard] load error:", err);
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Map backend range report to UI-friendly shape
  const vouchers = data?.vouchers || {};
  const players = data?.players || {};
  const tx = data?.transactions || {};
  const games = React.useMemo(() => data?.games || {}, [data]);
  const summary = data?.summary || {};

  const kpis = {
    totalPlayers: players.active || 0,
    activePlayers: players.active || 0,
    newPlayers24h: players.new || 0,
    walletTotal: summary.totalCredits || 0,
    credits24h: vouchers.redeemed?.totalAmount || 0,
    ggr24h: games.ggr || tx.aggregates?.netGame || 0,
    betAmount24h: tx.aggregates?.gameBetTotal || 0,
    voucherAmount24h: vouchers.issued?.totalAmount || 0,
    voucherBonus24h: vouchers.issued?.totalBonus || 0,
    debits24h: summary.totalDebits || 0,
  };

  const sessions = {
    activePlayers: data?.sessions?.activePlayers ?? players.active ?? 0,
    activeStaff: data?.sessions?.activeStaff ?? 0,
    staffSessions: data?.sessions?.staffSessions || [],
  };

  const recent = {
    transactions: data?.recent?.transactions || [],
    vouchers: data?.recent?.vouchers || [],
    rounds: data?.recent?.rounds || [],
  };

  const series = useMemo(() => games.byGame || [], [games]);

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Command Overview</h2>
            <p className="panel-subtitle">
              Live operational snapshot {staff ? `for ${staff.username}` : ""}
            </p>
          </div>
          <div className="panel-actions">
            <button className="btn btn-primary" onClick={load} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total Players</div>
            <div className="stat-value">{fmtNumber(kpis.totalPlayers, 0)}</div>
            <div className="stat-meta">Active: {fmtNumber(kpis.activePlayers, 0)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">New Players (24h)</div>
            <div className="stat-value">{fmtNumber(kpis.newPlayers24h, 0)}</div>
            <div className="stat-meta">Sessions live: {fmtNumber(sessions.activePlayers, 0)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Wallet Float</div>
            <div className="stat-value">{fmtNumber(kpis.walletTotal)}</div>
            <div className="stat-meta">Credits 24h: {fmtNumber(kpis.credits24h)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">GGR (24h)</div>
            <div className="stat-value">{fmtNumber(kpis.ggr24h)}</div>
            <div className="stat-meta">Bets: {fmtNumber(kpis.betAmount24h)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Voucher Volume</div>
            <div className="stat-value">{fmtNumber(kpis.voucherAmount24h)}</div>
            <div className="stat-meta">Bonus: {fmtNumber(kpis.voucherBonus24h)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Debits (24h)</div>
            <div className="stat-value">{fmtNumber(kpis.debits24h)}</div>
            <div className="stat-meta">Staff sessions: {fmtNumber(sessions.activeStaff, 0)}</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">7-Day Pulse</h3>
              <p className="panel-subtitle">Bet vs win trend</p>
            </div>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="game" stroke="rgba(202,210,224,0.6)" />
                <YAxis stroke="rgba(202,210,224,0.6)" />
                <Tooltip
                  contentStyle={{
                    background: "rgba(8, 10, 14, 0.9)",
                    border: "1px solid rgba(39, 217, 255, 0.4)",
                    borderRadius: 12,
                    color: "#f4f6fa",
                  }}
                />
                <Line type="monotone" dataKey="totalBet" stroke="#27d9ff" strokeWidth={2} />
                <Line type="monotone" dataKey="totalWin" stroke="#ff304f" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Live Sessions</h3>
              <p className="panel-subtitle">Active staff and player footprints</p>
            </div>
          </div>
          <div className="stack">
            <div className="inline">
              <span className="tag tag-blue">Players {fmtNumber(sessions.activePlayers, 0)}</span>
              <span className="tag tag-red">Staff {fmtNumber(sessions.activeStaff, 0)}</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Role</th>
                    <th>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {(sessions.staffSessions || []).map((s) => (
                    <tr key={s.id}>
                      <td>{String(s.userId).slice(0, 10)}</td>
                      <td>{s.role}</td>
                      <td>{fmtDate(s.lastSeenAt || s.createdAt)}</td>
                    </tr>
                  ))}
                  {!sessions.staffSessions?.length && (
                    <tr>
                      <td colSpan={3} className="empty">
                        No staff sessions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Recent Transactions</h3>
              <p className="panel-subtitle">Last ledger movements</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>User</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {(recent.transactions || []).map((t) => (
                  <tr key={t.id}>
                    <td>{t.type}</td>
                    <td>${fmtNumber(t.amount)}</td>
                    <td>{t.wallet?.userId ? String(t.wallet.userId).slice(0, 10) : "-"}</td>
                    <td>{fmtDate(t.createdAt)}</td>
                  </tr>
                ))}
                {!recent.transactions?.length && (
                  <tr>
                    <td colSpan={4} className="empty">
                      No transactions yet.
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
              <h3 className="panel-title">Recent Vouchers</h3>
              <p className="panel-subtitle">Creation and redemption flow</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {(recent.vouchers || []).map((v) => (
                  <tr key={v.id}>
                    <td>{v.code}</td>
                    <td>${fmtNumber(v.amount)}</td>
                    <td>{v.status}</td>
                    <td>{fmtDate(v.createdAt)}</td>
                  </tr>
                ))}
                {!recent.vouchers?.length && (
                  <tr>
                    <td colSpan={4} className="empty">
                      No vouchers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Recent Game Rounds</h3>
            <p className="panel-subtitle">Bet and win activity</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Player</th>
                <th>Bet</th>
                <th>Win</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {(recent.rounds || []).map((r) => (
                <tr key={r.id}>
                  <td>{r.gameId}</td>
                  <td>{r.player?.userCode || "-"}</td>
                  <td>${fmtNumber(r.betAmount)}</td>
                  <td>${fmtNumber(r.winAmount)}</td>
                  <td>{r.status}</td>
                  <td>{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
              {!recent.rounds?.length && (
                <tr>
                  <td colSpan={6} className="empty">
                    No rounds recorded yet.
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
