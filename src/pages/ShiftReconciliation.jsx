import React, { useCallback, useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import { fetchShiftSummary, closeShift } from "../api/shiftsApi";
import InfoTooltip from "../components/InfoTooltip";

const today = () => dayjs().format("YYYY-MM-DD");

function formatMoney(value) {
  const num = Number(value || 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ShiftReconciliation() {
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({ summaries: [], staff: {}, closures: [] });
  const [form, setForm] = useState({ staffId: "", actualBalance: "", notes: "", checklist: {} });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchShiftSummary(date);
      const data = payload?.data || payload;
      setSummary(data || { summaries: [], staff: {}, closures: [] });
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const closuresByStaff = useMemo(() => {
    const map = new Map();
    (summary.closures || []).forEach((c) => {
      map.set(c.staffId, c);
    });
    return map;
  }, [summary]);

  const handleCloseShift = async () => {
    if (!form.staffId) {
      setError("Select a cashier to close");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const target = summary.summaries.find((s) => s.staffId === form.staffId);
    try {
      await closeShift({
        staffId: form.staffId,
        startAt: summary.start,
        endAt: summary.end,
        checklist: form.checklist,
        notes: form.notes,
        expectedBalance: target?.expectedBalance ?? null,
        actualBalance: form.actualBalance || null,
        summary: target || null,
      });
      setMessage("Shift closed and saved");
      setForm({ staffId: form.staffId, actualBalance: "", notes: "", checklist: {} });
      fetchSummary();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Failed to close shift");
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (row) => {
    const staffMeta = summary.staff[row.staffId] || {};
    const closure = closuresByStaff.get(row.staffId);
    return (
      <tr key={row.staffId}>
        <td>{staffMeta.username || row.staffId}</td>
        <td>{row.vouchers.createdCount} / {formatMoney(row.vouchers.createdAmount)}</td>
        <td>{row.vouchers.redeemedCount} / {formatMoney(row.vouchers.redeemedAmount)}</td>
        <td>{row.vouchers.cashedOutCount} / {formatMoney(row.vouchers.cashedOutAmount)}</td>
        <td>{row.vouchers.openCount} / {formatMoney(row.vouchers.openAmount)}</td>
        <td>{formatMoney(row.expectedBalance)}</td>
        <td>{closure ? dayjs(closure.closedAt || closure.closed_at).format("HH:mm") : "Open"}</td>
      </tr>
    );
  };

  return (
    <div className="page">
      <div className="panel-header">
        <div className="panel-title-row">
          <h2 className="panel-title">Shift Summary & Reconciliation</h2>
          <InfoTooltip title="Shift Reconciliation" content="Daily voucher movement per cashier with end-of-shift checklist." />
        </div>
        <div className="panel-subtitle">Per-tenant cashier activity for the selected day.</div>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ fontWeight: 600 }}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn btn-primary" onClick={fetchSummary} disabled={loading}>
            {loading ? "Loading..." : "Generate Report"}
          </button>
          {message && <span className="text-success" style={{ marginLeft: 8 }}>{message}</span>}
          {error && <span className="text-danger" style={{ marginLeft: 8 }}>{error}</span>}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="panel-title">Activity</h3>
            <div className="panel-subtitle">Created / Redeemed / Cashed out / Open</div>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Cashier</th>
                  <th>Created (count / FC)</th>
                  <th>Redeemed (count / FC)</th>
                  <th>Cashed Out (count / FC)</th>
                  <th>Open (count / FC)</th>
                  <th>Expected End Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.summaries && summary.summaries.length ? summary.summaries.map(renderRow) : (
                  <tr><td colSpan={7}>No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="panel-title">Close Shift</h3>
            <div className="panel-subtitle">Confirm expected vs actual and mark checklist complete.</div>
          </div>
          <div className="form-grid">
            <label>Cashier</label>
            <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
              <option value="">Select cashier</option>
              {(summary.summaries || []).map((row) => {
                const meta = summary.staff[row.staffId] || {};
                return (
                  <option key={row.staffId} value={row.staffId}>
                    {meta.username || row.staffId}
                  </option>
                );
              })}
            </select>

            <label>Actual End Balance (FC)</label>
            <input
              type="number"
              step="0.01"
              value={form.actualBalance}
              onChange={(e) => setForm({ ...form, actualBalance: e.target.value })}
              placeholder="Counted cash + vouchers"
            />

            <label>Checklist</label>
            <div className="inline" style={{ gap: 12 }}>
              <label><input type="checkbox" checked={!!form.checklist.vouchers} onChange={(e) => setForm({ ...form, checklist: { ...form.checklist, vouchers: e.target.checked } })} /> Vouchers reconciled</label>
              <label><input type="checkbox" checked={!!form.checklist.cash} onChange={(e) => setForm({ ...form, checklist: { ...form.checklist, cash: e.target.checked } })} /> Cash counted</label>
              <label><input type="checkbox" checked={!!form.checklist.discrepancies} onChange={(e) => setForm({ ...form, checklist: { ...form.checklist, discrepancies: e.target.checked } })} /> Discrepancies noted</label>
            </div>

            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add any discrepancy details or approvals" />

            <div className="inline" style={{ marginTop: 8, gap: 12 }}>
              <button className="btn btn-primary" onClick={handleCloseShift} disabled={saving}>
                {saving ? "Saving..." : "Mark Shift Closed"}
              </button>
              {form.staffId && (
                <div className="panel-subtitle">
                  Expected: {formatMoney((summary.summaries.find((s) => s.staffId === form.staffId) || {}).expectedBalance || 0)} FC
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
