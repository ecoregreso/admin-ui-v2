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
import AnalyticsFilters from "../components/AnalyticsFilters.jsx";
import { fetchSafetyActions, fetchSafetySummary } from "../api/safetyApi";
import {
  formatBucketLabel,
  formatNumber,
  maskId,
} from "../utils/analyticsFormat";

const TOOLTIP_STYLE = {
  background: "rgba(8, 10, 14, 0.92)",
  border: "1px solid rgba(39, 217, 255, 0.35)",
  borderRadius: 12,
  color: "#f4f6fa",
};
const EMPTY_ARRAY = [];
const PIE_COLORS = ["#27d9ff", "#31f58d", "#f6c453", "#ff304f"];

function defaultFilters() {
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - 6);
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    bucket: "day",
    timezone: "America/Los_Angeles",
  };
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function severityTag(severity) {
  if (severity >= 4) return "tag tag-red";
  if (severity >= 3) return "tag tag-blue";
  return "tag";
}

export default function SafetyDashboard() {
  const [filters, setFilters] = useState(defaultFilters);
  const [summary, setSummary] = useState(null);
  const [actions, setActions] = useState([]);
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
      const params = nextFilters || filtersRef.current;
      const [summaryRes, actionsRes] = await Promise.all([
        fetchSafetySummary(params),
        fetchSafetyActions({ ...params, limit: 50, offset: 0 }),
      ]);
      if (!summaryRes.ok) {
        setError(summaryRes.error || "Failed to load safety summary");
      } else {
        setSummary(summaryRes.data);
      }
      if (actionsRes.ok) {
        setActions(actionsRes.data?.actions || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load safety analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const actionsOverTime = summary?.actionsOverTime ?? EMPTY_ARRAY;
  const actionsByType = summary?.actionsByType ?? EMPTY_ARRAY;
  const actionsByReason = summary?.actionsByReason ?? EMPTY_ARRAY;
  const uniquePlayers = summary?.uniquePlayersAffected || 0;
  const sessionsAffected = summary?.sessionsAffected || 0;

  const stopCount = actionsByType.find((row) => row.actionType === "STOP")?.count || 0;

  const typePieData = actionsByType.map((row) => ({
    name: row.actionType,
    value: row.count,
  }));

  return (
    <div className="page">
      <AnalyticsFilters filters={filters} onChange={setFilters} onApply={load} loading={loading} />
      {error && <div className="alert">{error}</div>}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Unique Players</div>
          <div className="stat-value">{formatNumber(uniquePlayers)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Sessions Affected</div>
          <div className="stat-value">{formatNumber(sessionsAffected)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">STOP Actions</div>
          <div className="stat-value">{formatNumber(stopCount)}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Actions Over Time</h3>
          </div>
          {actionsOverTime.length ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={actionsOverTime}>
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
                  <Line type="monotone" dataKey="nudge" name="Nudge" stroke="#27d9ff" strokeWidth={2} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="cooldown"
                    name="Cooldown"
                    stroke="#f6c453"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line type="monotone" dataKey="stop" name="Stop" stroke="#ff304f" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No actions recorded in this range.</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Actions by Type</h3>
          </div>
          {typePieData.length ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typePieData} dataKey="value" nameKey="name" outerRadius={90}>
                    {typePieData.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatNumber(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No action types yet.</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Top Reasons</h3>
        </div>
        {actionsByReason.length ? (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={actionsByReason} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" stroke="rgba(202,210,224,0.6)" />
                <YAxis dataKey="reasonCode" type="category" width={140} stroke="rgba(202,210,224,0.6)" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatNumber(value)} />
                <Bar dataKey="count" name="Count" fill="#27d9ff" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty">No action reasons to show.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Recent Actions</h3>
        </div>
        {actions.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Reasons</th>
                  <th>Severity</th>
                  <th>Session</th>
                  <th>Player</th>
                  <th>Game</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <tr key={action.id}>
                    <td>{formatDateTime(action.createdAt)}</td>
                    <td>{action.actionType}</td>
                    <td>{Array.isArray(action.reasonCodes) ? action.reasonCodes.join(", ") : "—"}</td>
                    <td>
                      <span className={severityTag(action.severity)}>
                        S{action.severity}
                      </span>
                    </td>
                    <td>{maskId(action.sessionId)}</td>
                    <td>{maskId(action.playerId)}</td>
                    <td>{action.gameKey || "—"}</td>
                    <td>
                      <details>
                        <summary className="stat-label">View</summary>
                        <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
                          {JSON.stringify(action.details, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No recent actions.</div>
        )}
      </div>
    </div>
  );
}
