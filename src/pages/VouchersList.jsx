import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStaffAuth } from "../context/StaffAuthContext";
import { createVoucher, listVouchers, terminateVoucher } from "../api/vouchersApi";
import { buildApiUrl } from "../api/client";
import {
  getVoucherWinCapOptions,
  updateVoucherWinCapPolicy,
} from "../api/configApi";

const FIXED_MODE = "fixed_percent";
const RANDOM_MODE = "random_percent";
const DEFAULT_PERCENT_OPTIONS = [120, 150, 175, 200, 250, 300];
const DEFAULT_RANDOM_PERCENT_OPTIONS = [150, 175, 200, 225, 250, 300];

function fmt(n) {
  if (n == null) return "0";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(s) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return "";
  }
}

function parsePercentList(input, fallback = []) {
  if (typeof input !== "string") return [...fallback];
  const out = input
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.round(n * 100) / 100);
  const unique = Array.from(new Set(out)).sort((a, b) => a - b);
  if (!unique.length) return [...fallback];
  return unique;
}

function findVoucherCap(voucher) {
  const direct = Number(voucher?.maxCashout || 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const metadataCap = Number(voucher?.metadata?.maxCashout || 0);
  if (Number.isFinite(metadataCap) && metadataCap > 0) return metadataCap;
  return 0;
}

function capModeLabel(mode) {
  if (mode === RANDOM_MODE) return "random";
  if (mode === FIXED_MODE) return "fixed";
  if (mode === "manual_amount") return "manual";
  return "-";
}

function extractVoucherFromResponse(data) {
  if (!data || typeof data !== "object") return null;
  if (data.voucher && typeof data.voucher === "object") return data.voucher;
  if (data.data && data.data.voucher && typeof data.data.voucher === "object") {
    return data.data.voucher;
  }
  return null;
}

function canTerminateVoucher(voucher) {
  const status = String(voucher?.status || "").toLowerCase();
  return status !== "terminated";
}

export default function VouchersList() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [amount, setAmount] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [currency, setCurrency] = useState("FUN");
  const [createCapChoice, setCreateCapChoice] = useState("policy_default");

  const { staff, config, configLoading, refreshConfig } = useStaffAuth();
  const effectiveConfig = config?.effective || {};
  const isOwner = staff?.role === "owner";
  const canCreate = (staff?.permissions || []).includes("voucher:write");
  const canTerminate = (staff?.permissions || []).includes("voucher:terminate");
  const canManagePolicy = ["owner", "operator", "agent"].includes(
    String(staff?.role || "")
  );

  const vouchersEnabled = effectiveConfig.vouchersEnabled !== false;
  const maintenanceMode = effectiveConfig.maintenanceMode === true;
  const isBlocked = !isOwner && (maintenanceMode || !vouchersEnabled);
  const blockedMessage = useMemo(() => {
    if (!isBlocked) return "";
    if (maintenanceMode) return "System is in maintenance mode.";
    return "Vouchers are disabled for this tenant.";
  }, [isBlocked, maintenanceMode]);

  const [ownerTenantId, setOwnerTenantId] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return (localStorage.getItem("ptu_owner_tenant_id") || "").trim();
    } catch {
      return "";
    }
  });

  const [created, setCreated] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [cashoutCode, setCashoutCode] = useState("");
  const [cashoutReason, setCashoutReason] = useState("");
  const [cashoutConfirm, setCashoutConfirm] = useState(false);
  const [cashoutLoading, setCashoutLoading] = useState(false);
  const [cashoutError, setCashoutError] = useState("");
  const [cashoutStatus, setCashoutStatus] = useState("");
  const [cashoutResult, setCashoutResult] = useState(null);
  const cashoutPanelRef = useRef(null);

  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState("");
  const [policyStatus, setPolicyStatus] = useState("");
  const [capPolicy, setCapPolicy] = useState(null);
  const [policyForm, setPolicyForm] = useState({
    mode: FIXED_MODE,
    fixedPercent: "200",
    percentOptionsText: DEFAULT_PERCENT_OPTIONS.join(", "),
    randomPercentOptionsText: DEFAULT_RANDOM_PERCENT_OPTIONS.join(", "),
    decayRate: "0.08",
    minDecayAmount: "0.01",
    stakeDecayMultiplier: "0.35",
  });

  const fixedPercentOptions = useMemo(() => {
    const source = capPolicy?.percentOptions || DEFAULT_PERCENT_OPTIONS;
    return Array.isArray(source) && source.length ? source : DEFAULT_PERCENT_OPTIONS;
  }, [capPolicy]);

  const randomPercentOptions = useMemo(() => {
    const source = capPolicy?.randomPercentOptions || DEFAULT_RANDOM_PERCENT_OPTIONS;
    return Array.isArray(source) && source.length
      ? source
      : fixedPercentOptions;
  }, [capPolicy, fixedPercentOptions]);

  const targetTenantId = useMemo(() => {
    if (!isOwner) return null;
    const trimmed = ownerTenantId.trim();
    return trimmed || null;
  }, [isOwner, ownerTenantId]);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const data = await listVouchers({ limit: 200 });
      setVouchers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || e?.message || "Failed to load vouchers.");
    } finally {
      setLoading(false);
    }
  }

  const applyPolicyToForm = useCallback((policy) => {
    const next = {
      mode: policy?.mode || FIXED_MODE,
      fixedPercent: String(policy?.fixedPercent ?? "200"),
      percentOptionsText: (policy?.percentOptions || DEFAULT_PERCENT_OPTIONS).join(", "),
      randomPercentOptionsText: (
        policy?.randomPercentOptions || DEFAULT_RANDOM_PERCENT_OPTIONS
      ).join(", "),
      decayRate: String(policy?.decayRate ?? "0.08"),
      minDecayAmount: String(policy?.minDecayAmount ?? "0.01"),
      stakeDecayMultiplier: String(policy?.stakeDecayMultiplier ?? "0.35"),
    };
    setPolicyForm(next);
  }, []);

  const loadPolicyOptions = useCallback(async () => {
    setPolicyError("");
    setPolicyStatus("");

    if (isOwner && !targetTenantId) {
      setCapPolicy(null);
      return;
    }

    setPolicyLoading(true);
    try {
      const data = await getVoucherWinCapOptions(targetTenantId || undefined);
      const policy = data?.policy || data?.options?.defaults || null;
      setCapPolicy(policy);
      if (policy) {
        applyPolicyToForm(policy);
      }
    } catch (err) {
      console.error("[VouchersList] failed loading win cap policy:", err);
      setCapPolicy(null);
      setPolicyError(
        err?.response?.data?.error || err?.message || "Failed to load win cap policy."
      );
    } finally {
      setPolicyLoading(false);
    }
  }, [applyPolicyToForm, isOwner, targetTenantId]);

  useEffect(() => {
    if (configLoading) return;
    if (isBlocked) {
      setVouchers([]);
      setError(blockedMessage);
      return;
    }
    load();
  }, [configLoading, isBlocked, blockedMessage]);

  useEffect(() => {
    if (configLoading) return;
    loadPolicyOptions();
  }, [configLoading, loadPolicyOptions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (isOwner) {
        localStorage.setItem("ptu_owner_tenant_id", ownerTenantId);
      } else {
        localStorage.removeItem("ptu_owner_tenant_id");
      }
    } catch (err) {
      console.warn("[VouchersList] failed to persist owner tenant id:", err);
    }
  }, [isOwner, ownerTenantId]);

  const createCapPreview = useMemo(() => {
    const a = Number(amount || 0);
    const b = Number(bonusAmount || 0);
    if (!Number.isFinite(a) || a <= 0) return "";
    const totalCredit = Math.max(0, a) + Math.max(0, Number.isFinite(b) ? b : 0);

    if (createCapChoice === "random") {
      const minPct = Math.min(...randomPercentOptions);
      const maxPct = Math.max(...randomPercentOptions);
      const minCap = Math.max(totalCredit, (a * minPct) / 100);
      const maxCap = Math.max(totalCredit, (a * maxPct) / 100);
      return `Random cap from ${fmt(minPct)}% to ${fmt(maxPct)}% (~$${fmt(minCap)} - $${fmt(
        maxCap
      )}).`;
    }

    if (createCapChoice.startsWith("fixed:")) {
      const pct = Number(createCapChoice.split(":")[1] || 0);
      if (!Number.isFinite(pct) || pct <= 0) return "";
      const cap = Math.max(totalCredit, (a * pct) / 100);
      return `Fixed cap ${fmt(pct)}% (~$${fmt(cap)}).`;
    }

    const mode = capPolicy?.mode || FIXED_MODE;
    if (mode === RANDOM_MODE) {
      const minPct = Math.min(...randomPercentOptions);
      const maxPct = Math.max(...randomPercentOptions);
      const minCap = Math.max(totalCredit, (a * minPct) / 100);
      const maxCap = Math.max(totalCredit, (a * maxPct) / 100);
      return `Tenant default is random (${fmt(minPct)}% - ${fmt(maxPct)}%, ~$${fmt(
        minCap
      )} - $${fmt(maxCap)}).`;
    }

    const pct = Number(capPolicy?.fixedPercent || 200);
    const cap = Math.max(totalCredit, (a * pct) / 100);
    return `Tenant default is ${fmt(pct)}% (~$${fmt(cap)}).`;
  }, [amount, bonusAmount, createCapChoice, capPolicy, randomPercentOptions]);

  async function onCreate(e) {
    e.preventDefault();
    setError("");
    setCreated(null);

    if (isBlocked) {
      return setError(blockedMessage);
    }
    if (!canCreate) {
      return setError("You do not have permission to create vouchers.");
    }

    const a = Number(amount);
    const b = Number(bonusAmount || 0);

    if (!Number.isFinite(a) || a <= 0) return setError("Amount must be > 0.");
    if (!Number.isFinite(b) || b < 0) return setError("Bonus must be >= 0.");

    const ownerTenant = ownerTenantId.trim();
    if (isOwner && !ownerTenant) {
      return setError("Owner must provide a tenant ID before creating vouchers.");
    }

    let winCapMode;
    let winCapPercent;

    if (createCapChoice === "random") {
      winCapMode = RANDOM_MODE;
    } else if (createCapChoice.startsWith("fixed:")) {
      winCapMode = FIXED_MODE;
      winCapPercent = Number(createCapChoice.split(":")[1] || 0);
      if (!Number.isFinite(winCapPercent) || winCapPercent <= 0) {
        return setError("Invalid cap percent selection.");
      }
    }

    try {
      const payload = {
        amount: a,
        bonusAmount: b,
        currency,
      };
      if (isOwner) {
        payload.tenantId = ownerTenant;
      }
      if (winCapMode) {
        payload.winCapMode = winCapMode;
      }
      if (winCapPercent) {
        payload.winCapPercent = winCapPercent;
      }

      const data = await createVoucher(payload);
      setCreated(data);
      setAmount("");
      setBonusAmount("");
      await load();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || e?.message || "Failed to create voucher.");
    }
  }

  async function onSavePolicy(e) {
    e.preventDefault();
    setPolicyError("");
    setPolicyStatus("");

    if (!canManagePolicy) {
      setPolicyError("You do not have access to update voucher win cap policy.");
      return;
    }

    if (isOwner && !targetTenantId) {
      setPolicyError("Owner must provide tenant ID before saving policy.");
      return;
    }

    const mode = policyForm.mode === RANDOM_MODE ? RANDOM_MODE : FIXED_MODE;
    const fixedPercent = Number(policyForm.fixedPercent || 0);
    const decayRate = Number(policyForm.decayRate || 0);
    const minDecayAmount = Number(policyForm.minDecayAmount || 0);
    const stakeDecayMultiplier = Number(policyForm.stakeDecayMultiplier || 0);

    if (!Number.isFinite(fixedPercent) || fixedPercent <= 0) {
      setPolicyError("Fixed percent must be a positive number.");
      return;
    }
    if (!Number.isFinite(decayRate) || decayRate < 0.01 || decayRate > 0.5) {
      setPolicyError("Decay rate must be between 0.01 and 0.5.");
      return;
    }
    if (!Number.isFinite(minDecayAmount) || minDecayAmount < 0) {
      setPolicyError("Minimum decay amount must be 0 or greater.");
      return;
    }
    if (!Number.isFinite(stakeDecayMultiplier) || stakeDecayMultiplier < 0) {
      setPolicyError("Stake decay multiplier must be 0 or greater.");
      return;
    }

    const percentOptions = parsePercentList(
      policyForm.percentOptionsText,
      fixedPercentOptions
    );
    const randomPercentOptions = parsePercentList(
      policyForm.randomPercentOptionsText,
      percentOptions
    );

    setPolicyLoading(true);
    try {
      await updateVoucherWinCapPolicy({
        tenantId: targetTenantId || undefined,
        voucherWinCapPolicy: {
          mode,
          fixedPercent,
          percentOptions,
          randomPercentOptions,
          decayRate,
          minDecayAmount,
          stakeDecayMultiplier,
        },
      });

      setPolicyStatus("Voucher win cap policy saved.");
      await refreshConfig(targetTenantId || undefined);
      await loadPolicyOptions();
    } catch (err) {
      console.error("[VouchersList] save policy failed:", err);
      setPolicyError(
        err?.response?.data?.error || err?.message || "Failed to save voucher win cap policy."
      );
    } finally {
      setPolicyLoading(false);
    }
  }

  async function copyToClipboard(value, label) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopyStatus(`${label} copied.`);
    } catch (err) {
      console.error(err);
      setCopyStatus("Copy failed.");
    }
    setTimeout(() => setCopyStatus(""), 2000);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vouchers.filter((v) => {
      if (status && v.status !== status) return false;
      if (!q) return true;
      const code = String(v.code || "").toLowerCase();
      const userCode = String(v?.metadata?.userCode || "").toLowerCase();
      return code.includes(q) || userCode.includes(q);
    });
  }, [vouchers, search, status]);

  const cashoutCandidate = useMemo(() => {
    const code = String(cashoutCode || "").trim().toLowerCase();
    if (!code) return null;
    return vouchers.find((v) => String(v?.code || "").toLowerCase() === code) || null;
  }, [cashoutCode, vouchers]);

  function queueCashout(voucher) {
    if (!voucher?.code) return;
    setCashoutCode(voucher.code);
    setCashoutConfirm(false);
    setCashoutError("");
    setCashoutStatus(`Selected voucher ${voucher.code} for cashout.`);
    if (cashoutPanelRef.current) {
      cashoutPanelRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  async function onCashout(e) {
    e.preventDefault();
    setCashoutError("");
    setCashoutStatus("");
    setCashoutResult(null);

    if (isBlocked) {
      setCashoutError(blockedMessage);
      return;
    }
    if (!canTerminate) {
      setCashoutError("You do not have permission to cashout/terminate vouchers.");
      return;
    }

    const code = String(cashoutCode || "").trim();
    if (!code) {
      setCashoutError("Voucher code is required.");
      return;
    }
    if (!cashoutConfirm) {
      setCashoutError("Confirm cashout before submitting.");
      return;
    }
    if (cashoutCandidate && !canTerminateVoucher(cashoutCandidate)) {
      setCashoutError("Voucher is already terminated.");
      return;
    }

    const ownerTenant = ownerTenantId.trim();
    if (isOwner && !ownerTenant) {
      setCashoutError("Owner must provide tenant ID before cashout.");
      return;
    }

    setCashoutLoading(true);
    try {
      const data = await terminateVoucher({
        code,
        reason: String(cashoutReason || "").trim() || undefined,
        tenantId: isOwner ? ownerTenant : undefined,
      });
      const voucher = extractVoucherFromResponse(data);
      setCashoutResult(voucher);
      setCashoutStatus(
        voucher?.code
          ? `Voucher ${voucher.code} terminated successfully.`
          : "Voucher terminated successfully."
      );
      setCashoutConfirm(false);
      await load();
    } catch (err) {
      console.error("[VouchersList] cashout failed:", err);
      setCashoutError(
        err?.response?.data?.error || err?.message || "Failed to terminate voucher."
      );
    } finally {
      setCashoutLoading(false);
    }
  }

  return (
    <div className="page stack">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Voucher Win Cap Policy</h2>
            <p className="panel-subtitle">
              Configure fixed percentage caps or random cap pool used by voucher creation.
            </p>
          </div>
        </div>

        {policyError && <div className="alert alert-error">{policyError}</div>}
        {policyStatus && <div className="alert">{policyStatus}</div>}

        {isOwner && (
          <div className="field" style={{ marginTop: 8, maxWidth: 420 }}>
            <label>Tenant ID</label>
            <input
              type="text"
              value={ownerTenantId}
              onChange={(e) => setOwnerTenantId(e.target.value || "")}
              className="input"
              placeholder="Tenant UUID"
            />
            <div className="hint">Owner actions require a tenant ID target.</div>
          </div>
        )}

        {!isOwner || targetTenantId ? (
          <form className="form-grid" onSubmit={onSavePolicy} style={{ marginTop: 12 }}>
            <div className="field">
              <label>Default Mode</label>
              <select
                className="select"
                value={policyForm.mode}
                onChange={(e) =>
                  setPolicyForm((prev) => ({ ...prev, mode: e.target.value }))
                }
                disabled={policyLoading || !canManagePolicy}
              >
                <option value={FIXED_MODE}>Fixed Percent</option>
                <option value={RANDOM_MODE}>Random Percent</option>
              </select>
            </div>

            <div className="field">
              <label>Fixed Percent</label>
              <select
                className="select"
                value={policyForm.fixedPercent}
                onChange={(e) =>
                  setPolicyForm((prev) => ({ ...prev, fixedPercent: e.target.value }))
                }
                disabled={policyLoading || !canManagePolicy}
              >
                {fixedPercentOptions.map((pct) => (
                  <option key={`fixed-${pct}`} value={pct}>
                    {fmt(pct)}%
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Allowed Percent Options</label>
              <input
                className="input"
                value={policyForm.percentOptionsText}
                onChange={(e) =>
                  setPolicyForm((prev) => ({
                    ...prev,
                    percentOptionsText: e.target.value,
                  }))
                }
                placeholder="120, 150, 200"
                disabled={policyLoading || !canManagePolicy}
              />
            </div>

            <div className="field">
              <label>Random Percent Pool</label>
              <input
                className="input"
                value={policyForm.randomPercentOptionsText}
                onChange={(e) =>
                  setPolicyForm((prev) => ({
                    ...prev,
                    randomPercentOptionsText: e.target.value,
                  }))
                }
                placeholder="150, 175, 200, 250"
                disabled={policyLoading || !canManagePolicy}
              />
            </div>

            <div className="field">
              <label>Decay Rate</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="0.5"
                className="input"
                value={policyForm.decayRate}
                onChange={(e) =>
                  setPolicyForm((prev) => ({ ...prev, decayRate: e.target.value }))
                }
                disabled={policyLoading || !canManagePolicy}
              />
            </div>

            <div className="field">
              <label>Min Decay Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={policyForm.minDecayAmount}
                onChange={(e) =>
                  setPolicyForm((prev) => ({
                    ...prev,
                    minDecayAmount: e.target.value,
                  }))
                }
                disabled={policyLoading || !canManagePolicy}
              />
            </div>

            <div className="field">
              <label>Stake Decay Multiplier</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={policyForm.stakeDecayMultiplier}
                onChange={(e) =>
                  setPolicyForm((prev) => ({
                    ...prev,
                    stakeDecayMultiplier: e.target.value,
                  }))
                }
                disabled={policyLoading || !canManagePolicy}
              />
            </div>

            <div className="field" style={{ alignSelf: "end" }}>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={policyLoading || !canManagePolicy}
              >
                {policyLoading ? "Saving..." : "Save Cap Policy"}
              </button>
            </div>
          </form>
        ) : (
          <div className="hint" style={{ marginTop: 12 }}>
            Provide a tenant ID to load and edit voucher cap policy.
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Voucher Operations</h2>
            <p className="panel-subtitle">Create vouchers and print/scan QR for player login.</p>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}
        {!error && !isBlocked && !canCreate && (
          <div className="alert">You do not have permission to create vouchers.</div>
        )}

        <form className="form-grid" onSubmit={onCreate}>
          <div className="field">
            <label>Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              required
            />
          </div>

          <div className="field">
            <label>Bonus Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              className="input"
            />
          </div>

          <div className="field">
            <label>Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="select"
            >
              <option value="FUN">FUN</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div className="field">
            <label>Win Cap Selection</label>
            <select
              value={createCapChoice}
              onChange={(e) => setCreateCapChoice(e.target.value)}
              className="select"
              disabled={policyLoading}
            >
              <option value="policy_default">Tenant Default</option>
              <option value="random">Random (policy pool)</option>
              {fixedPercentOptions.map((pct) => (
                <option key={`create-fixed-${pct}`} value={`fixed:${pct}`}>
                  Fixed {fmt(pct)}%
                </option>
              ))}
            </select>
            {createCapPreview && <div className="hint">{createCapPreview}</div>}
          </div>

          {isOwner && (
            <div className="field">
              <label>Tenant ID</label>
              <input
                type="text"
                value={ownerTenantId}
                onChange={(e) => setOwnerTenantId(e.target.value || "")}
                className="input"
                placeholder="Tenant UUID"
              />
              <div className="hint">Owners must specify the tenant to issue a voucher.</div>
            </div>
          )}

          <div className="field" style={{ alignSelf: "end" }}>
            <button className="btn btn-primary" type="submit" disabled={loading || isBlocked || !canCreate}>
              Create Voucher
            </button>
          </div>
        </form>

        {created?.voucher && (
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-header">
              <h3 className="panel-title">Created Voucher</h3>
            </div>
            <div className="grid-3">
              <div>
                <div className="stat-label">User Code</div>
                <div className="stat-value">{created.userCode}</div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => copyToClipboard(created.userCode, "User code")}
                >
                  Copy
                </button>
              </div>
              <div>
                <div className="stat-label">PIN</div>
                <div className="stat-value">{created.pin}</div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => copyToClipboard(created.pin, "PIN")}
                >
                  Copy
                </button>
              </div>
              <div>
                <div className="stat-label">Voucher Code</div>
                <div className="stat-value">{created.voucher.code}</div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => copyToClipboard(created.voucher.code, "Voucher code")}
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="grid-3" style={{ marginTop: 12 }}>
              <div>
                <div className="stat-label">Max Cashout</div>
                <div className="stat-value">${fmt(findVoucherCap(created.voucher))}</div>
              </div>
              <div>
                <div className="stat-label">Cap Mode</div>
                <div className="stat-value">{capModeLabel(created.voucher?.metadata?.capStrategy?.mode)}</div>
              </div>
              <div>
                <div className="stat-label">Cap Percent</div>
                <div className="stat-value">
                  {created.voucher?.metadata?.capStrategy?.percent
                    ? `${fmt(created.voucher.metadata.capStrategy.percent)}%`
                    : "-"}
                </div>
              </div>
            </div>

            {copyStatus && <div className="hint" style={{ marginTop: 8 }}>{copyStatus}</div>}

            {created.qr?.path && (
              <div style={{ marginTop: 16 }}>
                <div className="stat-label" style={{ marginBottom: 8 }}>
                  QR Code
                </div>
                <img
                  src={buildApiUrl(created.qr.path)}
                  alt="Voucher QR"
                  style={{ width: 180, height: 180, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)" }}
                />
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      copyToClipboard(buildApiUrl(created.qr.path), "QR url")
                    }
                  >
                    Copy QR URL
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel" ref={cashoutPanelRef}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Voucher Cashout / Terminate</h2>
            <p className="panel-subtitle">
              Cashout closes the voucher and marks status as terminated. Jackpot wins are not part of voucher cashout cap logic.
            </p>
          </div>
        </div>

        {cashoutError && <div className="alert alert-error">{cashoutError}</div>}
        {cashoutStatus && <div className="alert">{cashoutStatus}</div>}

        {!isBlocked && !canTerminate && (
          <div className="alert">You do not have permission to cashout vouchers.</div>
        )}

        <form className="form-grid" onSubmit={onCashout}>
          <div className="field">
            <label>Voucher Code</label>
            <input
              type="text"
              value={cashoutCode}
              onChange={(e) => setCashoutCode(e.target.value || "")}
              className="input"
              placeholder="Voucher code"
              disabled={cashoutLoading || isBlocked || !canTerminate}
            />
          </div>

          <div className="field">
            <label>Cashout Reason</label>
            <input
              type="text"
              value={cashoutReason}
              onChange={(e) => setCashoutReason(e.target.value || "")}
              className="input"
              placeholder="optional reason"
              disabled={cashoutLoading || isBlocked || !canTerminate}
            />
          </div>

          {isOwner && (
            <div className="field">
              <label>Tenant ID</label>
              <input
                type="text"
                value={ownerTenantId}
                onChange={(e) => setOwnerTenantId(e.target.value || "")}
                className="input"
                placeholder="Tenant UUID"
                disabled={cashoutLoading}
              />
            </div>
          )}

          <div className="field" style={{ justifyContent: "flex-end" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={cashoutConfirm}
                onChange={(e) => setCashoutConfirm(Boolean(e.target.checked))}
                disabled={cashoutLoading || isBlocked || !canTerminate}
              />
              Confirm voucher termination
            </label>
          </div>

          <div className="field" style={{ alignSelf: "end" }}>
            <button
              className="btn btn-danger"
              type="submit"
              disabled={cashoutLoading || isBlocked || !canTerminate}
            >
              {cashoutLoading ? "Processing..." : "Cashout Voucher"}
            </button>
          </div>
        </form>

        {cashoutCandidate && (
          <div className="grid-3" style={{ marginTop: 12 }}>
            <div>
              <div className="stat-label">Current Status</div>
              <div className="stat-value">{cashoutCandidate.status || "-"}</div>
            </div>
            <div>
              <div className="stat-label">Total Credit</div>
              <div className="stat-value">
                $
                {fmt(
                  Number(cashoutCandidate.amount || 0) +
                    Number(cashoutCandidate.bonusAmount || 0)
                )}
              </div>
            </div>
            <div>
              <div className="stat-label">Max Cashout</div>
              <div className="stat-value">${fmt(findVoucherCap(cashoutCandidate))}</div>
            </div>
          </div>
        )}

        {cashoutCode && !cashoutCandidate && (
          <div className="hint" style={{ marginTop: 8 }}>
            Voucher not found in the current list. You can still submit by code.
          </div>
        )}

        {cashoutCandidate && !canTerminateVoucher(cashoutCandidate) && (
          <div className="hint" style={{ marginTop: 8 }}>
            This voucher is already terminated.
          </div>
        )}

        {cashoutResult && (
          <div className="hint" style={{ marginTop: 8 }}>
            Cashout recorded at {fmtDate(cashoutResult?.metadata?.terminatedAt || null) || "now"}.
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Recent Vouchers</h3>
            <p className="panel-subtitle">Search by voucher code or user code.</p>
          </div>
          <div className="panel-actions">
            <input
              type="text"
              placeholder="Search (code / userCode)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="select"
            >
              <option value="">All statuses</option>
              <option value="new">new</option>
              <option value="redeemed">redeemed</option>
              <option value="terminated">terminated</option>
              <option value="cancelled">cancelled</option>
              <option value="expired">expired</option>
            </select>
            <button className="btn btn-ghost" onClick={load} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Voucher</th>
                <th>User Code</th>
                <th>PIN</th>
                <th>Amount</th>
                <th>Bonus</th>
                <th>Max Cap</th>
                <th>Cap Strategy</th>
                <th>Cur</th>
                <th>Status</th>
                <th>Creator</th>
                <th>QR</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => {
                const userCode = v?.metadata?.userCode || "";
                const qrPath = v?.metadata?.qrPath || "";
                const creator =
                  v.createdByActorType === "staff"
                    ? `staff#${v.createdByStaffId}`
                    : v.createdByActorType === "user"
                    ? `user:${String(v.createdByUserId || "").slice(0, 8)}...`
                    : "";
                const maxCap = findVoucherCap(v);
                const capStrategy = v?.metadata?.capStrategy || {};
                const capMode = capModeLabel(capStrategy.mode);
                const capPercent = capStrategy.percent
                  ? `${fmt(capStrategy.percent)}%`
                  : "-";

                return (
                  <tr key={v.id}>
                    <td>{fmtDate(v.createdAt)}</td>
                    <td>{v.code}</td>
                    <td>{userCode}</td>
                    <td>{v.pin || "-"}</td>
                    <td>${fmt(v.amount)}</td>
                    <td>${fmt(v.bonusAmount)}</td>
                    <td>{maxCap > 0 ? `$${fmt(maxCap)}` : "-"}</td>
                    <td>{capMode === "-" ? "-" : `${capMode} / ${capPercent}`}</td>
                    <td>{v.currency}</td>
                    <td>{v.status}</td>
                    <td>{creator}</td>
                    <td>
                      {qrPath ? (
                        <a
                          className="tag tag-blue"
                          href={buildApiUrl(qrPath)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {canTerminate && canTerminateVoucher(v) ? (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => queueCashout(v)}
                          disabled={cashoutLoading || isBlocked}
                        >
                          Cashout
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && !loading && (
                <tr>
                  <td colSpan={13} className="empty">
                    No vouchers found.
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
