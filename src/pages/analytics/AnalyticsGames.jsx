import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import AnalyticsFilters from "../../components/AnalyticsFilters.jsx";
import { fetchAnalyticsGames } from "../../api/analyticsApi";
import {
  formatBucketLabel,
  formatNumber,
  formatPercent,
} from "../../utils/analyticsFormat";

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

export default function AnalyticsGames() {
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
      const res = await fetchAnalyticsGames(nextFilters || filtersRef.current);
      if (!res.ok) {
        setError(res.error || "Failed to load game analytics");
      } else {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load game analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rtpByGame = data?.rtpByGame ?? EMPTY_ARRAY;
  const volatility = data?.volatility ?? EMPTY_ARRAY;
  const spinVolume = data?.spinVolume ?? EMPTY_ARRAY;

  const rtpChartData = rtpByGame
    .map((row) => ({
      gameKey: row.gameKey,
      actual: (row.actualRtp || 0) * 100,
      expected: (row.expectedRtp || 0) * 100,
      spins: row.spins,
    }))
    .sort((a, b) => b.spins - a.spins)
    .slice(0, 8);

  const volatilityTimes = Array.from(new Set(volatility.map((row) => row.t)))
    .sort()
    .slice(-14);
  const volatilityGames = Array.from(new Set(volatility.map((row) => row.gameKey))).slice(0, 8);
  const volatilityMax = volatility.reduce(
    (max, row) => Math.max(max, row.volatility || 0),
    0
  );
  const volatilityMap = new Map(
    volatility.map((row) => [`${row.gameKey}__${row.t}`, row])
  );

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
            <h3 className="panel-title">RTP Actual vs Expected</h3>
          </div>
          {rtpChartData.length ? (
            <div className="stack">
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rtpChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="gameKey" stroke="rgba(202,210,224,0.6)" />
                    <YAxis
                      stroke="rgba(202,210,224,0.6)"
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => `${Number(value).toFixed(1)}%`}
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
                      <th>Actual RTP</th>
                      <th>Expected RTP</th>
                      <th>Spins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rtpChartData.map((row) => (
                      <tr key={row.gameKey}>
                        <td>{row.gameKey}</td>
                        <td>{formatPercent(row.actual / 100)}</td>
                        <td>{row.expected ? formatPercent(row.expected / 100) : "n/a"}</td>
                        <td>{formatNumber(row.spins)}</td>
                      </tr>
                    ))}
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
            <h3 className="panel-title">Spin Volume Over Time</h3>
          </div>
          {spinVolume.length ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spinVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="t"
                    stroke="rgba(202,210,224,0.6)"
                    tickFormatter={(value) => formatBucketLabel(value, filters.bucket)}
                  />
                  <YAxis stroke="rgba(202,210,224,0.6)" />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => formatNumber(value)}
                    labelFormatter={(value) => formatBucketLabel(value, filters.bucket)}
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
          ) : (
            <div className="empty">No spin volume data.</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Volatility Heatmap</h3>
        </div>
        {volatilityTimes.length && volatilityGames.length ? (
          <div className="stack">
            <div className="heatmap-wrap">
              <div
                className="heatmap-grid"
                style={{
                  gridTemplateColumns: `140px repeat(${Math.max(
                    volatilityTimes.length,
                    1
                  )}, 28px)`,
                }}
              >
                <div className="heatmap-label" />
                {volatilityTimes.map((t, index) => (
                  <div key={t} className="heatmap-day">
                    {index % 2 === 0 ? formatBucketLabel(t, filters.bucket) : ""}
                  </div>
                ))}
                {volatilityGames.map((gameKey) => (
                  <React.Fragment key={gameKey}>
                    <div className="heatmap-row-label">{gameKey}</div>
                    {volatilityTimes.map((t) => {
                      const cell = volatilityMap.get(`${gameKey}__${t}`);
                      const value = Number(cell?.volatility || 0);
                      return (
                        <div
                          key={`${gameKey}-${t}`}
                          className="heatmap-cell"
                          style={{ backgroundColor: getHeatColor(value, volatilityMax) }}
                          title={`${gameKey} · ${formatBucketLabel(
                            t,
                            filters.bucket
                          )} · Vol ${value.toFixed(2)}`}
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
          </div>
        ) : (
          <div className="empty">No volatility data.</div>
        )}
      </div>
    </div>
  );
}
