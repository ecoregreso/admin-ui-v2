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
  AreaChart,
  Area,
  Cell,
  Legend,
} from "recharts";
import {
  fetchBehaviorReport,
  fetchDailyReport,
  fetchRangeReport,
} from "../api/reportsApi";

const TOOLTIP_STYLE = {
  background: "rgba(8, 10, 14, 0.9)",
  border: "1px solid rgba(39, 217, 255, 0.4)",
  borderRadius: 12,
  color: "#f4f6fa",
};


function formatDayLabel(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${Number(value).toFixed(1)}%`;
}

function formatNumber(n) {
  if (n == null) return "0";
  return Number(n).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}


export default function ReportsDashboard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState(null);
  const [behavior, setBehavior] = useState(null);
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [behaviorError, setBehaviorError] = useState("");
  const [dailyError, setDailyError] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setFrom(today);
    setTo(today);
  }, []);

  async function handleGenerate() {
    if (!from || !to) {
      setError("From and To dates are required");
      return;
    }
    setError("");
    setBehaviorError("");
    setDailyError("");
    setLoading(true);
    setReport(null);
    setBehavior(null);
    setDaily(null);

    try {
      const [rangeResult, behaviorResult, dailyResult] = await Promise.allSettled([
        fetchRangeReport({ from, to }),
        fetchBehaviorReport({ from, to }),
        fetchDailyReport({ from, to }),
      ]);

      if (rangeResult.status === "fulfilled") {
        const data = rangeResult.value;
        if (!data.ok) {
          setError(data.error || "Unknown error");
        } else {
          setReport(data);
        }
      } else {
        console.error("[ReportsDashboard] report error:", rangeResult.reason);
        setError(rangeResult.reason?.message || "Failed to load report");
      }

      if (behaviorResult.status === "fulfilled") {
        const data = behaviorResult.value;
        if (!data.ok) {
          setBehaviorError(data.error || "Failed to load player behavior");
        } else {
          setBehavior(data);
        }
      } else {
        console.error("[ReportsDashboard] behavior error:", behaviorResult.reason);
        setBehaviorError(behaviorResult.reason?.message || "Failed to load player behavior");
      }

      if (dailyResult.status === "fulfilled") {
        const data = dailyResult.value;
        if (!data.ok) {
          setDailyError(data.error || "Failed to load daily rollups");
        } else {
          setDaily(data);
        }
      } else {
        console.error("[ReportsDashboard] daily error:", dailyResult.reason);
        setDailyError(dailyResult.reason?.message || "Failed to load daily rollups");
      }
    } catch (err) {
      console.error("[ReportsDashboard] error:", err);
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    const s = report?.summary || {};
    return {
      voucherAmount: Number(s.totalVoucherAmount || 0),
      voucherBonus: Number(s.totalVoucherBonus || 0),
      credits: Number(s.totalCredits || 0),
      debits: Number(s.totalDebits || 0),
      betAmount: Number(s.totalBetAmount || 0),
      winAmount: Number(s.totalWinAmount || 0),
      ggr: Number(s.grossGamingRevenue || 0),
      netCashflow: Number(s.netCashflow || 0),
    };
  }, [report]);

  const chartData = useMemo(() => {
    if (!report) return [];
    return [
      { name: "Voucher Amt", value: totals.voucherAmount },
      { name: "Voucher Bonus", value: totals.voucherBonus },
      { name: "Credits", value: totals.credits },
      { name: "Debits", value: totals.debits },
      { name: "Bet Amount", value: totals.betAmount },
      { name: "Win Amount", value: totals.winAmount },
      { name: "GGR", value: totals.ggr },
      { name: "Net Flow", value: totals.netCashflow },
    ];
  }, [report, totals]);

  const ngrSeries = useMemo(() => {
    if (!report) return [];
    const ngrValue = totals.betAmount - totals.winAmount - totals.voucherBonus;
    return [
      { name: "Bets", value: totals.betAmount, color: "#27d9ff" },
      { name: "Wins", value: totals.winAmount, color: "#ff304f" },
      { name: "Bonuses", value: totals.voucherBonus, color: "#f6c453" },
      { name: "NGR", value: ngrValue, color: "#31f58d" },
    ];
  }, [report, totals]);

  const handleSeries = useMemo(() => {
    if (!report) return [];
    const games = report?.games?.byGame || [];
    const base = games.length
      ? games
      : [
          {
            game: "Total",
            totalBet: totals.betAmount,
            totalWin: totals.winAmount,
          },
        ];
    return base
      .map((item) => ({
        name: String(item.game || item.gameId || "Total"),
        handle: Number(item.totalBet || 0),
        payout: Number(item.totalWin || 0),
      }))
      .sort((a, b) => b.handle - a.handle)
      .slice(0, 6);
  }, [report, totals]);

  const revenueSeries = useMemo(() => {
    if (!report) return [];
    const games = report?.games?.byGame || [];
    if (!games.length) return [];
    return [...games]
      .map((item) => ({
        name: String(item.game || item.gameId || "Unknown"),
        value: Number(item.ggr || 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [report]);

  const cashflowSeries = useMemo(() => daily?.days || [], [daily]);

  const activeSeries = useMemo(
    () => behavior?.activeUsers?.days || [],
    [behavior]
  );

  const retentionSeries = useMemo(
    () => behavior?.retention?.cohorts || [],
    [behavior]
  );

  const sessionLengthSeries = useMemo(
    () => behavior?.distributions?.sessionLengths || [],
    [behavior]
  );

  const betSizeSeries = useMemo(
    () => behavior?.distributions?.betSizes || [],
    [behavior]
  );

  const hasCashflow = useMemo(
    () => cashflowSeries.some((point) => point.deposits || point.withdrawals),
    [cashflowSeries]
  );

  const hasActiveUsers = useMemo(
    () => activeSeries.some((point) => point.dau || point.wau || point.mau),
    [activeSeries]
  );

  const hasRetention = useMemo(
    () => retentionSeries.some((point) => point.d1 != null || point.d7 != null || point.d30 != null),
    [retentionSeries]
  );

  const hasSessionLengths = useMemo(
    () => sessionLengthSeries.some((point) => point.value),
    [sessionLengthSeries]
  );

  const hasBetSizes = useMemo(
    () => betSizeSeries.some((point) => point.value),
    [betSizeSeries]
  );

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Reports</h2>
            <p className="panel-subtitle">
              Generate high-level financial and gameplay metrics over a date range.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input"
            />
          </div>
          <div className="field">
            <label>To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input"
            />
          </div>
          <div className="field" style={{ alignSelf: "end" }}>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
              {loading ? "Loading..." : "Generate report"}
            </button>
          </div>
        </div>

        {error && <div className="alert">Error loading report: {error}</div>}
      </div>

      {report && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Voucher Amount</div>
              <div className="stat-value">{formatNumber(report.summary.totalVoucherAmount)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Voucher Bonus</div>
              <div className="stat-value">{formatNumber(report.summary.totalVoucherBonus)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Credits</div>
              <div className="stat-value">{formatNumber(report.summary.totalCredits)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Debits</div>
              <div className="stat-value">{formatNumber(report.summary.totalDebits)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Bet Amount</div>
              <div className="stat-value">{formatNumber(report.summary.totalBetAmount)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Win Amount</div>
              <div className="stat-value">{formatNumber(report.summary.totalWinAmount)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">GGR</div>
              <div className="stat-value">{formatNumber(report.summary.grossGamingRevenue)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Net Cashflow</div>
              <div className="stat-value">{formatNumber(report.summary.netCashflow)}</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Summary (Bar)</h3>
              </div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="name" stroke="rgba(202,210,224,0.6)" />
                    <YAxis stroke="rgba(202,210,224,0.6)" />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => formatNumber(value)}
                    />
                    <Bar dataKey="value" fill="#27d9ff" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Summary (Line)</h3>
              </div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="name" stroke="rgba(202,210,224,0.6)" />
                    <YAxis stroke="rgba(202,210,224,0.6)" />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => formatNumber(value)}
                    />
                    <Line type="monotone" dataKey="value" stroke="#ff304f" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Net Gaming Revenue (NGR)</h3>
                  <p className="panel-subtitle">Gross bets - wins - bonuses.</p>
                </div>
              </div>
              {ngrSeries.length ? (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ngrSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="name" stroke="rgba(202,210,224,0.6)" />
                      <YAxis stroke="rgba(202,210,224,0.6)" />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value) => formatNumber(value)}
                      />
                      <Bar dataKey="value">
                        {ngrSeries.map((entry) => (
                          <Cell key={`ngr-${entry.name}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty">No NGR data for this range.</div>
              )}
            </div>
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Handle vs Payout Ratio</h3>
                  <p className="panel-subtitle">Handle vs payout trend across top games.</p>
                </div>
              </div>
              {handleSeries.length ? (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={handleSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="name" stroke="rgba(202,210,224,0.6)" />
                      <YAxis stroke="rgba(202,210,224,0.6)" />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value) => formatNumber(value)}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="handle"
                        name="Handle"
                        stroke="#27d9ff"
                        fill="rgba(39, 217, 255, 0.18)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="payout"
                        name="Payout"
                        stroke="#ff304f"
                        fill="rgba(255, 48, 79, 0.18)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty">No handle data for this range.</div>
              )}
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Deposits vs Withdrawals</h3>
                  <p className="panel-subtitle">
                    Credits in vs debits out over time.
                  </p>
                </div>
              </div>
              {dailyError && <div className="alert">{dailyError}</div>}
              {hasCashflow ? (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashflowSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis
                        dataKey="day"
                        stroke="rgba(202,210,224,0.6)"
                        tickFormatter={formatDayLabel}
                        minTickGap={18}
                      />
                      <YAxis stroke="rgba(202,210,224,0.6)" />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value) => formatNumber(value)}
                        labelFormatter={formatDayLabel}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="deposits"
                        name="Deposits"
                        stroke="#27d9ff"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="withdrawals"
                        name="Withdrawals"
                        stroke="#ff304f"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty">No deposit/withdrawal data in this range.</div>
              )}
            </div>
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Revenue by Game / Provider</h3>
                  <p className="panel-subtitle">Top contributors in this range.</p>
                </div>
              </div>
              {revenueSeries.length ? (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueSeries} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis type="number" stroke="rgba(202,210,224,0.6)" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={90}
                        stroke="rgba(202,210,224,0.6)"
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value) => formatNumber(value)}
                      />
                      <Bar dataKey="value" fill="#27d9ff" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty">No revenue-by-game data in this range.</div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Player Behavior</h3>
                <p className="panel-subtitle">Where money is made: activity, retention, and bet sizing.</p>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">DAU / WAU / MAU</h3>
                  <p className="panel-subtitle">
                    Daily, weekly, and monthly active players.
                  </p>
                </div>
              </div>
              {behaviorError && <div className="alert">{behaviorError}</div>}
              {hasActiveUsers ? (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis
                        dataKey="day"
                        stroke="rgba(202,210,224,0.6)"
                        tickFormatter={formatDayLabel}
                        minTickGap={18}
                      />
                      <YAxis stroke="rgba(202,210,224,0.6)" />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value) => formatNumber(value)}
                        labelFormatter={formatDayLabel}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="dau"
                        name="DAU"
                        stroke="#27d9ff"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="wau"
                        name="WAU"
                        stroke="#f6c453"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="mau"
                        name="MAU"
                        stroke="#31f58d"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty">No active user data in this range.</div>
              )}
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Retention Curve (D1 / D7 / D30)</h3>
                  <p className="panel-subtitle">
                    Cohorts by signup day with day 1/7/30 return rates.
                  </p>
                </div>
              </div>
              {behaviorError && <div className="alert">{behaviorError}</div>}
              {hasRetention ? (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={retentionSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis
                        dataKey="day"
                        stroke="rgba(202,210,224,0.6)"
                        tickFormatter={formatDayLabel}
                        minTickGap={18}
                      />
                      <YAxis
                        stroke="rgba(202,210,224,0.6)"
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value) => formatPercent(value)}
                        labelFormatter={formatDayLabel}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="d1"
                        name="Day 1"
                        stroke="#27d9ff"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="d7"
                        name="Day 7"
                        stroke="#f6c453"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="d30"
                        name="Day 30"
                        stroke="#ff304f"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty">No retention cohorts in this range.</div>
              )}
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Session Length Distribution</h3>
                  <p className="panel-subtitle">
                    Duration histogram for player sessions.
                  </p>
                </div>
              </div>
              {behaviorError && <div className="alert">{behaviorError}</div>}
              {hasSessionLengths ? (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sessionLengthSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="name" stroke="rgba(202,210,224,0.6)" />
                      <YAxis stroke="rgba(202,210,224,0.6)" />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value) => formatNumber(value)}
                      />
                      <Bar dataKey="value" fill="#27d9ff" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty">No session length data in this range.</div>
              )}
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Bet Size Distribution</h3>
                  <p className="panel-subtitle">
                    Game bet amounts by bucket.
                  </p>
                </div>
              </div>
              {behaviorError && <div className="alert">{behaviorError}</div>}
              {hasBetSizes ? (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={betSizeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="name" stroke="rgba(202,210,224,0.6)" />
                      <YAxis stroke="rgba(202,210,224,0.6)" />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value) => formatNumber(value)}
                      />
                      <Bar dataKey="value" fill="#f6c453" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty">No bet size data in this range.</div>
              )}
            </div>
          </div>
        </>
      )}

      {!report && !loading && !error && (
        <div className="panel">
          <div className="panel-title">No report loaded yet</div>
          <div className="panel-subtitle">
            Pick a date range and generate a report to view analytics.
          </div>
        </div>
      )}
    </div>
  );
}
