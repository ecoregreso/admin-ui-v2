import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";

export default function Maintenance() {
  const { staff } = useStaffAuth();
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isOwner = staff?.role === "owner";
  useEffect(() => {
    let mounted = true;

    async function loadTenants() {
      if (!isOwner) {
        const tenantId = staff?.tenantId || "";
        if (mounted) {
          setSelectedTenantId(tenantId);
        }
        return;
      }

      try {
        const res = await api.get("/api/v1/admin/tenants");
        const list = res.data?.tenants || [];
        if (!mounted) return;
        setTenants(list);
        if (!selectedTenantId && list.length) {
          setSelectedTenantId(list[0].id);
        }
      } catch (err) {
        console.error("[Maintenance] load tenants error:", err);
        if (mounted) {
          setError("Failed to load tenants.");
        }
      }
    }

    loadTenants();

    return () => {
      mounted = false;
    };
  }, [isOwner, selectedTenantId, staff?.tenantId]);

  const confirmPhrase = useMemo(() => {
    if (!selectedTenantId) return "WIPE <tenantId>";
    return `WIPE ${selectedTenantId}`;
  }, [selectedTenantId]);

  const canSubmit =
    !!selectedTenantId &&
    confirmText.trim() === confirmPhrase &&
    password.trim().length > 0 &&
    !loading;

  async function handleWipe() {
    setError("");
    setStatus("");

    if (!selectedTenantId) {
      setError("Select a tenant before wiping data.");
      return;
    }

    if (confirmText.trim() !== confirmPhrase) {
      setError(`Type "${confirmPhrase}" to confirm.`);
      return;
    }

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    const proceed = window.confirm(
      "This will permanently delete ALL data and staff accounts for this tenant. This cannot be undone."
    );
    if (!proceed) return;

    setLoading(true);
    try {
      await api.post(`/api/v1/admin/tenants/${selectedTenantId}/wipe`, {
        confirm: confirmText.trim(),
        password: password.trim(),
      });
      setStatus("Tenant data wiped.");
      setConfirmText("");
      setPassword("");
    } catch (err) {
      console.error("[Maintenance] wipe error:", err);
      const message = err?.response?.data?.error || "Failed to wipe tenant.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Tenant Data Reset</h2>
            <p className="panel-subtitle">
              Irreversibly removes all tenant data including staff accounts. Tenant records remain.
            </p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {status && <div className="alert">{status}</div>}

        <div className="form-grid" style={{ marginTop: 12 }}>
          {isOwner ? (
            <div className="field">
              <label>Tenant</label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="select"
              >
                {tenants.length === 0 && <option value="">No tenants available</option>}
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.id})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="field">
              <label>Tenant</label>
              <input
                className="input"
                value={selectedTenantId || ""}
                readOnly
                placeholder="No tenant assigned"
              />
            </div>
          )}

          <div className="field">
            <label>Confirmation phrase</label>
            <input
              className="input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmPhrase}
              disabled={!selectedTenantId}
            />
            <div className="hint">
              Type exactly: <strong>{confirmPhrase}</strong>
            </div>
          </div>

          <div className="field">
            <label>Current password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={!selectedTenantId}
            />
          </div>

          <div className="field" style={{ alignSelf: "end" }}>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleWipe}
              disabled={!canSubmit}
            >
              {loading ? "Wiping..." : "Wipe Tenant Data"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
