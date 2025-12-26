import React from "react";

const PRESETS = [
  { label: "Today", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function AnalyticsFilters({
  filters,
  onChange,
  onApply,
  loading,
  showAdvanced = false,
}) {
  const handlePreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    onChange({
      ...filters,
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">Filters</h3>
          <p className="panel-subtitle">Scope the analytics window and segments.</p>
        </div>
        <div className="panel-actions">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="btn btn-ghost"
              type="button"
              onClick={() => handlePreset(preset.days)}
            >
              {preset.label}
            </button>
          ))}
          <button className="btn btn-primary" type="button" onClick={onApply} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label>From</label>
          <input
            type="date"
            className="input"
            value={toDateInput(filters.from)}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
          />
        </div>
        <div className="field">
          <label>To</label>
          <input
            type="date"
            className="input"
            value={toDateInput(filters.to)}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Bucket</label>
          <select
            className="select"
            value={filters.bucket}
            onChange={(e) => onChange({ ...filters, bucket: e.target.value })}
          >
            <option value="hour">Hour</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
          </select>
        </div>
        <div className="field">
          <label>Timezone</label>
          <input
            className="input"
            value={filters.timezone}
            onChange={(e) => onChange({ ...filters, timezone: e.target.value })}
          />
        </div>
      </div>
      {showAdvanced && (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Game Key</label>
            <input
              className="input"
              value={filters.gameKey || ""}
              onChange={(e) => onChange({ ...filters, gameKey: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Agent ID</label>
            <input
              className="input"
              value={filters.agentId || ""}
              onChange={(e) => onChange({ ...filters, agentId: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Cashier ID</label>
            <input
              className="input"
              value={filters.cashierId || ""}
              onChange={(e) => onChange({ ...filters, cashierId: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Provider</label>
            <input
              className="input"
              value={filters.provider || ""}
              onChange={(e) => onChange({ ...filters, provider: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Region</label>
            <input
              className="input"
              value={filters.region || ""}
              onChange={(e) => onChange({ ...filters, region: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
