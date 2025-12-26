import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import AnalyticsFilters from "../../components/AnalyticsFilters.jsx";
import { fetchAnalyticsRevenue } from "../../api/analyticsApi";
import { formatBucketLabel, formatCents, formatNumber } from "../../utils/analyticsFormat";

const TOOLTIP_STYLE = {
  background: "rgba(8, 10, 14, 0.92)",
  border: "1px solid rgba(39, 217, 255, 0.35)",
  borderRadius: 12,
  color: "#f4f6fa",
};
const EMPTY_ARRAY = [];

function defaultFilters() {
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    bucket: "day",
    timezone: "America/Los_Angeles",
  };
}

export default function AnalyticsRevenue() {
  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const load = useCallback(async (nextFilters) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAnalyticsRevenue(nextFilters || filtersRef.current);
      if (!res.ok) {
        setError(res.error || "Failed to load revenue analytics");
      } else {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load revenue analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cashflowSeries = data?.cashflow ?? EMPTY_ARRAY;
  const handleSeries = data?.handleSeries ?? EMPTY_ARRAY;
  const byGame = data?.byGame ?? EMPTY_ARRAY;
  const topGames = byGame.slice(0, 10);

  return (
    <div className="page">
      <AnalyticsFilters
        filters={filters}
        onChange={setFilters}
        onApply={load}
        loading={loading}
        showAdvanced
      />
      {error && <div className="alert">{error}</div>}

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Deposits vs Withdrawals</h3>
          </div>
          {cashflowSeries.length ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashflowSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="t"
                    stroke="rgba(202,210,224,0.6)"
                    tickFormatter={(value) => formatBucketLabel(value, filters.bucket)}
                  />
                  <YAxis stroke="rgba(202,210,224,0.6)" />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => formatCents(value)}
                    labelFormatter={(value) => formatBucketLabel(value, filters.bucket)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="depositsCents"
                    name="Deposits"
                    stroke="#27d9ff"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="withdrawalsCents"
                    name="Withdrawals"
                    stroke="#ff304f"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No cashflow data in this range.</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Handle vs Payout</h3>
          </div>
          {handleSeries.length ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={handleSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="t"
                    stroke="rgba(202,210,224,0.6)"
                    tickFormatter={(value) => formatBucketLabel(value, filters.bucket)}
                  />
                  <YAxis stroke="rgba(202,210,224,0.6)" />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => formatCents(value)}
                    labelFormatter={(value) => formatBucketLabel(value, filters.bucket)}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="handleCents"
                    name="Handle"
                    stroke="#27d9ff"
                    fill="rgba(39, 217, 255, 0.2)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="payoutCents"
                    name="Payout"
                    stroke="#ff304f"
                    fill="rgba(255, 48, 79, 0.18)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No handle/payout data in this range.</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">NGR by Game</h3>
        </div>
        {topGames.length ? (
          <div className="stack">
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topGames} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" stroke="rgba(202,210,224,0.6)" />
                  <YAxis dataKey="gameKey" type="category" width={120} stroke="rgba(202,210,224,0.6)" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatCents(value)} />
                  <Bar dataKey="ngrCents" name="NGR" fill="#27d9ff" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Bets</th>
                    <th>Wins</th>
                    <th>NGR</th>
                    <th>Spins</th>
                  </tr>
                </thead>
                <tbody>
                  {topGames.map((game) => (
                    <tr key={game.gameKey}>
                      <td>{game.gameKey}</td>
                      <td>{formatCents(game.betsCents)}</td>
                      <td>{formatCents(game.winsCents)}</td>
                      <td>{formatCents(game.ngrCents)}</td>
                      <td>{formatNumber(game.spins)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty">No game revenue data in this range.</div>
        )}
      </div>
    </div>
  );
}
