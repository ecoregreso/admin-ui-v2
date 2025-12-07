// src/pages/ReportsDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { fetchRangeReport } from "../api/reportsApi";

function formatNumber(n) {
  if (n == null || isNaN(n)) return "0";
  const x = Number(n);
  if (Math.abs(x) >= 1_000_000) return (x / 1_000_000).toFixed(2) + "M";
  if (Math.abs(x) >= 1_000) return (x / 1_000).toFixed(1) + "k";
  return x.toFixed(2);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "Today", start: todayIso, end: todayIso },
  { label: "Yesterday", start: () => isoDaysAgo(1), end: () => isoDaysAgo(1) },
  { label: "Last 7 days", start: () => isoDaysAgo(6), end: todayIso },
  { label: "Last 30 days", start: () => isoDaysAgo(29), end: todayIso },
];

export default function ReportsDashboard() {
  const [start, setStart] = useState(isoDaysAgo(6));
  const [end, setEnd] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const [activePreset, setActivePreset] = useState("Last 7 days");

  useEffect(() => {
    handleFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFetch() {
    if (!start || !end) return;
    setLoading(true);
    setError("");

    try {
      const data = await fetchRangeReport(start, end);
      setReport(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(preset) {
    const s = preset.start();
    const e = preset.end();
    setStart(s);
    setEnd(e);
    setActivePreset(preset.label);
  }

  const voucherKpis = useMemo(() => {
    if (!report) return null;
    const v = report.vouchers || {};
    const issued = v.issued || {};
    const redeemed = v.redeemed || {};
    const breakage = v.breakage || {};
    return { issued, redeemed, breakage };
  }, [report]);

  const playersKpis = useMemo(() => {
    if (!report) return null;
    return report.players || {};
  }, [report]);

  const txAgg = useMemo(() => {
    if (!report) return null;
    return report.transactions?.aggregates || {};
  }, [report]);

  const gamesAgg = useMemo(() => {
    if (!report) return null;
    return report.games || {};
  }, [report]);

  const byGame = gamesAgg?.byGame || [];

  const summaryTrendData = useMemo(() => {
    if (!report) return [];
    const label =
      report.period?.label || `${report.period?.start}..${report.period?.end}`;
    return [
      {
        label,
        ggr: txAgg.netGame || gamesAgg.ggr || 0,
        vouchersIssued: voucherKpis?.issued?.count || 0,
        vouchersRedeemed: voucherKpis?.redeemed?.count || 0,
        activePlayers: playersKpis?.active || 0,
      },
    ];
  }, [report, txAgg, voucherKpis, playersKpis, gamesAgg]);

  return (
    <div className="reports-page">
      <div className="section-header">
        <div>
          <div className="section-title">Reports &amp; Analytics</div>
          <div className="section-subtitle">
            Overview of vouchers, wallets, game performance and players for the
            selected period.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className="btn-ghost"
              style={
                activePreset === p.label
                  ? {
                      borderColor: "rgba(79,209,255,0.85)",
                      color: "#4fd1ff",
                    }
                  : undefined
              }
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date range + Run button */}
      <div
        className="card"
        style={{
          marginBottom: 18,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ flex: "0 0 auto", minWidth: 220 }}>
          <div className="card-title">Date range</div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="card-subtext">Start</span>
              <input
                className="input"
                type="date"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setActivePreset("");
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="card-subtext">End</span>
              <input
                className="input"
                type="date"
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  setActivePreset("");
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ flex: "0 0 auto" }}>
          <button
            className="btn"
            type="button"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? "Loading..." : "Generate report"}
          </button>
        </div>

        {report?.period && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div className="card-subtext">Current period</div>
            <div style={{ fontSize: "0.86rem", color: "#fff" }}>
              {report.period.start} → {report.period.end}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          className="card"
          style={{ borderColor: "rgba(255, 99, 132, 0.8)", marginBottom: 18 }}
        >
          <div className="card-title">Error</div>
          <div style={{ color: "#ff99b0", fontSize: "0.85rem" }}>{error}</div>
        </div>
      )}

      {/* KPI cards */}
      {report && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 18 }}>
            {/* Players */}
            <div className="card">
              <div className="card-title">Active players</div>
              <div className="card-value">{playersKpis?.active ?? 0}</div>
              <div className="card-subtext">
                New: {playersKpis?.new ?? 0} · From games:{" "}
                {playersKpis?.activeFromGames ?? 0}
              </div>
            </div>

            {/* Vouchers issued */}
            <div className="card">
              <div className="card-title">Vouchers issued</div>
              <div className="card-value">
                {voucherKpis?.issued?.count ?? 0}
              </div>
              <div className="card-subtext">
                Amount: {formatNumber(voucherKpis?.issued?.totalAmount || 0)} ·
                Bonus: {formatNumber(voucherKpis?.issued?.totalBonus || 0)}
              </div>
            </div>

            {/* Vouchers redeemed */}
            <div className="card">
              <div className="card-title">Vouchers redeemed</div>
              <div className="card-value">
                {voucherKpis?.redeemed?.count ?? 0}
              </div>
              <div className="card-subtext">
                Amount: {formatNumber(voucherKpis?.redeemed?.totalAmount || 0)}{" "}
                · Bonus:{" "}
                {formatNumber(voucherKpis?.redeemed?.totalBonus || 0)} · Players:{" "}
                {voucherKpis?.redeemed?.uniquePlayers ?? 0}
              </div>
            </div>

            {/* GGR */}
            <div className="card">
              <div className="card-title">Net game (GGR)</div>
              <div className="card-value">
                {formatNumber(
                  txAgg?.netGame != null ? txAgg.netGame : gamesAgg?.ggr || 0
                )}
              </div>
              <div className="card-subtext">
                Bet: {formatNumber(txAgg?.gameBetTotal || 0)} · Win:{" "}
                {formatNumber(txAgg?.gameWinTotal || 0)}
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-2" style={{ marginBottom: 18 }}>
            {/* GGR chart */}
            <div className="card" style={{ minHeight: 260 }}>
              <div className="card-title">GGR over period</div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summaryTrendData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#a1acc7" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#a1acc7" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#050714",
                        border: "1px solid rgba(255,255,255,0.08)",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#fff" }}
                      formatter={(v) => formatNumber(v)}
                    />
                    <Line
                      type="monotone"
                      dataKey="ggr"
                      stroke="#4fd1ff"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Vouchers bar chart */}
            <div className="card" style={{ minHeight: 260 }}>
              <div className="card-title">Vouchers vs players</div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summaryTrendData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#a1acc7" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#a1acc7" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#050714",
                        border: "1px solid rgba(255,255,255,0.08)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="vouchersIssued" fill="#4fd1ff" />
                    <Bar dataKey="vouchersRedeemed" fill="#ff4dbd" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Game breakdown table */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="section-header" style={{ marginBottom: 10 }}>
              <div className="card-title">Game performance</div>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  if (!report) return;
                  const blob = new Blob(
                    [JSON.stringify(report.games || {}, null, 2)],
                    { type: "application/json" }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `games_report_${start}_to_${end}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export games JSON
              </button>
            </div>

            {byGame.length === 0 ? (
              <div className="card-subtext">
                No game round data for this period yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Rounds</th>
                      <th>Players</th>
                      <th>Total bet</th>
                      <th>Total win</th>
                      <th>GGR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byGame.map((g) => (
                      <tr key={g.game}>
                        <td>{g.game}</td>
                        <td>{g.rounds}</td>
                        <td>{g.uniquePlayers}</td>
                        <td>{formatNumber(g.totalBet || 0)}</td>
                        <td>{formatNumber(g.totalWin || 0)}</td>
                        <td>{formatNumber(g.ggr || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transactions by type */}
          <div className="card">
            <div className="section-header" style={{ marginBottom: 10 }}>
              <div className="card-title">Transactions by type</div>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  if (!report) return;
                  const blob = new Blob(
                    [JSON.stringify(report.transactions || {}, null, 2)],
                    { type: "application/json" }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `transactions_report_${start}_to_${end}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export tx JSON
              </button>
            </div>

            {report.transactions?.byType?.length ? (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Count</th>
                      <th>Total amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.transactions.byType.map((t) => (
                      <tr key={t.type}>
                        <td>{t.type}</td>
                        <td>{t.count}</td>
                        <td>{formatNumber(t.totalAmount || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-subtext">
                No transactions recorded in this period.
              </div>
            )}
          </div>
        </>
      )}

      {!report && !loading && !error && (
        <div className="card">
          <div className="card-title">No report loaded yet</div>
          <div className="card-subtext">
            Pick a date range and hit &ldquo;Generate report&rdquo; to view
            analytics.
          </div>
        </div>
      )}
    </div>
  );
}
