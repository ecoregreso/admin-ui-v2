import React, { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";
import { fetchJackpotsSummary } from "../../api/analyticsApi";
import { formatNumber } from "../../utils/analyticsFormat";
import InfoTooltip from "../../components/InfoTooltip.jsx";

const TOOLTIP_STYLE = {
  background: "rgba(8, 10, 14, 0.92)",
  border: "1px solid rgba(39, 217, 255, 0.35)",
  borderRadius: 12,
  color: "#f4f6fa",
};

function centsToFun(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function titleForType(type) {
  if (type === "hourly") return "Hourly Progressive";
  if (type === "daily") return "Daily Progressive";
  if (type === "weekly") return "Weekly Mega";
  return type;
}

function JackpotCard({ jp }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{titleForType(jp.type)}{jp.tenantId ? " (Tenant)" : " (Global)"}</div>
      <div className="stat-value">{centsToFun(jp.currentPotCents)} FC</div>
      <div className="stat-subtext">
        Trigger: {centsToFun(jp.triggerCents)} FC · Range {centsToFun(jp.rangeMinCents)} - {centsToFun(jp.rangeMaxCents)} FC
      </div>
      <div className="stat-subtext">
        Last hit: {jp.lastHitAt ? new Date(jp.lastHitAt).toLocaleString() : "—"}
      </div>
      {jp.nextDrawAt && (
        <div className="stat-subtext">Next draw: {new Date(jp.nextDrawAt).toLocaleString()}</div>
      )}
    </div>
  );
}

export default function Jackpots() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchJackpotsSummary();
        if (!res.ok) {
          setError(res.error || "Failed to load jackpots");
        } else {
          setData(res.data);
        }
      } catch (err) {
        setError(err.message || "Failed to load jackpots");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const jackpots = data?.jackpots || [];
  const events = data?.events || [];
  const contrib = data?.contributions || [];

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

      <div className="stat-grid">
        {jackpots.map((jp) => (
          <JackpotCard key={jp.id} jp={jp} />
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
                  <div>{centsToFun(e.amountCents)} FC</div>
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
