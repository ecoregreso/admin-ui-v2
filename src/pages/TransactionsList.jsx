import React, { useEffect, useMemo, useState } from "react";
import { listTransactions } from "../api/transactionsApi";

function fmtNumber(n) {
  if (n == null) return "0";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

export default function TransactionsList() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userId, setUserId] = useState("");
  const [limit, setLimit] = useState("100");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listTransactions({
        type,
        from,
        to,
        userId,
        limit,
      });
      if (data.ok) {
        setTransactions(data.transactions || []);
      } else {
        setError(data.error || "Failed to load transactions");
      }
    } catch (err) {
      console.error("[Transactions] load error:", err);
      setError("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalAmount = useMemo(
    () => transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [transactions]
  );

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Transactions</h2>
            <p className="panel-subtitle">Ledger view for credits, debits, and game activity.</p>
          </div>
          <div className="panel-actions">
            <button className="btn btn-primary" onClick={load} disabled={loading}>
              {loading ? "Loading..." : "Run Query"}
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="select">
              <option value="">All</option>
              <option value="credit">credit</option>
              <option value="debit">debit</option>
              <option value="voucher_credit">voucher_credit</option>
              <option value="voucher_debit">voucher_debit</option>
              <option value="game_bet">game_bet</option>
              <option value="game_win">game_win</option>
              <option value="manual_adjustment">manual_adjustment</option>
            </select>
          </div>
          <div className="field">
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
          </div>
          <div className="field">
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </div>
          <div className="field">
            <label>User ID</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} className="input" />
          </div>
          <div className="field">
            <label>Limit</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {error && <div className="alert">{error}</div>}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Results</h3>
            <p className="panel-subtitle">Total amount: ${fmtNumber(totalAmount)}</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>User</th>
                <th>Ref</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.type}</td>
                  <td>${fmtNumber(t.amount)}</td>
                  <td>${fmtNumber(t.balanceAfter)}</td>
                  <td>{t.wallet?.userId ? String(t.wallet.userId).slice(0, 10) : "-"}</td>
                  <td>{t.reference || "-"}</td>
                  <td>{fmtDate(t.createdAt)}</td>
                </tr>
              ))}
              {!transactions.length && !loading && (
                <tr>
                  <td colSpan={6} className="empty">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
