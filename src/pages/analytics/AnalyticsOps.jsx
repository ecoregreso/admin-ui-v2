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
} from "recharts";
import AnalyticsFilters from "../../components/AnalyticsFilters.jsx";
import InfoTooltip from "../../components/InfoTooltip.jsx";
import { fetchAnalyticsOps } from "../../api/analyticsApi";
import {
  formatBucketLabel,
  formatNumber,
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

export default function AnalyticsOps() {
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
      const res = await fetchAnalyticsOps(nextFilters || filtersRef.current);
      if (!res.ok) {
        setError(res.error || "Failed to load ops analytics");
      } else {
        setData(res.data);
        setWarnings(res.warnings || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load ops analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const errorsSeries = data?.errors?.series ?? EMPTY_ARRAY;
  const topRoutes = data?.errors?.topRoutes ?? EMPTY_ARRAY;
  const staleMinutes = data?.errors?.staleMinutes || 0;
  const cashierSeries = data?.cashier?.series ?? EMPTY_ARRAY;
  const totals = data?.cashier?.totals || {};
  const resolutionCategories = data?.resolution?.categories ?? EMPTY_ARRAY;
  const resolutionScaleMax = resolutionCategories.reduce(
    (max, category) => Math.max(max, Number(category.max || 0)),
    0
  );

  return (
    <div className="page">
      <AnalyticsFilters filters={filters} onChange={setFilters} onApply={load} loading={loading} />
      {error && <div className="alert">{error}</div>}
      {warnings.map((warning) => (
        <div className="alert" key={warning}>
          {warning}
        </div>
      ))}

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title-row">
                <h3 className="panel-title">System Errors / Failed Bets</h3>
                <InfoTooltip
                  title="System Errors"
                  content="Errors and failed bets over time. Failed bets are pending rounds older than the stale threshold."
                />
              </div>
              <p className="panel-subtitle">
                Failed bets are pending rounds &gt; {staleMinutes}m.
              </p>
            </div>
          </div>
          {errorsSeries.length ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={errorsSeries}>
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
                  <Line type="monotone" dataKey="errors" stroke="#ff304f" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="failedBets" stroke="#f6c453" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No error data available.</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <h3 className="panel-title">Top Error Routes</h3>
              <InfoTooltip
                title="Top Error Routes"
                content="Endpoints producing the most errors in the selected range. Fixing these reduces ops noise fastest."
              />
            </div>
          </div>
          {topRoutes.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {topRoutes.map((row) => (
                    <tr key={row.route}>
                      <td>{row.route}</td>
                      <td>{formatNumber(row.errors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No error routes to show.</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title-row">
              <h3 className="panel-title">Cashier Performance</h3>
              <InfoTooltip
                title="Cashier Performance"
                content="Vouchers issued, redeemed, and expired per bucket. Highlights cash handling efficiency and leakage."
              />
            </div>
            <p className="panel-subtitle">
              Issued {formatNumber(totals.issued)} · Redeemed {formatNumber(totals.redeemed)} ·
              Expired {formatNumber(totals.expired)}
            </p>
          </div>
        </div>
        {cashierSeries.length ? (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashierSeries}>
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
                <Bar dataKey="issued" name="Issued" fill="#27d9ff" radius={[6, 6, 0, 0]} />
                <Bar dataKey="redeemed" name="Redeemed" fill="#31f58d" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expired" name="Expired" fill="#ff304f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty">No voucher data in this range.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Time-to-Resolution</h3>
        </div>
        {resolutionCategories.length ? (
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
        ) : (
          <div className="empty">No resolution data available.</div>
        )}
      </div>
    </div>
  );
}
