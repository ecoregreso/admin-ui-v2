import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import AnalyticsFilters from "../../components/AnalyticsFilters.jsx";
import InfoTooltip from "../../components/InfoTooltip.jsx";
import { fetchAnalyticsPlayers } from "../../api/analyticsApi";
import {
  formatBucketLabel,
  formatCents,
  formatNumber,
  formatPercent,
  maskId,
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
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    bucket: "day",
    timezone: tz,
    gameKey: "",
    agentId: "",
    cashierId: "",
    provider: "",
    region: "",
  };
}

function normalizeFilters(filters) {
  const out = { ...filters };
  const normalizeDate = (value) => {
    if (!value) return "";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value);
  };
  out.from = normalizeDate(filters.from);
  out.to = normalizeDate(filters.to);
  out.bucket = filters.bucket || "day";
  out.timezone = filters.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
  out.agentId = filters.agentId?.trim?.() || undefined;
  out.cashierId = filters.cashierId?.trim?.() || undefined;
  out.gameKey = filters.gameKey?.trim?.() || undefined;
  out.provider = filters.provider?.trim?.() || undefined;
  out.region = filters.region?.trim?.() || undefined;
  return out;
}

export default function AnalyticsPlayers() {
  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const load = useCallback(async (nextFilters) => {
    setLoading(true);
    setError("");
    setWarnings([]);
    try {
      const res = await fetchAnalyticsPlayers(normalizeFilters(nextFilters || filtersRef.current));
      if (!res.ok) {
        setError(res.error || "Failed to load player analytics");
      } else {
        setData(res.data);
        setWarnings(res.warnings || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load player analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(normalizeFilters(filtersRef.current));
  }, [load]);

  const activeSeries = data?.activeUsers?.series ?? EMPTY_ARRAY;
  const activeKpis = data?.activeUsers?.kpis || {};
  const retention = data?.retention ?? EMPTY_ARRAY;
  const sessionLengths = data?.sessionLengths ?? EMPTY_ARRAY;
  const betSizes = data?.betSizes ?? EMPTY_ARRAY;
  const highValue = data?.highValuePlayers ?? EMPTY_ARRAY;
  const risk = data?.risk || {};

  const winRateRows = risk.winRateOutliers?.rows ?? EMPTY_ARRAY;
  const winRateData = winRateRows.map((row, index) => ({
    ...row,
    index: index + 1,
  }));
  const winRateOutliers = winRateData.filter((row) => Math.abs(row.zScoreLikeMetric) >= 0.2);
  const winRateNormals = winRateData.filter((row) => Math.abs(row.zScoreLikeMetric) < 0.2);

  const geoPie = risk.geo?.pie ?? EMPTY_ARRAY;
  const geoAnomalies = risk.geo?.anomalies ?? EMPTY_ARRAY;

  const accountVelocity = risk.accountVelocity || {};
  const userVelocity = accountVelocity.users ?? EMPTY_ARRAY;
  const sessionVelocity = accountVelocity.sessions ?? EMPTY_ARRAY;

  const bonusAbuse = risk.bonusAbuse || {};

  const hasActive = activeSeries.some((row) => row.activeUsers);
  const hasRetention = retention.some((row) => row.d1 || row.d7 || row.d30);
  const hasSessions = sessionLengths.some((row) => row.count);
  const hasBets = betSizes.some((row) => row.count);
  const hasWinRate = winRateRows.length > 0;
  const hasGeo = geoPie.some((row) => row.sessions);
  const hasVelocity = userVelocity.some((row) => row.count) || sessionVelocity.some((row) => row.count);

  return (
    <div className="page">
      <AnalyticsFilters
        filters={filters}
        onChange={setFilters}
        onApply={() => load(filters)}
        loading={loading}
        showAdvanced
      />
      {error && <div className="alert">{error}</div>}
      {warnings.map((warning) => (
        <div className="alert" key={warning}>
          {warning}
        </div>
      ))}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">DAU</div>
          <div className="stat-value">{formatNumber(activeKpis.dau)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">WAU</div>
          <div className="stat-value">{formatNumber(activeKpis.wau)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">MAU</div>
          <div className="stat-value">{formatNumber(activeKpis.mau)}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">Active Users</h3>
            <InfoTooltip
              title="DAU / WAU / MAU"
              content="Players with bet or spin activity in each bucket. Flat means stagnant; spikes show promotions or outages."
            />
          </div>
        </div>
          {hasActive ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeSeries}>
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
                  <Line type="monotone" dataKey="activeUsers" stroke="#27d9ff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No activity data for this range.</div>
          )}
        </div>

        <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">Retention (D1 / D7 / D30)</h3>
            <InfoTooltip
              title="Retention Cohorts"
              content="Percent of players returning on day 1, 7, and 30 after first activity. Use this to track sticky growth vs. leaky buckets."
            />
          </div>
        </div>
          {hasRetention ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={retention}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="cohortDate" stroke="rgba(202,210,224,0.6)" tickFormatter={formatBucketLabel} />
                  <YAxis stroke="rgba(202,210,224,0.6)" tickFormatter={(value) => `${value}%`} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => formatPercent(value / 100)}
                    labelFormatter={(value) => formatBucketLabel(value, "day")}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="d1" name="Day 1" stroke="#27d9ff" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="d7" name="Day 7" stroke="#f6c453" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="d30" name="Day 30" stroke="#ff304f" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No retention data in this range.</div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">Session Length Distribution</h3>
            <InfoTooltip
              title="Session Lengths"
              content="Histogram of session durations. Long tails can mean deep engagement or risk flags; ultra-short spikes can indicate churn."
            />
          </div>
        </div>
          {hasSessions ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionLengths}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" stroke="rgba(202,210,224,0.6)" />
                  <YAxis stroke="rgba(202,210,224,0.6)" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatNumber(value)} />
                  <Bar dataKey="count" fill="#27d9ff" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No session length data.</div>
          )}
        </div>

        <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">Bet Size Distribution</h3>
            <InfoTooltip
              title="Bet Sizes"
              content="Box view of bet sizes to spot whales vs. casuals and sudden stake jumps."
            />
          </div>
        </div>
          {hasBets ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={betSizes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" stroke="rgba(202,210,224,0.6)" />
                  <YAxis stroke="rgba(202,210,224,0.6)" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatNumber(value)} />
                  <Bar dataKey="count" fill="#f6c453" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No bet size data.</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">High Value Players</h3>
            <InfoTooltip
              title="High Value Players"
              content="Top contributors by NGR (IDs masked). Helps monitor whale dependency and fraud risk."
            />
          </div>
        </div>
        {highValue.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Bets</th>
                  <th>Wins</th>
                  <th>NGR</th>
                </tr>
              </thead>
              <tbody>
                {highValue.map((row) => (
                  <tr key={row.playerId}>
                    <td>{maskId(row.playerId)}</td>
                    <td>{formatCents(row.betsCents)}</td>
                    <td>{formatCents(row.winsCents)}</td>
                    <td>{formatCents(row.ngrCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No high value players in this range.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">Risk & Abuse Signals</h3>
            <InfoTooltip
              title="Risk Signals"
              content="Operator-side anomaly monitors: win-rate outliers, geo spikes, account velocity, and session velocity."
            />
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">Win Rate Outliers</h3>
            <InfoTooltip
              title="Win Rate Outliers"
              content="Players whose RTP deviates heavily from expected. Use spins and z-score columns to triage."
            />
          </div>
        </div>
          {hasWinRate ? (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="index" stroke="rgba(202,210,224,0.6)" tick={false} />
                  <YAxis
                    dataKey="zScoreLikeMetric"
                    stroke="rgba(202,210,224,0.6)"
                    tickFormatter={(value) => formatPercent(value)}
                  />
                  <ZAxis dataKey="betsCents" range={[40, 160]} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value, name) => {
                      if (name === "zScoreLikeMetric") return formatPercent(value);
                      if (name === "betsCents") return formatCents(value);
                      return value;
                    }}
                    labelFormatter={() => ""}
                  />
                  <Scatter data={winRateNormals} fill="rgba(39, 217, 255, 0.5)" />
                  <Scatter data={winRateOutliers} fill="#ff304f" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No win rate data.</div>
          )}
        </div>

        <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">Geographic Anomalies</h3>
            <InfoTooltip
              title="Geographic Anomalies"
              content="Regions contributing unusual traffic or net positions versus baseline; flags VPN farms or region shifts."
            />
          </div>
        </div>
          {hasGeo ? (
            <div className="stack">
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={geoPie} dataKey="sessions" nameKey="region" outerRadius={80}>
                      {geoPie.map((entry, index) => (
                        <Cell key={entry.region} fill={index % 2 ? "#f6c453" : "#27d9ff"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatNumber(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Region</th>
                      <th>Sessions</th>
                      <th>Spike</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geoAnomalies.map((row) => (
                      <tr key={row.region}>
                        <td>{row.region}</td>
                        <td>{formatNumber(row.sessions)}</td>
                        <td>{row.spike.toFixed(1)}x</td>
                      </tr>
                    ))}
                    {!geoAnomalies.length && (
                      <tr>
                        <td colSpan={3} className="empty">
                          No anomalies detected.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty">No geographic data.</div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">Account Velocity</h3>
            <InfoTooltip
              title="Account Velocity"
              content="Accounts created per bucket. Sudden spikes without marketing may indicate scripted signups."
            />
          </div>
        </div>
          {hasVelocity ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userVelocity}>
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
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Accounts" stroke="#27d9ff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No account velocity data.</div>
          )}
        </div>

        <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">Session Velocity</h3>
            <InfoTooltip
              title="Session Velocity"
              content="Sessions started per bucket. Spikes can signal promos, bots, or outages recovering."
            />
          </div>
        </div>
          {hasVelocity ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sessionVelocity}>
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
                  <Line type="monotone" dataKey="count" name="Sessions" stroke="#f6c453" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No session velocity data.</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">Bonus Abuse Indicators</h3>
            <InfoTooltip
              title="Bonus Abuse"
              content="If bonuses exist, shows flagged vs legit patterns. Empty when bonus system is not configured."
            />
          </div>
        </div>
        {bonusAbuse?.rows?.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Bonus Cost</th>
                  <th>Voucher Credits</th>
                  <th>Redemptions</th>
                  <th>Bonus / Deposit</th>
                </tr>
              </thead>
              <tbody>
                {bonusAbuse.rows.map((row) => (
                  <tr key={row.playerId}>
                    <td>{maskId(row.playerId)}</td>
                    <td>{formatCents(row.bonusCents)}</td>
                    <td>{formatCents(row.voucherCents)}</td>
                    <td>{formatNumber(row.redemptions)}</td>
                    <td>
                      {row.bonusToDepositRatio == null
                        ? "n/a"
                        : formatPercent(row.bonusToDepositRatio)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No bonus abuse data.</div>
        )}
      </div>
    </div>
  );
}
