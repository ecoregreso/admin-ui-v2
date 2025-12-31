import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import AnalyticsFilters from "../../components/AnalyticsFilters.jsx";
import InfoTooltip from "../../components/InfoTooltip.jsx";
import { fetchAnalyticsLtv } from "../../api/analyticsApi";
import { formatNumber, formatPercent } from "../../utils/analyticsFormat";

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
  from.setDate(today.getDate() - 89);
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    bucket: "day",
    timezone: "America/Los_Angeles",
  };
}

export default function AnalyticsLtv() {
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
      const res = await fetchAnalyticsLtv(nextFilters || filtersRef.current);
      if (!res.ok) {
        setError(res.error || "Failed to load LTV analytics");
      } else {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load LTV analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const segments = data?.segments ?? EMPTY_ARRAY;
  const whale = data?.whale || {};
  const segmentData = segments.map((row) => ({ name: row.label, value: row.count }));

  const whaleRows = [
    { label: "Top 1%", value: whale.top1Pct },
    { label: "Top 5%", value: whale.top5Pct },
    { label: "Top 10%", value: whale.top10Pct },
  ];

  const colors = ["#27d9ff", "#31f58d", "#f6c453", "#ff304f", "#b280ff"];

  return (
    <div className="page">
      <AnalyticsFilters filters={filters} onChange={setFilters} onApply={load} loading={loading} />
      {error && <div className="alert">{error}</div>}

      <div className="grid-2">
        <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">Player LTV Segmentation</h3>
            <InfoTooltip
              title="LTV Segmentation"
              content="Operator LTV bands based on bets minus wins. Shows how value concentrates across player bands."
            />
          </div>
        </div>
          {segmentData.length ? (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={segmentData} dataKey="value" nameKey="name" outerRadius={90}>
                    {segmentData.map((entry, index) => (
                      <Cell key={entry.name} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatNumber(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No LTV segment data.</div>
          )}
        </div>

        <div className="panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <h3 className="panel-title">Whale Dependency</h3>
            <InfoTooltip
              title="Whale Dependency"
              content="Share of NGR contributed by top 1%, 5%, and 10% of players. High dependency increases revenue risk."
            />
          </div>
        </div>
          {whaleRows.length ? (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={whaleRows} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    type="number"
                    stroke="rgba(202,210,224,0.6)"
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  />
                  <YAxis dataKey="label" type="category" width={90} stroke="rgba(202,210,224,0.6)" />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => formatPercent(value)}
                  />
                  <Bar dataKey="value" fill="#27d9ff" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No whale data.</div>
          )}
        </div>
      </div>
    </div>
  );
}
