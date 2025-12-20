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
} from "recharts";
import { fetchRangeReport } from "../api/reportsApi";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    setLoading(true);

    try {
      const data = await fetchRangeReport({ from, to });
      if (!data.ok) {
        throw new Error(data.error || "Unknown error");
      }
      setReport(data);
    } catch (err) {
      console.error("[ReportsDashboard] error:", err);
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => {
    if (!report) return [];
    const s = report.summary || {};
    return [
      { name: "Voucher Amt", value: Number(s.totalVoucherAmount || 0) },
      { name: "Voucher Bonus", value: Number(s.totalVoucherBonus || 0) },
      { name: "Credits", value: Number(s.totalCredits || 0) },
      { name: "Debits", value: Number(s.totalDebits || 0) },
      { name: "Bet Amount", value: Number(s.totalBetAmount || 0) },
      { name: "Win Amount", value: Number(s.totalWinAmount || 0) },
      { name: "GGR", value: Number(s.grossGamingRevenue || 0) },
      { name: "Net Flow", value: Number(s.netCashflow || 0) },
    ];
  }, [report]);

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
                      contentStyle={{
                        background: "rgba(8, 10, 14, 0.9)",
                        border: "1px solid rgba(39, 217, 255, 0.4)",
                        borderRadius: 12,
                        color: "#f4f6fa",
                      }}
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
                      contentStyle={{
                        background: "rgba(8, 10, 14, 0.9)",
                        border: "1px solid rgba(39, 217, 255, 0.4)",
                        borderRadius: 12,
                        color: "#f4f6fa",
                      }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#ff304f" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
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
