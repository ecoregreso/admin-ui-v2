import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import AnalyticsFilters from "../../components/AnalyticsFilters.jsx";
import { fetchAnalyticsAttribution, fetchAnalyticsOverview } from "../../api/analyticsApi";
import {
  formatBucketLabel,
  formatCents,
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

export default function AnalyticsOverview() {
  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData] = useState(null);
  const [attribution, setAttribution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [truthMode, setTruthMode] = useState(false);
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const load = useCallback(async (nextFilters) => {
    const params = nextFilters || filtersRef.current;
    setLoading(true);
    setError("");
    try {
      const [overviewRes, attributionRes] = await Promise.all([
        fetchAnalyticsOverview(params),
        fetchAnalyticsAttribution({ ...params, metric: "ngr" }),
      ]);
      if (!overviewRes.ok) {
        setError(overviewRes.error || "Failed to load analytics");
      } else {
        setData(overviewRes.data);
      }
      if (attributionRes.ok) {
        setAttribution(attributionRes.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revenueSeries = data?.revenueSeries ?? EMPTY_ARRAY;
  const revenueByGame = data?.revenueByGame ?? EMPTY_ARRAY;
  const kpis = data?.kpis || {};
  const truth = data?.truth || {};
  const attributionFactors = attribution?.factors ?? EMPTY_ARRAY;

  const pieColors = ["#27d9ff", "#31f58d", "#f6c453", "#ff304f", "#b280ff", "#44f2f2"];
  const seriesData = revenueSeries.map((row) => ({
    t: row.t,
    handleCents: row.betsCents,
    payoutCents: row.winsCents,
    ngrCents: row.ngrCents,
  }));
  const topGames = revenueByGame.slice(0, 8);

  return (
    <div className="page">
      <AnalyticsFilters filters={filters} onChange={setFilters} onApply={load} loading={loading} />
      {error && <div className="alert">{error}</div>}

      <div className="inline" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 className="panel-title">Operator Intelligence Overview</h2>
          <p className="panel-subtitle">Revenue oxygen, player activity, and truth mode ratios.</p>
        </div>
        <label className="inline" style={{ gap: 8 }}>
          <input
            type="checkbox"
            checked={truthMode}
            onChange={(e) => setTruthMode(e.target.checked)}
          />
          <span className="stat-label">Truth Mode</span>
        </label>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">NGR</div>
          <div className="stat-value">{formatCents(kpis.ngrCents)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Handle</div>
          <div className="stat-value">{formatCents(kpis.handleCents)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Payout</div>
          <div className="stat-value">{formatCents(kpis.payoutCents)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Deposits</div>
          <div className="stat-value">{formatCents(kpis.depositsCents)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Withdrawals</div>
          <div className="stat-value">{formatCents(kpis.withdrawalsCents)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">DAU</div>
          <div className="stat-value">{formatNumber(kpis.dau)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">WAU</div>
          <div className="stat-value">{formatNumber(kpis.wau)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">MAU</div>
          <div className="stat-value">{formatNumber(kpis.mau)}</div>
        </div>
        {truthMode && (
          <>
            <div className="stat-card">
              <div className="stat-label">Revenue / Active</div>
              <div className="stat-value">{formatCents(truth.revenuePerActiveUser)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Whale Top 1%</div>
              <div className="stat-value">{formatPercent(truth.whaleDependency?.top1Pct)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Whale Top 5%</div>
              <div className="stat-value">{formatPercent(truth.whaleDependency?.top5Pct)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Whale Top 10%</div>
              <div className="stat-value">{formatPercent(truth.whaleDependency?.top10Pct)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Spike Dependence</div>
              <div className="stat-value">{formatPercent(truth.volatilityRiskIndicator)}</div>
            </div>
          </>
        )}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">NGR + Handle + Payout</h3>
          </div>
          {seriesData.length ? (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seriesData}>
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
                  <Line type="monotone" dataKey="ngrCents" name="NGR" stroke="#31f58d" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="handleCents" name="Handle" stroke="#27d9ff" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="payoutCents" name="Payout" stroke="#ff304f" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No revenue data in this range.</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Revenue by Game</h3>
          </div>
          {revenueByGame.length ? (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByGame}
                    dataKey="ngrCents"
                    nameKey="gameKey"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {revenueByGame.map((entry, index) => (
                      <Cell key={entry.gameKey} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => formatCents(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No game revenue data in this range.</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Top Games</h3>
        </div>
        {topGames.length ? (
          <div className="stack">
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topGames} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" stroke="rgba(202,210,224,0.6)" />
                  <YAxis dataKey="gameKey" type="category" width={100} stroke="rgba(202,210,224,0.6)" />
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
          <div className="empty">No game data available.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">What Actually Caused This?</h3>
        </div>
        {attributionFactors.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                {attributionFactors.map((factor) => (
                  <tr key={factor.factor}>
                    <td>{factor.factor}</td>
                    <td>{`${factor.contributionPct.toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No attribution data available.</div>
        )}
      </div>
    </div>
  );
}
