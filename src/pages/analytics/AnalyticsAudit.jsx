import React, { useState } from "react";
import { runAnalyticsAudit } from "../../api/analyticsApi";
import AnalyticsFilters from "../../components/AnalyticsFilters.jsx";

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

function severityTag(severity) {
  if (severity >= 4) return "tag tag-red";
  if (severity === 3) return "tag tag-blue";
  return "tag";
}

export default function AnalyticsAudit() {
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [findings, setFindings] = useState([]);

  async function runAudit() {
    setLoading(true);
    setError("");
    try {
      const res = await runAnalyticsAudit(filters);
      if (!res.ok) {
        setError(res.error || "Failed to run audit");
      } else {
        setFindings(res.findings || []);
      }
    } catch (err) {
      setError(err.message || "Failed to run audit");
    } finally {
      setLoading(false);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(findings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit-findings.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <AnalyticsFilters filters={filters} onChange={setFilters} onApply={runAudit} loading={loading} />
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Self-Auditing System</h3>
            <p className="panel-subtitle">Run the audit to surface latent risk patterns.</p>
          </div>
          <div className="panel-actions">
            <button className="btn btn-primary" type="button" onClick={runAudit} disabled={loading}>
              {loading ? "Running..." : "Run Audit"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={exportJson} disabled={!findings.length}>
              Export JSON
            </button>
          </div>
        </div>
        {findings.length ? (
          <div className="stack">
            {findings.map((finding, index) => (
              <div key={`${finding.title}-${index}`} className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">{finding.title}</div>
                    <p className="panel-subtitle">{finding.detail}</p>
                  </div>
                  <span className={severityTag(finding.severity)}>
                    Severity {finding.severity}
                  </span>
                </div>
                <div className="stat-meta">Category: {finding.category}</div>
                <details style={{ marginTop: 8 }}>
                  <summary className="stat-label">Evidence</summary>
                  <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
                    {JSON.stringify(finding.evidenceJson, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No findings yet. Run the audit to generate results.</div>
        )}
      </div>
    </div>
  );
}
