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
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
} from "recharts";
import {
  fetchBehaviorReport,
  fetchDailyReport,
  fetchOperationsReport,
  fetchPerformanceReport,
  fetchRiskReport,
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

function formatHourLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric" });
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

function formatDurationMinutes(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  const minutes = Math.max(0, Number(value));
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hrs}h ${mins}m`;
  }
  return `${Math.round(minutes)}m`;
}

function getHeatColor(value, max) {
  if (!value || !max) return "rgba(255, 255, 255, 0.04)";
  const ratio = Math.max(0, Math.min(1, value / max));
  const start = { r: 39, g: 217, b: 255 };
  const end = { r: 255, g: 48, b: 79 };
  const r = Math.round(start.r + (end.r - start.r) * ratio);
  const g = Math.round(start.g + (end.g - start.g) * ratio);
  const b = Math.round(start.b + (end.b - start.b) * ratio);
  const alpha = 0.18 + ratio * 0.72;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


export default function ReportsDashboard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState(null);
  const [behavior, setBehavior] = useState(null);
  const [daily, setDaily] = useState(null);
  const [risk, setRisk] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [operations, setOperations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [behaviorError, setBehaviorError] = useState("");
  const [dailyError, setDailyError] = useState("");
  const [riskError, setRiskError] = useState("");
  const [performanceError, setPerformanceError] = useState("");
  const [operationsError, setOperationsError] = useState("");

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
    setRiskError("");
    setPerformanceError("");
    setOperationsError("");
    setLoading(true);
    setReport(null);
    setBehavior(null);
    setDaily(null);
    setRisk(null);
    setPerformance(null);
    setOperations(null);

    try {
      const [
        rangeResult,
        behaviorResult,
        dailyResult,
        riskResult,
        performanceResult,
        operationsResult,
      ] =
        await Promise.allSettled([
          fetchRangeReport({ from, to }),
          fetchBehaviorReport({ from, to }),
          fetchDailyReport({ from, to }),
          fetchRiskReport({ from, to }),
          fetchPerformanceReport({ from, to }),
          fetchOperationsReport({ from, to }),
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

      if (riskResult.status === "fulfilled") {
        const data = riskResult.value;
        if (!data.ok) {
          setRiskError(data.error || "Failed to load risk signals");
        } else {
          setRisk(data);
        }
      } else {
        console.error("[ReportsDashboard] risk error:", riskResult.reason);
        setRiskError(riskResult.reason?.message || "Failed to load risk signals");
      }

      if (performanceResult.status === "fulfilled") {
        const data = performanceResult.value;
        if (!data.ok) {
          setPerformanceError(data.error || "Failed to load game performance");
        } else {
          setPerformance(data);
        }
      } else {
        console.error("[ReportsDashboard] performance error:", performanceResult.reason);
        setPerformanceError(
          performanceResult.reason?.message || "Failed to load game performance"
        );
      }

      if (operationsResult.status === "fulfilled") {
        const data = operationsResult.value;
        if (!data.ok) {
          setOperationsError(data.error || "Failed to load operations metrics");
        } else {
          setOperations(data);
        }
      } else {
        console.error("[ReportsDashboard] operations error:", operationsResult.reason);
        setOperationsError(
          operationsResult.reason?.message || "Failed to load operations metrics"
        );
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

  const winRatePoints = useMemo(() => {
    const players = risk?.winRateOutliers?.players || [];
    return players.map((player, index) => ({
      ...player,
      index: index + 1,
    }));
  }, [risk]);

  const winRateOutliers = useMemo(
    () => winRatePoints.filter((player) => player.isOutlier),
    [winRatePoints]
  );

  const winRateNormals = useMemo(
    () => winRatePoints.filter((player) => !player.isOutlier),
    [winRatePoints]
  );

  const bonusSummary = risk?.bonusAbuse || null;

  const bonusPieData = useMemo(() => {
    if (!bonusSummary) return [];
    return [
      { name: "Legit", value: bonusSummary.legit?.count || 0 },
      { name: "Flagged", value: bonusSummary.flagged?.count || 0 },
    ];
  }, [bonusSummary]);

  const bonusFlaggedAccounts = useMemo(() => {
    const accounts = risk?.bonusAbuse?.accounts || [];
    return accounts.filter((account) => account.status === "flagged");
  }, [risk]);

  const geoCountries = useMemo(
    () => risk?.geography?.countries || [],
    [risk]
  );

  const geoPieData = useMemo(
    () => geoCountries.map((entry) => ({ name: entry.country, value: entry.count })),
    [geoCountries]
  );

  const accountDaily = useMemo(
    () => risk?.accountVelocity?.daily || [],
    [risk]
  );

  const accountHourly = useMemo(
    () => risk?.accountVelocity?.hourly || [],
    [risk]
  );

  const opsSystemSeries = useMemo(
    () => operations?.systemHealth?.days || [],
    [operations]
  );

  const opsStaleMinutes = operations?.systemHealth?.staleMinutes || 0;

  const cashierSeries = useMemo(
    () => operations?.cashierPerformance?.days || [],
    [operations]
  );

  const cashierTotals = operations?.cashierPerformance?.totals || null;

  const resolutionCategories = useMemo(() => {
    const categories = operations?.resolution?.categories || [];
    return categories.filter((category) => category.count);
  }, [operations]);

  const resolutionScaleMax = useMemo(() => {
    if (!resolutionCategories.length) return 0;
    return resolutionCategories.reduce((max, category) => {
      const value = Number(category.max || 0);
      return value > max ? value : max;
    }, 0);
  }, [resolutionCategories]);

  const topOpsDays = useMemo(
    () =>
      [...opsSystemSeries]
        .sort((a, b) => (b.failedBets || 0) - (a.failedBets || 0))
        .slice(0, 5),
    [opsSystemSeries]
  );

  const topCashierDays = useMemo(
    () =>
      [...cashierSeries]
        .sort((a, b) => (b.issued || 0) - (a.issued || 0))
        .slice(0, 5),
    [cashierSeries]
  );

  const performanceRtpGames = useMemo(
    () => performance?.rtpByGame?.games || [],
    [performance]
  );

  const rtpChartData = useMemo(() => {
    if (!performanceRtpGames.length) return [];
    return [...performanceRtpGames]
      .map((game) => {
        const actualRtp = Number(game.actualRtp || 0);
        const expectedRtp = Number(game.expectedRtp || 0);
        return {
          name: String(game.gameId || game.game || "Unknown"),
          rounds: Number(game.rounds || 0),
          totalBet: Number(game.totalBet || 0),
          totalWin: Number(game.totalWin || 0),
          actual: actualRtp * 100,
          expected: expectedRtp * 100,
          delta: (actualRtp - expectedRtp) * 100,
        };
      })
      .sort((a, b) => b.rounds - a.rounds)
      .slice(0, 8);
  }, [performanceRtpGames]);

  const spinVolumeSeries = useMemo(
    () => performance?.spinVolume?.days || [],
    [performance]
  );

  const volatilityDays = useMemo(
    () => performance?.volatility?.days || [],
    [performance]
  );

  const volatilityCells = useMemo(
    () => performance?.volatility?.cells || [],
    [performance]
  );

  const volatilityMax = useMemo(
    () => performance?.volatility?.max || 0,
    [performance]
  );

  const heatmapGames = useMemo(() => {
    if (performanceRtpGames.length) {
      return performanceRtpGames
        .map((game) => String(game.gameId || game.game || "Unknown"))
        .filter(Boolean)
        .slice(0, 8);
    }
    const fallback = performance?.volatility?.games || [];
    return fallback.map((game) => String(game)).slice(0, 8);
  }, [performanceRtpGames, performance]);

  const volatilityMap = useMemo(() => {
    const map = new Map();
    for (const cell of volatilityCells) {
      const day = cell.day;
      const gameId = String(cell.gameId || "");
      if (!day || !gameId) continue;
      map.set(`${gameId}__${day}`, cell);
    }
    return map;
  }, [volatilityCells]);

  const heatmapLabelStep = useMemo(() => {
    if (!volatilityDays.length) return 1;
    return Math.ceil(volatilityDays.length / 10);
  }, [volatilityDays]);

  const topVolatilityCells = useMemo(
    () =>
      [...volatilityCells]
        .filter((cell) => Number(cell.volatility || 0) > 0)
        .sort((a, b) => Number(b.volatility || 0) - Number(a.volatility || 0))
        .slice(0, 6),
    [volatilityCells]
  );

  const peakSpinVolume = useMemo(() => {
    if (!spinVolumeSeries.length) return null;
    return spinVolumeSeries.reduce((max, entry) =>
      entry.spins > max.spins ? entry : max
    );
  }, [spinVolumeSeries]);

  const topSpinDays = useMemo(
    () =>
      [...spinVolumeSeries]
        .filter((entry) => entry.spins)
        .sort((a, b) => b.spins - a.spins)
        .slice(0, 5),
    [spinVolumeSeries]
  );

  const peakDaily = useMemo(() => {
    if (!accountDaily.length) return null;
    return accountDaily.reduce((max, entry) => (entry.count > max.count ? entry : max));
  }, [accountDaily]);

  const peakHourly = useMemo(() => {
    if (!accountHourly.length) return null;
    return accountHourly.reduce((max, entry) => (entry.count > max.count ? entry : max));
  }, [accountHourly]);

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

  const hasWinRate = useMemo(
    () => winRatePoints.length > 0,
    [winRatePoints]
  );

  const hasBonusAbuse = useMemo(
    () => bonusPieData.some((slice) => slice.value),
    [bonusPieData]
  );

  const hasGeo = useMemo(
    () => geoPieData.some((slice) => slice.value),
    [geoPieData]
  );

  const hasAccountVelocity = useMemo(
    () => accountDaily.some((point) => point.count) || accountHourly.some((point) => point.count),
    [accountDaily, accountHourly]
  );

  const hasOpsSystem = useMemo(
    () => opsSystemSeries.some((point) => point.pendingBets || point.failedBets),
    [opsSystemSeries]
  );

  const hasCashierPerf = useMemo(
    () => cashierSeries.some((point) => point.issued || point.redeemed || point.expired),
    [cashierSeries]
  );

  const hasResolution = useMemo(
    () => resolutionCategories.some((category) => category.count),
    [resolutionCategories]
  );

  const hasRtp = useMemo(
    () => rtpChartData.some((point) => point.actual || point.expected),
    [rtpChartData]
  );

  const hasVolatility = useMemo(
    () => volatilityCells.some((cell) => cell.volatility),
    [volatilityCells]
  );

  const hasSpinVolume = useMemo(
    () => spinVolumeSeries.some((point) => point.spins),
    [spinVolumeSeries]
  );

  const renderWinRateTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload || {};
    return (
      <div style={TOOLTIP_STYLE}>
        <div>Player: {data.playerId}</div>
        <div>RTP: {formatPercent((data.rtp || 0) * 100)}</div>
        <div>Deviation: {formatPercent((data.deviation || 0) * 100)}</div>
        <div>Total Bet: {formatNumber(data.totalBet)}</div>
        <div>Total Win: {formatNumber(data.totalWin)}</div>
        <div>Rounds: {formatNumber(data.rounds)}</div>
      </div>
    );
  };

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

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Risk, Fraud & Abuse</h3>
                <p className="panel-subtitle">
                  Signals that prevent catastrophic loss before it escalates.
                </p>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Win Rate Outliers</h3>
                  <p className="panel-subtitle">
                    Player RTP deviation from baseline.
                    {risk?.winRateOutliers && (
                      <>
                        {" "}
                        Baseline {formatPercent((risk.winRateOutliers.baselineRtp || 0) * 100)} ·
                        Outlier ±{formatPercent((risk.winRateOutliers.deviationThreshold || 0) * 100)} ·
                        Min bet {formatNumber(risk.winRateOutliers.minBet)}
                      </>
                    )}
                  </p>
                </div>
              </div>
              {riskError && <div className="alert">{riskError}</div>}
              {hasWinRate ? (
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis
                        dataKey="index"
                        name="Player"
                        stroke="rgba(202,210,224,0.6)"
                        tick={false}
                      />
                      <YAxis
                        dataKey="deviation"
                        stroke="rgba(202,210,224,0.6)"
                        tickFormatter={(value) => formatPercent(value * 100)}
                      />
                      <ZAxis dataKey="totalBet" range={[40, 160]} />
                      <Tooltip content={renderWinRateTooltip} />
                      <Scatter data={winRateNormals} fill="rgba(39, 217, 255, 0.45)" />
                      <Scatter data={winRateOutliers} fill="#ff304f" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty">No win rate data in this range.</div>
              )}
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Bonus Abuse Indicators</h3>
                  <p className="panel-subtitle">
                    Legit vs flagged accounts by bonus behavior.
                    {risk?.bonusAbuse?.criteria && (
                      <>
                        {" "}
                        Min bonus {formatNumber(risk.bonusAbuse.criteria.minBonus)} ·
                        Bonus ratio ≥{formatPercent((risk.bonusAbuse.criteria.bonusRatioThreshold || 0) * 100)} ·
                        Bonus / bet ≥{formatPercent((risk.bonusAbuse.criteria.bonusToBetThreshold || 0) * 100)}
                      </>
                    )}
                  </p>
                </div>
              </div>
              {riskError && <div className="alert">{riskError}</div>}
              {hasBonusAbuse ? (
                <div className="stack">
                  <div style={{ width: "100%", height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bonusPieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {bonusPieData.map((entry) => (
                            <Cell
                              key={`bonus-${entry.name}`}
                              fill={entry.name === "Flagged" ? "#ff304f" : "#27d9ff"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value) => formatNumber(value)}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Redemptions</th>
                          <th>Total Bonus</th>
                          <th>Bonus Ratio</th>
                          <th>Bonus / Bet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bonusFlaggedAccounts.map((account) => (
                          <tr key={account.playerId}>
                            <td>{String(account.playerId).slice(0, 10)}</td>
                            <td>{formatNumber(account.redemptions)}</td>
                            <td>{formatNumber(account.totalBonus)}</td>
                            <td>{formatPercent(account.bonusRatio * 100)}</td>
                            <td>{formatPercent(account.bonusToBetRatio * 100)}</td>
                          </tr>
                        ))}
                        {!bonusFlaggedAccounts.length && (
                          <tr>
                            <td colSpan={5} className="empty">
                              No flagged bonus activity in this range.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty">No bonus abuse data in this range.</div>
              )}
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Geographic Anomalies</h3>
                  <p className="panel-subtitle">
                    Session distribution by country.
                    {risk?.geography && (
                      <>
                        {" "}
                        Total {formatNumber(risk.geography.total)} ·
                        Unknown {formatNumber(risk.geography.unknown)}
                      </>
                    )}
                  </p>
                </div>
              </div>
              {riskError && <div className="alert">{riskError}</div>}
              {hasGeo ? (
                <div className="stack">
                  <div style={{ width: "100%", height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={geoPieData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={85}
                          paddingAngle={1}
                        >
                          {geoPieData.map((entry, index) => (
                            <Cell
                              key={`geo-${entry.name}`}
                              fill={index % 2 === 0 ? "#27d9ff" : "#f6c453"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value) => formatNumber(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Country</th>
                          <th>Sessions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {geoCountries.map((entry) => (
                          <tr key={entry.country}>
                            <td>{entry.country}</td>
                            <td>{formatNumber(entry.count)}</td>
                          </tr>
                        ))}
                        {!geoCountries.length && (
                          <tr>
                            <td colSpan={2} className="empty">
                              No session locations in this range.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty">No geographic data in this range.</div>
              )}
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Account Velocity</h3>
                  <p className="panel-subtitle">
                    Accounts created per day and hour.
                    {peakDaily && peakHourly && (
                      <>
                        {" "}
                        Peak day {formatDayLabel(peakDaily.day)} ({formatNumber(peakDaily.count)}) ·
                        Peak hour {formatHourLabel(peakHourly.hour)} ({formatNumber(peakHourly.count)})
                      </>
                    )}
                  </p>
                </div>
              </div>
              {riskError && <div className="alert">{riskError}</div>}
              {hasAccountVelocity ? (
                <div className="stack">
                  <div style={{ width: "100%", height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={accountDaily}>
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
                        <Line type="monotone" dataKey="count" stroke="#27d9ff" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ width: "100%", height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={accountHourly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis
                          dataKey="hour"
                          stroke="rgba(202,210,224,0.6)"
                          tickFormatter={formatHourLabel}
                          minTickGap={30}
                        />
                        <YAxis stroke="rgba(202,210,224,0.6)" />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value) => formatNumber(value)}
                          labelFormatter={formatHourLabel}
                        />
                        <Bar dataKey="count" fill="#f6c453" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="empty">No account velocity data in this range.</div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Operational Intelligence</h3>
                <p className="panel-subtitle">
                  The "nothing broke today" dashboard for day-to-day stability.
                </p>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">System Errors / Failed Bets</h3>
                  <p className="panel-subtitle">
                    Pending rounds vs stale bets (pending &gt; {opsStaleMinutes}m).
                  </p>
                </div>
              </div>
              {operationsError && <div className="alert">{operationsError}</div>}
              {hasOpsSystem ? (
                <div className="stack">
                  <div style={{ width: "100%", height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={opsSystemSeries}>
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
                          dataKey="pendingBets"
                          name="Pending"
                          stroke="#27d9ff"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="failedBets"
                          name="Failed (stale)"
                          stroke="#ff304f"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Pending</th>
                          <th>Failed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topOpsDays.map((day) => (
                          <tr key={day.day}>
                            <td>{formatDayLabel(day.day)}</td>
                            <td>{formatNumber(day.pendingBets)}</td>
                            <td>{formatNumber(day.failedBets)}</td>
                          </tr>
                        ))}
                        {!topOpsDays.length && (
                          <tr>
                            <td colSpan={3} className="empty">
                              No error spikes in this range.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty">No system error data in this range.</div>
              )}
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Cashier Performance</h3>
                  <p className="panel-subtitle">
                    Vouchers issued, redeemed, and expired.
                    {cashierTotals && (
                      <>
                        {" "}
                        Issued {formatNumber(cashierTotals.issued)} · Redeemed{" "}
                        {formatNumber(cashierTotals.redeemed)} · Expired{" "}
                        {formatNumber(cashierTotals.expired)}
                      </>
                    )}
                  </p>
                </div>
              </div>
              {operationsError && <div className="alert">{operationsError}</div>}
              {hasCashierPerf ? (
                <div className="stack">
                  <div style={{ width: "100%", height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashierSeries}>
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
                        <Bar dataKey="issued" name="Issued" fill="#27d9ff" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="redeemed" name="Redeemed" fill="#31f58d" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="expired" name="Expired" fill="#ff304f" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Issued</th>
                          <th>Redeemed</th>
                          <th>Expired</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCashierDays.map((day) => (
                          <tr key={day.day}>
                            <td>{formatDayLabel(day.day)}</td>
                            <td>{formatNumber(day.issued)}</td>
                            <td>{formatNumber(day.redeemed)}</td>
                            <td>{formatNumber(day.expired)}</td>
                          </tr>
                        ))}
                        {!topCashierDays.length && (
                          <tr>
                            <td colSpan={4} className="empty">
                              No cashier activity in this range.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty">No cashier data in this range.</div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Time-to-Resolution (Support / Cashier)</h3>
                <p className="panel-subtitle">
                  Resolution latency by staff role (minutes).
                </p>
              </div>
            </div>
            {operationsError && <div className="alert">{operationsError}</div>}
            {hasResolution ? (
              <div className="stack">
                <div className="boxplot">
                  {resolutionCategories.map((category) => (
                    <div className="boxplot-row" key={category.name}>
                      <div className="boxplot-label">{category.name}</div>
                      <div className="boxplot-track">
                        <div
                          className="boxplot-whisker"
                          style={{
                            left: `${(Number(category.min || 0) / (resolutionScaleMax || 1)) * 100}%`,
                            width: `${((Number(category.max || 0) - Number(category.min || 0)) / (resolutionScaleMax || 1)) * 100}%`,
                          }}
                        />
                        <div
                          className="boxplot-box"
                          style={{
                            left: `${(Number(category.q1 || 0) / (resolutionScaleMax || 1)) * 100}%`,
                            width: `${((Number(category.q3 || 0) - Number(category.q1 || 0)) / (resolutionScaleMax || 1)) * 100}%`,
                          }}
                        />
                        <div
                          className="boxplot-median"
                          style={{
                            left: `${(Number(category.median || 0) / (resolutionScaleMax || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="boxplot-meta">
                        {formatDurationMinutes(category.median)} · {formatNumber(category.count)} samples
                      </div>
                    </div>
                  ))}
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Min</th>
                        <th>Q1</th>
                        <th>Median</th>
                        <th>Q3</th>
                        <th>Max</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resolutionCategories.map((category) => (
                        <tr key={`row-${category.name}`}>
                          <td>{category.name}</td>
                          <td>{formatDurationMinutes(category.min)}</td>
                          <td>{formatDurationMinutes(category.q1)}</td>
                          <td>{formatDurationMinutes(category.median)}</td>
                          <td>{formatDurationMinutes(category.q3)}</td>
                          <td>{formatDurationMinutes(category.max)}</td>
                          <td>{formatNumber(category.count)}</td>
                        </tr>
                      ))}
                      {!resolutionCategories.length && (
                        <tr>
                          <td colSpan={7} className="empty">
                            No resolution data in this range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty">No resolution data in this range.</div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Game Performance</h3>
                <p className="panel-subtitle">
                  Math meets psychology: RTP variance, volatility, and spin volume.
                </p>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">RTP by Game (Actual vs Expected)</h3>
                  <p className="panel-subtitle">Variance is variance until it sticks.</p>
                </div>
              </div>
              {performanceError && <div className="alert">{performanceError}</div>}
              {hasRtp ? (
                <div className="stack">
                  <div style={{ width: "100%", height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rtpChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="name" stroke="rgba(202,210,224,0.6)" />
                        <YAxis
                          stroke="rgba(202,210,224,0.6)"
                          tickFormatter={(value) => formatPercent(value)}
                          domain={[0, "auto"]}
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value) => formatPercent(value)}
                        />
                        <Legend />
                        <Bar dataKey="actual" name="Actual RTP" fill="#27d9ff" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="expected" name="Expected RTP" fill="#f6c453" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Game</th>
                          <th>Rounds</th>
                          <th>Actual RTP</th>
                          <th>Expected RTP</th>
                          <th>Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rtpChartData.map((entry) => (
                          <tr key={entry.name}>
                            <td>{entry.name}</td>
                            <td>{formatNumber(entry.rounds)}</td>
                            <td>{formatPercent(entry.actual)}</td>
                            <td>{formatPercent(entry.expected)}</td>
                            <td>
                              {`${entry.delta >= 0 ? "+" : ""}${formatPercent(entry.delta)}`}
                            </td>
                          </tr>
                        ))}
                        {!rtpChartData.length && (
                          <tr>
                            <td colSpan={5} className="empty">
                              No RTP data in this range.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty">No RTP data in this range.</div>
              )}
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Volatility Heatmap</h3>
                  <p className="panel-subtitle">
                    Net variance by game and day.
                  </p>
                </div>
              </div>
              {performanceError && <div className="alert">{performanceError}</div>}
              {hasVolatility ? (
                <div className="stack">
                  <div className="heatmap-wrap">
                    <div
                      className="heatmap-grid"
                      style={{
                        gridTemplateColumns: `140px repeat(${Math.max(
                          volatilityDays.length,
                          1
                        )}, 28px)`,
                      }}
                    >
                      <div className="heatmap-label" />
                      {volatilityDays.map((day, index) => (
                        <div key={day} className="heatmap-day">
                          {index % heatmapLabelStep === 0 ? formatDayLabel(day) : ""}
                        </div>
                      ))}
                      {heatmapGames.map((gameId) => (
                        <React.Fragment key={gameId}>
                          <div className="heatmap-row-label">{gameId}</div>
                          {volatilityDays.map((day) => {
                            const key = `${gameId}__${day}`;
                            const cell = volatilityMap.get(key);
                            const value = Number(cell?.volatility || 0);
                            const rounds = Number(cell?.rounds || 0);
                            return (
                              <div
                                key={key}
                                className="heatmap-cell"
                                style={{ backgroundColor: getHeatColor(value, volatilityMax) }}
                                title={`${gameId} · ${formatDayLabel(day)} · Vol ${formatNumber(
                                  value
                                )} · Rounds ${formatNumber(rounds)}`}
                              />
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div className="heatmap-legend">
                    <span>Low</span>
                    <div className="heatmap-bar" />
                    <span>High</span>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Game</th>
                          <th>Volatility</th>
                          <th>Rounds</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topVolatilityCells.map((cell) => (
                          <tr key={`${cell.gameId}-${cell.day}`}>
                            <td>{formatDayLabel(cell.day)}</td>
                            <td>{cell.gameId}</td>
                            <td>{formatNumber(cell.volatility)}</td>
                            <td>{formatNumber(cell.rounds)}</td>
                          </tr>
                        ))}
                        {!topVolatilityCells.length && (
                          <tr>
                            <td colSpan={4} className="empty">
                              No volatility spikes in this range.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty">No volatility data in this range.</div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Spin Volume Over Time</h3>
                <p className="panel-subtitle">
                  Dead games show up immediately.
                  {peakSpinVolume && (
                    <>
                      {" "}
                      Peak {formatDayLabel(peakSpinVolume.day)} (
                      {formatNumber(peakSpinVolume.spins)} spins)
                    </>
                  )}
                </p>
              </div>
            </div>
            {performanceError && <div className="alert">{performanceError}</div>}
            {hasSpinVolume ? (
              <div className="stack">
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={spinVolumeSeries}>
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
                      <Area
                        type="monotone"
                        dataKey="spins"
                        name="Spins"
                        stroke="#31f58d"
                        fill="rgba(49, 245, 141, 0.2)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Peak Day</th>
                        <th>Spins</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSpinDays.map((entry) => (
                        <tr key={entry.day}>
                          <td>{formatDayLabel(entry.day)}</td>
                          <td>{formatNumber(entry.spins)}</td>
                        </tr>
                      ))}
                      {!topSpinDays.length && (
                        <tr>
                          <td colSpan={2} className="empty">
                            No spin spikes in this range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty">No spin volume data in this range.</div>
            )}
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
