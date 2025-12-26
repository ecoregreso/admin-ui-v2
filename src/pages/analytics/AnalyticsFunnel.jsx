import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import AnalyticsFilters from "../../components/AnalyticsFilters.jsx";
import { fetchAnalyticsFunnel } from "../../api/analyticsApi";
import { formatNumber } from "../../utils/analyticsFormat";

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

export default function AnalyticsFunnel() {
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
      const res = await fetchAnalyticsFunnel(nextFilters || filtersRef.current);
      if (!res.ok) {
        setError(res.error || "Failed to load funnel");
      } else {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load funnel");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const funnel = data?.funnel ?? EMPTY_ARRAY;
  const returnStep = funnel.find((step) => step.step.includes("Return"));
  const returnRate = funnel.length
    ? (returnStep ? returnStep.count : 0) / (funnel[0].count || 1)
    : 0;

  return (
    <div className="page">
      <AnalyticsFilters filters={filters} onChange={setFilters} onApply={load} loading={loading} />
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Behavioral Funnel</h3>
            <p className="panel-subtitle">
              Return rate within 7 days: {(returnRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        {funnel.length ? (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" stroke="rgba(202,210,224,0.6)" />
                <YAxis dataKey="step" type="category" width={150} stroke="rgba(202,210,224,0.6)" />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => formatNumber(value)}
                />
                <Bar dataKey="count" fill="#27d9ff" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty">No funnel data available.</div>
        )}
      </div>
    </div>
  );
}
