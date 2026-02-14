import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useStaffAuth } from "../context/StaffAuthContext";
import { getOutcomeModeOptions, updateOutcomeMode } from "../api/configApi";
import {
  THEME_SETTINGS_KEY,
  applyThemeSettings,
  readThemeSettings,
  saveThemeSettings,
} from "../utils/themeSettings";

const DEFAULT_OUTCOME_MODE = "voucher_controlled";
const DEFAULT_OUTCOME_OPTIONS = [
  {
    value: "voucher_controlled",
    label: "Voucher Controlled",
    description:
      "Game outcomes follow voucher cap/decay behavior. Jackpots remain separate from voucher cap logic.",
  },
  {
    value: "pure_rng",
    label: "Pure RNG",
    description:
      "Game outcomes are fully random. Vouchers remain player identity, wallet, and ledger only.",
  },
];

function formatModeLabel(value) {
  const mode = String(value || "").toLowerCase();
  if (mode === "pure_rng") return "Pure RNG";
  if (mode === "voucher_controlled") return "Voucher Controlled";
  return value || "-";
}

function formatThemeModeLabel(value) {
  const mode = String(value || "").toLowerCase();
  if (mode === "light") return "Light";
  if (mode === "dark") return "Dark";
  if (mode === "auto") return "Auto (system)";
  return "Dark";
}

export default function SystemSettings() {
  const { staff, config, configLoading, refreshConfig } = useStaffAuth();
  const role = String(staff?.role || "");
  const isOwner = role === "owner";
  const canManageMode = ["owner", "operator", "agent"].includes(role);

  const effectiveConfig = config?.effective || {};

  const [ownerTenantId, setOwnerTenantId] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return (localStorage.getItem("ptu_owner_tenant_id") || "").trim();
    } catch {
      return "";
    }
  });

  const targetTenantId = useMemo(() => {
    if (!isOwner) return staff?.tenantId || null;
    const trimmed = String(ownerTenantId || "").trim();
    return trimmed || null;
  }, [isOwner, ownerTenantId, staff?.tenantId]);

  const [modeOptions, setModeOptions] = useState(DEFAULT_OUTCOME_OPTIONS);
  const [outcomeMode, setOutcomeMode] = useState(
    String(effectiveConfig.outcomeMode || DEFAULT_OUTCOME_MODE)
  );
  const [modeLoading, setModeLoading] = useState(false);
  const [modeError, setModeError] = useState("");
  const [modeStatus, setModeStatus] = useState("");

  const initialTheme = useMemo(() => readThemeSettings(), []);
  const [themePreview, setThemePreview] = useState(initialTheme.mode);
  const [themeFx, setThemeFx] = useState({
    highContrast: initialTheme.highContrast,
    compactDensity: initialTheme.compactDensity,
    neonAccents: initialTheme.neonAccents,
  });
  const [themeStatus, setThemeStatus] = useState("");

  const [featureFlags, setFeatureFlags] = useState({
    smartCashierAlerts: true,
    shiftReminderToasts: true,
    playerPulseWidget: false,
    incidentBanner: true,
  });
  const [featureStatus, setFeatureStatus] = useState("");

  const [operatorPrefs, setOperatorPrefs] = useState({
    language: "en-US",
    timezone: "America/New_York",
    sessionTimeoutMin: "60",
    dashboardRefreshSec: "30",
  });
  const [operatorStatus, setOperatorStatus] = useState("");

  const loadOutcomeMode = useCallback(async () => {
    setModeError("");
    setModeStatus("");

    if (isOwner && !targetTenantId) {
      setModeOptions(DEFAULT_OUTCOME_OPTIONS);
      setOutcomeMode(String(effectiveConfig.outcomeMode || DEFAULT_OUTCOME_MODE));
      return;
    }

    setModeLoading(true);
    try {
      const data = await getOutcomeModeOptions(targetTenantId || undefined);
      const options = Array.isArray(data?.options) && data.options.length
        ? data.options
        : DEFAULT_OUTCOME_OPTIONS;
      setModeOptions(options);
      setOutcomeMode(
        String(
          data?.outcomeMode ||
            data?.currentMode ||
            effectiveConfig.outcomeMode ||
            DEFAULT_OUTCOME_MODE
        )
      );
    } catch (err) {
      console.error("[SystemSettings] load outcome mode error:", err);
      setModeError(err?.response?.data?.error || err?.message || "Failed to load outcome mode.");
    } finally {
      setModeLoading(false);
    }
  }, [effectiveConfig.outcomeMode, isOwner, targetTenantId]);

  useEffect(() => {
    if (configLoading) return;
    loadOutcomeMode();
  }, [configLoading, loadOutcomeMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (isOwner) {
        localStorage.setItem("ptu_owner_tenant_id", ownerTenantId);
      } else {
        localStorage.removeItem("ptu_owner_tenant_id");
      }
    } catch {
      // ignore localStorage failures
    }
  }, [isOwner, ownerTenantId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("ptu_system_settings_placeholders");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.featureFlags && typeof parsed.featureFlags === "object") {
          setFeatureFlags((prev) => ({ ...prev, ...parsed.featureFlags }));
        }
        if (parsed?.operatorPrefs && typeof parsed.operatorPrefs === "object") {
          setOperatorPrefs((prev) => ({ ...prev, ...parsed.operatorPrefs }));
        }

        // Legacy migration: old placeholder theme values -> dedicated theme storage.
        const hasDedicatedTheme = Boolean(localStorage.getItem(THEME_SETTINGS_KEY));
        if (!hasDedicatedTheme && (parsed?.themePreview || parsed?.themeFx)) {
          const migrated = {
            mode: parsed?.themePreview || "dark",
            highContrast: Boolean(parsed?.themeFx?.highContrast),
            compactDensity: Boolean(parsed?.themeFx?.compactDensity),
            neonAccents:
              parsed?.themeFx?.neonAccents == null ? true : Boolean(parsed?.themeFx?.neonAccents),
          };
          const saved = saveThemeSettings(migrated);
          setThemePreview(saved.mode);
          setThemeFx({
            highContrast: saved.highContrast,
            compactDensity: saved.compactDensity,
            neonAccents: saved.neonAccents,
          });
          applyThemeSettings(saved);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    applyThemeSettings({
      mode: themePreview,
      highContrast: themeFx.highContrast,
      compactDensity: themeFx.compactDensity,
      neonAccents: themeFx.neonAccents,
    });
  }, [themePreview, themeFx.compactDensity, themeFx.highContrast, themeFx.neonAccents]);

  useEffect(() => {
    if (typeof window === "undefined" || themePreview !== "auto" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyThemeSettings({
        mode: themePreview,
        highContrast: themeFx.highContrast,
        compactDensity: themeFx.compactDensity,
        neonAccents: themeFx.neonAccents,
      });
    };
    if (media.addEventListener) {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
    if (media.addListener) {
      media.addListener(onChange);
      return () => media.removeListener(onChange);
    }
    return undefined;
  }, [themePreview, themeFx.compactDensity, themeFx.highContrast, themeFx.neonAccents]);

  function persistPlaceholderState(nextPatch = {}) {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        featureFlags,
        operatorPrefs,
        ...nextPatch,
      };
      localStorage.setItem("ptu_system_settings_placeholders", JSON.stringify(payload));
    } catch {
      // ignore localStorage failures
    }
  }

  async function onSaveOutcomeMode(e) {
    e.preventDefault();
    setModeError("");
    setModeStatus("");

    if (!canManageMode) {
      setModeError("Your role is not allowed to update outcome mode.");
      return;
    }
    if (isOwner && !targetTenantId) {
      setModeError("Owner must select a tenant ID before saving.");
      return;
    }

    setModeLoading(true);
    try {
      await updateOutcomeMode({
        tenantId: targetTenantId || undefined,
        outcomeMode,
      });
      setModeStatus(`Outcome mode saved: ${formatModeLabel(outcomeMode)}.`);
      await refreshConfig(targetTenantId || null);
      await loadOutcomeMode();
    } catch (err) {
      console.error("[SystemSettings] update outcome mode error:", err);
      setModeError(err?.response?.data?.error || err?.message || "Failed to save outcome mode.");
    } finally {
      setModeLoading(false);
    }
  }

  function onApplyThemeSettings() {
    const saved = saveThemeSettings({
      mode: themePreview,
      highContrast: themeFx.highContrast,
      compactDensity: themeFx.compactDensity,
      neonAccents: themeFx.neonAccents,
    });
    const result = applyThemeSettings(saved);
    setThemeStatus(
      `Theme applied: ${formatThemeModeLabel(saved.mode)}${
        saved.mode === "auto" ? ` (${formatThemeModeLabel(result.resolvedTheme)} active)` : ""
      }.`
    );
  }

  function onSaveFeaturePlaceholders() {
    persistPlaceholderState({
      featureFlags,
    });
    setFeatureStatus("Feature placeholders saved locally for this browser.");
  }

  function onSaveOperatorPlaceholders(e) {
    e.preventDefault();
    persistPlaceholderState({
      operatorPrefs,
    });
    setOperatorStatus("Operator placeholders saved locally for this browser.");
  }

  return (
    <div className="page stack">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">System Settings</h2>
            <p className="panel-subtitle">
              Central control surface for operator-level platform behavior and feature presets.
            </p>
          </div>
        </div>

        <div className="grid-3">
          <div>
            <div className="stat-label">Current Engine</div>
            <div className="stat-value">
              {formatModeLabel(effectiveConfig.outcomeMode || outcomeMode)}
            </div>
          </div>
          <div>
            <div className="stat-label">Role</div>
            <div className="stat-value">{role || "-"}</div>
          </div>
          <div>
            <div className="stat-label">Tenant Target</div>
            <div className="stat-value">
              {targetTenantId || "Not selected"}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Outcome Engine Mode</h3>
            <p className="panel-subtitle">
              Toggle between voucher-controlled outcomes and pure RNG outcomes. Jackpots stay separate from voucher caps in both modes.
            </p>
          </div>
        </div>

        {modeError && <div className="alert alert-error">{modeError}</div>}
        {modeStatus && <div className="alert">{modeStatus}</div>}

        <form className="form-grid" onSubmit={onSaveOutcomeMode}>
          {isOwner && (
            <div className="field">
              <label>Tenant ID</label>
              <input
                type="text"
                className="input"
                value={ownerTenantId}
                onChange={(e) => setOwnerTenantId(e.target.value || "")}
                placeholder="Tenant UUID"
                disabled={modeLoading}
              />
            </div>
          )}

          <div className="field">
            <label>Outcome Mode</label>
            <select
              className="select"
              value={outcomeMode}
              onChange={(e) => setOutcomeMode(String(e.target.value || DEFAULT_OUTCOME_MODE))}
              disabled={modeLoading || !canManageMode}
            >
              {modeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label || opt.value}
                </option>
              ))}
            </select>
            <div className="hint">
              {(modeOptions.find((opt) => opt.value === outcomeMode)?.description) ||
                "Select the platform outcome engine mode."}
            </div>
          </div>

          <div className="field" style={{ alignSelf: "end" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={modeLoading || !canManageMode}
            >
              {modeLoading ? "Saving..." : "Save Outcome Mode"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Theme Controls</h3>
            <p className="panel-subtitle">
              Apply global admin UI theme settings. Saved locally for this browser profile.
            </p>
          </div>
        </div>

        {themeStatus && <div className="alert">{themeStatus}</div>}

        <div className="form-grid">
          <div className="field">
            <label>Theme Mode</label>
            <select
              className="select"
              value={themePreview}
              onChange={(e) => setThemePreview(e.target.value || "light")}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (system)</option>
            </select>
          </div>

          <div className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={themeFx.highContrast}
                onChange={(e) =>
                  setThemeFx((prev) => ({ ...prev, highContrast: Boolean(e.target.checked) }))
                }
              />
              High Contrast
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={themeFx.compactDensity}
                onChange={(e) =>
                  setThemeFx((prev) => ({ ...prev, compactDensity: Boolean(e.target.checked) }))
                }
              />
              Compact Density
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={themeFx.neonAccents}
                onChange={(e) =>
                  setThemeFx((prev) => ({ ...prev, neonAccents: Boolean(e.target.checked) }))
                }
              />
              Neon Accent Pack
            </label>
          </div>

          <div className="field" style={{ alignSelf: "end" }}>
            <button type="button" className="btn btn-secondary" onClick={onApplyThemeSettings}>
              Apply Theme
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Feature Experiments (Placeholder)</h3>
            <p className="panel-subtitle">
              Toggle-ready placeholders for future operator-switchable modules.
            </p>
          </div>
        </div>

        {featureStatus && <div className="alert">{featureStatus}</div>}

        <div className="form-grid">
          <div className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={featureFlags.smartCashierAlerts}
                onChange={(e) =>
                  setFeatureFlags((prev) => ({
                    ...prev,
                    smartCashierAlerts: Boolean(e.target.checked),
                  }))
                }
              />
              Smart Cashier Alerts
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={featureFlags.shiftReminderToasts}
                onChange={(e) =>
                  setFeatureFlags((prev) => ({
                    ...prev,
                    shiftReminderToasts: Boolean(e.target.checked),
                  }))
                }
              />
              Shift Reminder Toasts
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={featureFlags.playerPulseWidget}
                onChange={(e) =>
                  setFeatureFlags((prev) => ({
                    ...prev,
                    playerPulseWidget: Boolean(e.target.checked),
                  }))
                }
              />
              Player Pulse Widget
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={featureFlags.incidentBanner}
                onChange={(e) =>
                  setFeatureFlags((prev) => ({
                    ...prev,
                    incidentBanner: Boolean(e.target.checked),
                  }))
                }
              />
              Incident Broadcast Banner
            </label>
          </div>

          <div className="field" style={{ alignSelf: "end" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onSaveFeaturePlaceholders}
            >
              Save Feature Placeholders
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Operator Defaults (Placeholder)</h3>
            <p className="panel-subtitle">
              Standard operator preferences for timezone, language, timeout, and dashboard refresh.
            </p>
          </div>
        </div>

        {operatorStatus && <div className="alert">{operatorStatus}</div>}

        <form className="form-grid" onSubmit={onSaveOperatorPlaceholders}>
          <div className="field">
            <label>Language</label>
            <select
              className="select"
              value={operatorPrefs.language}
              onChange={(e) =>
                setOperatorPrefs((prev) => ({ ...prev, language: e.target.value || "en-US" }))
              }
            >
              <option value="en-US">English (US)</option>
              <option value="es-US">Spanish (US)</option>
              <option value="fr-CA">French (Canada)</option>
            </select>
          </div>

          <div className="field">
            <label>Timezone</label>
            <select
              className="select"
              value={operatorPrefs.timezone}
              onChange={(e) =>
                setOperatorPrefs((prev) => ({
                  ...prev,
                  timezone: e.target.value || "America/New_York",
                }))
              }
            >
              <option value="America/New_York">America/New_York</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/Denver">America/Denver</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div className="field">
            <label>Idle Session Timeout</label>
            <select
              className="select"
              value={operatorPrefs.sessionTimeoutMin}
              onChange={(e) =>
                setOperatorPrefs((prev) => ({
                  ...prev,
                  sessionTimeoutMin: e.target.value || "60",
                }))
              }
            >
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">120 minutes</option>
            </select>
          </div>

          <div className="field">
            <label>Dashboard Refresh Interval</label>
            <select
              className="select"
              value={operatorPrefs.dashboardRefreshSec}
              onChange={(e) =>
                setOperatorPrefs((prev) => ({
                  ...prev,
                  dashboardRefreshSec: e.target.value || "30",
                }))
              }
            >
              <option value="15">15 sec</option>
              <option value="30">30 sec</option>
              <option value="60">60 sec</option>
              <option value="120">120 sec</option>
            </select>
          </div>

          <div className="field" style={{ alignSelf: "end" }}>
            <button type="submit" className="btn btn-secondary">
              Save Operator Placeholders
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
