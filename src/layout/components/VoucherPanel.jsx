import { useEffect, useState } from "react";

export default function VoucherPanel({ staff }) {
  const [vouchers, setVouchers] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");

  const [createAmount, setCreateAmount] = useState("");
  const [createBonus, setCreateBonus] = useState("");
  const [createStatus, setCreateStatus] = useState("");

  const [redeemStatus, setRedeemStatus] = useState("");

  const token = localStorage.getItem("auth_token");

  // Treat 'admin' as top-level staff
  const canViewList = ["admin", "agent", "operator", "owner"].includes(
    staff.role
  );
  const canCreateRedeem = [
    "admin",
    "cashier",
    "agent",
    "operator",
    "owner",
  ].includes(staff.role);

  async function fetchVouchers() {
    if (!canViewList) return;
    if (!token) return;

    setLoadingList(true);
    setListError("");

    try {
      const res = await fetch(`/vouchers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 403) {
        setListError("Insufficient role to view voucher list.");
        setLoadingList(false);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setListError(data.error || `Failed to load vouchers (${res.status})`);
        setLoadingList(false);
        return;
      }

      // Backend returns an array
      setVouchers(Array.isArray(data) ? data : []);
      setLoadingList(false);
    } catch (err) {
      console.error("[VoucherPanel] fetch error:", err);
      setListError("Network error while loading vouchers.");
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff.role]);

  async function handleCreateVoucher(e) {
    e.preventDefault();
    if (!canCreateRedeem) return;
    if (!token) return;

    setCreateStatus("");

    const amount = parseFloat(createAmount);
    const bonus = createBonus === "" ? 0 : parseFloat(createBonus);

    if (!Number.isFinite(amount) || amount <= 0) {
      setCreateStatus("Enter a valid positive amount.");
      return;
    }
    if (!Number.isFinite(bonus) || bonus < 0) {
      setCreateStatus("Bonus must be 0 or more.");
      return;
    }

    try {
      const res = await fetch(`/vouchers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          bonusAmount: bonus,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setCreateStatus(data.error || `Failed to create voucher (${res.status})`);
        return;
      }

      const voucher = data.voucher || data;
      const pin = data.pin;

      setCreateStatus(
        pin
          ? `Voucher created: ${voucher.code} • ${voucher.amount} + ${voucher.bonusAmount} bonus • PIN: ${pin}`
          : `Voucher created: ${voucher.code} (amount ${voucher.amount})`
      );

      setCreateAmount("");
      setCreateBonus("");

      // refresh list if allowed
      fetchVouchers();
    } catch (err) {
      console.error("[VoucherPanel] create error:", err);
      setCreateStatus("Network error while creating voucher.");
    }
  }

  // For now, redeem in admin UI is disabled:
  // actual redeem logic is correctly wired for PLAYERS on /vouchers/redeem
  async function handleRedeemVoucher(e) {
    e.preventDefault();
    setRedeemStatus(
      "Redeem from this console is not wired to the new backend yet. Players redeem vouchers themselves in the game client."
    );
  }

  return (
    <div className="panel-grid">
      {/* Create / Redeem */}
      <section className="panel-card">
        <h2 className="panel-title">Voucher Actions</h2>
        <p className="panel-caption">
          Admin &amp; staff can create voucher tickets. Players redeem them from
          the lobby.
        </p>

        {!canCreateRedeem && (
          <div className="panel-warning">
            Your role ({staff.role}) cannot create vouchers.
          </div>
        )}

        <div className="panel-split">
          <div className="panel-block">
            <h3>Create Voucher</h3>
            <form className="form-vertical" onSubmit={handleCreateVoucher}>
              <label>
                Amount
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={createAmount}
                  onChange={(e) => setCreateAmount(e.target.value)}
                  disabled={!canCreateRedeem}
                />
              </label>

              <label>
                Bonus
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={createBonus}
                  onChange={(e) => setCreateBonus(e.target.value)}
                  disabled={!canCreateRedeem}
                />
              </label>

              {createStatus && (
                <div className="status-text status-text-info">
                  {createStatus}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={!canCreateRedeem}
              >
                Create voucher
              </button>
            </form>
          </div>

          <div className="panel-block">
            <h3>Redeem Voucher</h3>
            <p className="panel-caption">
              For now, redemption is handled by the player client using their
              own login.
            </p>

            {redeemStatus && (
              <div className="status-text status-text-info">
                {redeemStatus}
              </div>
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={handleRedeemVoucher}
            >
              Learn more
            </button>
          </div>
        </div>
      </section>

      {/* Voucher list */}
      <section className="panel-card">
        <h2 className="panel-title">Voucher List</h2>
        <p className="panel-caption">
          Recent vouchers created in the system (newest first).
        </p>

        {!canViewList && (
          <div className="panel-warning">
            Your role ({staff.role}) cannot view voucher history.
          </div>
        )}

        {canViewList && (
          <>
            {listError && <div className="error-text">{listError}</div>}
            {loadingList && <div className="status-text">Loading vouchers…</div>}

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Amount</th>
                    <th>Bonus</th>
                    <th>Currency</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Redeemed At</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.length === 0 && !loadingList && !listError && (
                    <tr>
                      <td colSpan={7} className="empty-cell">
                        No vouchers found.
                      </td>
                    </tr>
                  )}
                  {vouchers.map((v) => (
                    <tr key={v.id}>
                      <td>{v.code}</td>
                      <td>{v.amount}</td>
                      <td>{v.bonusAmount}</td>
                      <td>{v.currency}</td>
                      <td>{v.status}</td>
                      <td>
                        {v.createdAt
                          ? new Date(v.createdAt).toLocaleString()
                          : "-"}
                      </td>
                      <td>
                        {v.redeemedAt
                          ? new Date(v.redeemedAt).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
