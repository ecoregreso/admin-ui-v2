import React, { useEffect, useMemo, useState } from "react";
import InfoTooltip from "../components/InfoTooltip.jsx";
import { runSecurityProbes, fetchSecurityStatus } from "../api/securityApi.js";

const DEFAULT_SCENARIOS = ["sql_injection", "xss_payload", "dir_traversal", "user_agent_switch", "double_login"];

function randomFingerprint() {
  return `fp-${Math.random().toString(16).slice(2, 10)}-${Date.now().toString(16).slice(-6)}`;
}

function ScenarioToggle({ label, value, checked, onChange }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(value, e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function ResultBadge({ status }) {
  const palette = {
    ok: "tag-blue",
    warn: "tag-red",
    info: "",
  };
  const label = status === "ok" ? "Pass" : status === "warn" ? "Alert" : "Info";
  return <span className={`tag ${palette[status] || ""}`}>{label}</span>;
}

export default function SecurityLab() {
  const [selected, setSelected] = useState(new Set(DEFAULT_SCENARIOS));
  const [fingerprint, setFingerprint] = useState(() => randomFingerprint());
  const [overrideUa, setOverrideUa] = useState("");
  const [results, setResults] = useState([]);
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedList = useMemo(() => Array.from(selected), [selected]);

  function toggleScenario(value, isOn) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isOn) next.add(value);
      else next.delete(value);
      return next;
    });
  }

  async function loadStatus() {
    try {
      const res = await fetchSecurityStatus();
      if (res?.ok === false) {
        setError(res.error || "Failed to load security status");
        return;
      }
      const payload = res?.data || res;
      setEvents(payload?.events || []);
      setSession(payload?.session || null);
    } catch (err) {
      setError(err.message || "Failed to load security status");
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleRun(probes = selectedList, fp = fingerprint, ua = overrideUa) {
    if (!probes.length) {
      setError("Select at least one probe.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const headers = {};
      if (ua) headers["x-simulated-user-agent"] = ua;
      const res = await runSecurityProbes(
        {
          scenarios: probes,
          fingerprint: fp,
          userAgent: ua || undefined,
        },
        headers
      );
      if (res?.ok === false) {
        setError(res.error || "Probe run failed");
      } else {
        const payload = res?.data || res;
        setResults(payload?.probes || []);
        setSession(payload?.session || null);
        setSuccess("Probes executed");
      }
      await loadStatus();
    } catch (err) {
      setError(err.message || "Probe run failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDoubleLogin() {
    const alt = `${fingerprint}-alt`;
    await handleRun(["double_login", "user_agent_switch"], alt, overrideUa || `PTU-UA-${Math.random().toString(16).slice(-4)}`);
  }

  async function handleUserAgentSwitch() {
    const rotatedUa = `PTU-UA-${Math.random().toString(16).slice(2, 8)}`;
    setOverrideUa(rotatedUa);
    await handleRun(["user_agent_switch"], fingerprint, rotatedUa);
  }

  return (
    <div className="page">
      <div className="panel-header">
        <div className="panel-title-row">
          <h2 className="panel-title">Security Lab</h2>
          <InfoTooltip
            title="Controlled Security Probes"
            content="Simulate hostile inputs (SQLi, XSS, path traversal) and session tampering (user-agent switch, double login) against the admin API. Results are logged server-side for audit."
          />
        </div>
        <div className="panel-subtitle">
          Uses in-memory telemetry; results reset on restart. For production hardening, keep WAF/IDS in front of API and monitor logs.
        </div>
        {error && <div className="alert">{error}</div>}
        {success && <span className="tag tag-blue">{success}</span>}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <h3 className="panel-title">Simulate Attacks</h3>
              <InfoTooltip title="Pentest shortcuts" content="Send hostile payloads to backend probes. Does not hit production data." />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Fingerprint</label>
              <input
                className="input"
                value={fingerprint}
                onChange={(e) => setFingerprint(e.target.value)}
                placeholder="Session fingerprint token"
              />
              <div className="inline">
                <button className="btn" type="button" onClick={() => setFingerprint(randomFingerprint())}>
                  Rotate Fingerprint
                </button>
                <button className="btn" type="button" onClick={handleDoubleLogin}>
                  Simulate Double Login
                </button>
              </div>
            </div>

            <div className="field">
              <label>Override User Agent</label>
              <input
                className="input"
                value={overrideUa}
                onChange={(e) => setOverrideUa(e.target.value)}
                placeholder="Custom UA sent with probes"
              />
              <div className="inline">
                <button className="btn" type="button" onClick={handleUserAgentSwitch}>
                  Simulate UA Switch
                </button>
                <button className="btn" type="button" onClick={() => setOverrideUa("")}>
                  Reset UA
                </button>
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="inline" style={{ flexWrap: "wrap", gap: 12 }}>
              <ScenarioToggle label="SQL Injection" value="sql_injection" checked={selected.has("sql_injection")} onChange={toggleScenario} />
              <ScenarioToggle label="XSS Payload" value="xss_payload" checked={selected.has("xss_payload")} onChange={toggleScenario} />
              <ScenarioToggle
                label="Directory Traversal"
                value="dir_traversal"
                checked={selected.has("dir_traversal")}
                onChange={toggleScenario}
              />
              <ScenarioToggle
                label="User-Agent Switch"
                value="user_agent_switch"
                checked={selected.has("user_agent_switch")}
                onChange={toggleScenario}
              />
              <ScenarioToggle label="Double Login" value="double_login" checked={selected.has("double_login")} onChange={toggleScenario} />
            </div>

            <button className="btn" type="button" onClick={() => handleRun()} disabled={loading}>
              {loading ? "Running…" : "Run Probes"}
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <h3 className="panel-title">Probe Results</h3>
              <InfoTooltip title="Live results" content="Pass = mitigated. Alert = needs review or multiple concurrent sessions detected." />
            </div>
          </div>
          {results.length ? (
            <div className="table">
              <div className="table-head">
                <div>Scenario</div>
                <div>Status</div>
                <div>Detail</div>
              </div>
              {results.map((r) => (
                <div className="table-row" key={r.name}>
                  <div>{r.name}</div>
                  <div>
                    <ResultBadge status={r.status} />
                  </div>
                  <div>{r.detail}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No probe results yet.</div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <h3 className="panel-title">Session Fingerprints</h3>
              <InfoTooltip title="Concurrency watchdog" content="Backend tracks fingerprints per staff token to flag concurrent logins or UA shifts." />
            </div>
          </div>
          {session?.fingerprints?.length ? (
            <div className="table">
              <div className="table-head">
                <div>Fingerprint</div>
                <div>User Agent</div>
                <div>Last Seen</div>
              </div>
              {session.fingerprints.map((fp) => (
                <div className="table-row" key={fp.fingerprint}>
                  <div>{fp.fingerprint}</div>
                  <div>{fp.userAgent}</div>
                  <div>{new Date(fp.lastSeen).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No fingerprint telemetry yet.</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <h3 className="panel-title">Security Events</h3>
              <InfoTooltip title="Security audit trail" content="Last 50 probe events and detections stored in-memory." />
            </div>
          </div>
          {events.length ? (
            <div className="table">
              <div className="table-head">
                <div>Type</div>
                <div>Severity</div>
                <div>When</div>
              </div>
              {events.map((e) => (
                <div className="table-row" key={e.id}>
                  <div>{e.type}</div>
                  <div>{e.severity}</div>
                  <div>{new Date(e.ts).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No events yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
