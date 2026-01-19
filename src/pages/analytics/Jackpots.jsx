import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { fetchJackpotsSummary, triggerJackpot, updateJackpotTarget } from "../../api/analyticsApi";
import { formatNumber } from "../../utils/analyticsFormat";
import InfoTooltip from "../../components/InfoTooltip.jsx";
import { useStaffAuth } from "../../context/StaffAuthContext.jsx";

const TOOLTIP_STYLE = {
  background: "rgba(8, 10, 14, 0.92)",
  border: "1px solid rgba(39, 217, 255, 0.35)",
  borderRadius: 12,
  color: "#f4f6fa",
};

const POT_COLOR = "#27d9ff";
const PAYOUT_COLOR = "#ff304f";

function centsToFunNumber(cents) {
  return Number(cents || 0) / 100;
}

function formatFun(cents) {
  return centsToFunNumber(cents).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDuration(ms) {
  if (ms == null) return "—";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length) return "<1m";
  return parts.join(" ");
}

function formatHoursToTrigger(value) {
  if (value == null) return "—";
  if (value < 1) return "<1h";
  const days = Math.floor(value / 24);
  const hours = Math.round(value % 24);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  return parts.join(" ");
}

function titleForType(type) {
  if (type === "hourly") return "Hourly Progressive";
  if (type === "daily") return "Daily Progressive";
  if (type === "weekly") return "Weekly Mega";
  return type;
}

function ProgressBar({ value }) {
  const pct = Math.min(100, Math.max(0, Number(value || 0) * 100));
  return (
    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, height: 10, overflow: "hidden", marginTop: 6 }}>
      <div
        style={{
          width: `${pct.toFixed(1)}%`,
          height: "100%",
          background: "linear-gradient(90deg, #27d9ff, #ff304f)",
        }}
      />
    </div>
  );
}

function JackpotCard({ jp, form, onChangeField, onSaveTarget, onTrigger, canManage }) {
  const metrics = jp.metrics || {};
  const growth = metrics.growth || {};
  const progressRaw = metrics.progressToTrigger ?? (jp.triggerCents ? jp.currentPotCents / jp.triggerCents : 0);
  const progress = Number.isFinite(progressRaw) ? progressRaw : 0;
  const lastHitAt = metrics.lastHitAt || jp.lastHitAt;
  const contributionBps = metrics.contributionBps ?? jp.contributionBps ?? 0;
  const chartData = (metrics.chart || []).map((row) => ({
    day: row.day,
    potFun: centsToFunNumber(row.potCents),
    contributionsFun: centsToFunNumber(row.contributionsCents),
    payoutsFun: centsToFunNumber(row.payoutsCents),
  }));
  const action = form || {};

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <h3 className="panel-title">
            {titleForType(jp.type)}
            {jp.tenantId ? " (Tenant)" : " (Global)"}
          </h3>
          <span className="tag tag-blue">Target {formatFun(metrics.triggerCents ?? jp.triggerCents)} FC</span>
        </div>
        <div className="panel-subtitle">
          Pot {formatFun(metrics.currentPotCents ?? jp.currentPotCents)} FC • Range {formatFun(metrics.rangeMinCents ?? jp.rangeMinCents)} -{" "}
          {formatFun(metrics.rangeMaxCents ?? jp.rangeMaxCents)} FC
          {jp.nextDrawAt ? ` • Next draw ${new Date(jp.nextDrawAt).toLocaleString()}` : ""}
        </div>
      </div>

      <div className="grid-2">
        <div className="stack">
          <div>
            <div className="stat-subtext">Progress to trigger ({(progress * 100).toFixed(1)}%)</div>
            <ProgressBar value={progress} />
            <div className="stat-subtext">
              Projected to hit in: {formatHoursToTrigger(metrics.projectedHoursToTrigger)} · Contribution rate: {contributionBps} bps
            </div>
          </div>

          <div className="stat-subtext">
            Last hit: {lastHitAt ? new Date(lastHitAt).toLocaleString() : "—"} · Elapsed: {formatDuration(metrics.timeSinceLastHitMs)}{" "}
            {metrics.lastHitAmountCents ? `· Paid ${formatFun(metrics.lastHitAmountCents)} FC` : ""}
          </div>

          <div className="inline">
            <span className="tag">24h in: {formatFun(growth.last24hContributionCents)} FC ({formatFun(growth.avgHourlyLast24h)} FC/hr)</span>
            <span className="tag">7d in: {formatFun(growth.last7dContributionCents)} FC ({formatFun(growth.avgDailyLast7d)} FC/day)</span>
          </div>

          {canManage && (
            <div className="stack">
              <div className="form-grid">
                <div className="field">
                  <label>Target (FUN)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={action.target ?? ""}
                    onChange={(e) => onChangeField(jp.id, "target", e.target.value)}
                    placeholder="e.g. 250.00"
                  />
                </div>
                <div className="field">
                  <label>Manual payout (FUN, optional)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={action.payout ?? ""}
                    onChange={(e) => onChangeField(jp.id, "payout", e.target.value)}
                    placeholder="leave blank to use trigger"
                  />
                </div>
              </div>
              <div className="inline">
                <button className="btn" onClick={() => onSaveTarget(jp.id)} disabled={action.saving}>
                  {action.saving ? "Saving…" : "Save target"}
                </button>
                <button className="btn" onClick={() => onTrigger(jp.id)} disabled={action.triggering}>
                  {action.triggering ? "Triggering…" : "Trigger win"}
                </button>
                {action.success && <span className="tag tag-blue">{action.success}</span>}
              </div>
              {action.error && <div className="alert">{action.error}</div>}
            </div>
          )}
        </div>

        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`potGradient-${jp.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={POT_COLOR} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={POT_COLOR} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="day" stroke="rgba(202,210,224,0.6)" />
              <YAxis stroke="rgba(202,210,224,0.6)" />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, name) => {
                  if (name === "potFun") return [`${formatNumber(value)} FC`, "Pot"];
                  if (name === "payoutsFun") return [`${formatNumber(value)} FC`, "Payouts"];
                  return [`${formatNumber(value)} FC`, "Contributions"];
                }}
                labelFormatter={(value) => value}
              />
              <Legend />
              <Area type="monotone" dataKey="potFun" name="Pot" stroke={POT_COLOR} fillOpacity={1} fill={`url(#potGradient-${jp.id})`} />
              <Line type="monotone" dataKey="payoutsFun" name="Payouts" stroke={PAYOUT_COLOR} dot={false} />
              <Line type="monotone" dataKey="contributionsFun" name="Contrib" stroke="#f6c453" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function Jackpots() {
  const { staff } = useStaffAuth();
  const canManage = (staff?.permissions || []).includes("finance:write");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionState, setActionState] = useState({});

  const jackpots = data?.jackpots || [];
  const events = data?.events || [];
  const contrib = data?.contributions || [];

  const syncFormState = (nextJackpots) => {
    setActionState((prev) => {
      const next = { ...prev };
      nextJackpots.forEach((jp) => {
        const defaultTarget = centsToFunNumber((jp.metrics?.triggerCents ?? jp.triggerCents) || 0).toFixed(2);
        const prevState = prev[jp.id] || {};
        next[jp.id] = {
          ...prevState,
          target: defaultTarget,
          payout: prevState.payout || "",
          saving: false,
          triggering: false,
        };
      });
      return next;
    });
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchJackpotsSummary();
      if (res?.ok === false) {
        setError(res.error || "Failed to load jackpots");
      } else {
        const payload = res?.data || res;
        setData(payload);
        if (payload?.jackpots) syncFormState(payload.jackpots);
      }
    } catch (err) {
      setError(err.message || "Failed to load jackpots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFieldChange = (id, field, value) => {
    setActionState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value, error: "", success: "" },
    }));
  };

  const handleSaveTarget = async (id) => {
    const form = actionState[id] || {};
    const targetFun = parseFloat(form.target);
    if (!Number.isFinite(targetFun) || targetFun <= 0) {
      setActionState((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), error: "Enter a target > 0", success: "" },
      }));
      return;
    }
    setActionState((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), saving: true, error: "", success: "" } }));
    try {
      await updateJackpotTarget(id, { triggerCents: Math.round(targetFun * 100) });
      setActionState((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), saving: false, success: "Target updated" },
      }));
      await load();
    } catch (err) {
      setActionState((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), saving: false, error: err.message || "Failed to update target" },
      }));
    }
  };

  const handleTrigger = async (id) => {
    const form = actionState[id] || {};
    const payload = {};
    if (form.payout && form.payout !== "") {
      const payoutFun = parseFloat(form.payout);
      if (!Number.isFinite(payoutFun) || payoutFun <= 0) {
        setActionState((prev) => ({
          ...prev,
          [id]: { ...(prev[id] || {}), error: "Enter a payout > 0 or leave blank", success: "" },
        }));
        return;
      }
      payload.payoutCents = Math.round(payoutFun * 100);
    }

    setActionState((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), triggering: true, error: "", success: "" } }));
    try {
      await triggerJackpot(id, { ...payload, triggeredBy: "admin-ui" });
      setActionState((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), triggering: false, success: "Triggered" },
      }));
      await load();
    } catch (err) {
      setActionState((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), triggering: false, error: err.message || "Failed to trigger" },
      }));
    }
  };

  const labelForJackpot = (jp) => `${titleForType(jp.type)}${jp.tenantId ? " (Tenant)" : " (Global)"}`;
  const labelsById = jackpots.reduce((acc, jp) => {
    acc[jp.id] = labelForJackpot(jp);
    return acc;
  }, {});

  const dayMap = new Map();
  contrib.forEach((row) => {
    const day = row.day;
    const label = labelsById[row.jackpotId] || row.jackpotId;
    if (!dayMap.has(day)) dayMap.set(day, { day });
    dayMap.get(day)[label] = (Number(row.amountCents || 0) / 100).toFixed(2);
  });
  const contribSeries = Array.from(dayMap.values()).sort((a, b) => (a.day < b.day ? -1 : 1));
  const contribLabels = Array.from(new Set(Object.values(labelsById)));

  return (
    <div className="page">
      <div className="panel-header">
        <div className="panel-title-row">
          <h2 className="panel-title">Jackpots</h2>
          <InfoTooltip
            title="Progressive Jackpots"
            content="Hourly and daily pots are per-tenant; weekly mega is global across tenants. Trigger amounts random within configured ranges."
          />
        </div>
        {loading && <div className="panel-subtitle">Loading...</div>}
        {error && <div className="alert">{error}</div>}
      </div>

      <div className="stack">
        {jackpots.map((jp) => (
          <JackpotCard
            key={jp.id}
            jp={jp}
            form={actionState[jp.id]}
            onChangeField={handleFieldChange}
            onSaveTarget={handleSaveTarget}
            onTrigger={handleTrigger}
            canManage={canManage}
          />
        ))}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <h3 className="panel-title">Recent Hits</h3>
              <InfoTooltip title="Jackpot Payouts" content="Last 50 jackpot hits across scopes." />
            </div>
          </div>
          {events.length ? (
            <div className="table">
              <div className="table-head">
                <div>Type</div>
                <div>Tenant</div>
                <div>Amount</div>
                <div>When</div>
              </div>
              {events.map((e) => (
                <div className="table-row" key={e.id}>
                  <div>{titleForType(jackpots.find((j) => j.id === e.jackpotId)?.type)}</div>
                  <div>{e.tenantId || "Global"}</div>
                  <div>{formatFun(e.amountCents)} FC</div>
                  <div>{new Date(e.created_at || e.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No jackpot hits yet.</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <h3 className="panel-title">Contributions (last 14d)</h3>
              <InfoTooltip title="Jackpot Funding" content="Daily contributions into each progressive pot." />
            </div>
          </div>
          {contribSeries.length ? (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contribSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="day" stroke="rgba(202,210,224,0.6)" />
                  <YAxis stroke="rgba(202,210,224,0.6)" />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => `${formatNumber(value)} FC`}
                    labelFormatter={(value) => value}
                  />
                  <Legend />
                  {contribLabels.map((label, idx) => (
                    <Line
                      key={label}
                      type="monotone"
                      dataKey={label}
                      stroke={["#27d9ff", "#f6c453", "#ff304f", "#4fd1ff", "#9f7aea"][idx % 5]}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No contribution data yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
