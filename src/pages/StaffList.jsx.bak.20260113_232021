import React, { useEffect, useMemo, useState } from "react";
import {
  listStaff,
  createStaff,
  updateStaff,
  resetStaffPassword,
} from "../api/staffAdminApi";

const PERMISSION_GROUPS = [
  {
    label: "Security",
    perms: ["tenant:manage", "staff:manage", "system:config"],
  },
  {
    label: "Players",
    perms: ["player:read", "player:write"],
  },
  {
    label: "Finance",
    perms: ["finance:read", "finance:write", "betlog:read"],
  },
  {
    label: "Vouchers",
    perms: ["voucher:read", "voucher:write"],
  },
];

const ROLE_DEFAULTS = {
  operator: [
    "tenant:manage",
    "staff:manage",
    "player:read",
    "player:write",
    "finance:read",
    "finance:write",
    "voucher:read",
    "voucher:write",
    "betlog:read",
  ],
  agent: ["player:read", "player:write", "finance:read", "voucher:read"],
  distributor: ["player:read", "finance:read"],
  cashier: ["player:read", "finance:write", "finance:read", "voucher:read", "voucher:write"],
};

function displayPermissions(staff) {
  if (Array.isArray(staff.permissions) && staff.permissions.length > 0) {
    return staff.permissions;
  }
  return ROLE_DEFAULTS[staff.role] || [];
}

export default function StaffList() {
  const [staff, setStaff] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [permissionsDraft, setPermissionsDraft] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("cashier");
  const [newActive, setNewActive] = useState(true);

  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [emailDraft, setEmailDraft] = useState("");

  async function loadStaff() {
    setLoading(true);
    setError("");
    try {
      const data = await listStaff();
      if (data.ok) {
        setStaff(data.staff || []);
        if (!selectedId && data.staff?.length) {
          setSelectedId(data.staff[0].id);
        }
      } else {
        setError(data.error || "Failed to load staff");
      }
    } catch (err) {
      console.error("[StaffList] load error:", err);
      setError("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedStaff = useMemo(() => staff.find((s) => s.id === selectedId) || null, [staff, selectedId]);

  useEffect(() => {
    if (selectedStaff) {
      setPermissionsDraft(displayPermissions(selectedStaff));
      setResetPasswordValue("");
      setEmailDraft(selectedStaff.email || "");
    }
  }, [selectedStaff]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await createStaff({
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole,
        isActive: newActive,
      });
      if (data.ok) {
        setNewUsername("");
        setNewEmail("");
        setNewPassword("");
        setNewRole("cashier");
        setNewActive(true);
        await loadStaff();
      } else {
        setError(data.error || "Failed to create staff");
      }
    } catch (err) {
      console.error("[StaffList] create error:", err);
      setError("Failed to create staff");
    }
  }

  async function handleToggleActive(s) {
    setError("");
    try {
      const data = await updateStaff(s.id, { isActive: !s.isActive });
      if (data.ok) {
        await loadStaff();
      } else {
        setError(data.error || "Failed to update staff");
      }
    } catch (err) {
      console.error("[StaffList] update error:", err);
      setError("Failed to update staff");
    }
  }

  async function handleChangeRole(s, role) {
    setError("");
    try {
      const data = await updateStaff(s.id, { role });
      if (data.ok) {
        await loadStaff();
      } else {
        setError(data.error || "Failed to update role");
      }
    } catch (err) {
      console.error("[StaffList] role error:", err);
      setError("Failed to update role");
    }
  }

  async function handleSavePermissions() {
    if (!selectedStaff) return;
    setError("");
    try {
      const data = await updateStaff(selectedStaff.id, { permissions: permissionsDraft });
      if (data.ok) {
        await loadStaff();
      } else {
        setError(data.error || "Failed to update permissions");
      }
    } catch (err) {
      console.error("[StaffList] permissions error:", err);
      setError("Failed to update permissions");
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!selectedStaff || !resetPasswordValue) return;
    setError("");
    try {
      const data = await resetStaffPassword(selectedStaff.id, {
        password: resetPasswordValue,
      });
      if (data.ok) {
        setResetPasswordValue("");
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err) {
      console.error("[StaffList] reset error:", err);
      setError("Failed to reset password");
    }
  }

  async function handleSaveEmail() {
    if (!selectedStaff) return;
    setError("");
    try {
      const data = await updateStaff(selectedStaff.id, { email: emailDraft });
      if (data.ok) {
        await loadStaff();
      } else {
        setError(data.error || "Failed to update email");
      }
    } catch (err) {
      console.error("[StaffList] email error:", err);
      setError("Failed to update email");
    }
  }

  function togglePermission(key) {
    setPermissionsDraft((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">PAM / Staff Control</h2>
            <p className="panel-subtitle">
              Create and manage staff users, roles, and granular permissions.
            </p>
          </div>
          <div className="panel-actions">
            <button className="btn btn-primary" onClick={loadStaff} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
        {error && <div className="alert">{error}</div>}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Staff Directory</h3>
              <p className="panel-subtitle">Select a staff member to edit access.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={s.id === selectedId ? "table-row-active" : undefined}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{s.id}</td>
                    <td>{s.username}</td>
                    <td>{s.email || "-"}</td>
                    <td>{s.role}</td>
                    <td>{s.isActive ? "active" : "inactive"}</td>
                  </tr>
                ))}
                {!staff.length && !loading && (
                  <tr>
                    <td colSpan={5} className="empty">
                      No staff users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Selected Staff</h3>
                <p className="panel-subtitle">Edit role, status, and permissions.</p>
              </div>
            </div>

            {!selectedStaff && <div className="empty">Select a staff member to edit.</div>}

            {selectedStaff && (
              <div className="stack">
                <div className="grid-3">
                  <div>
                    <div className="stat-label">Username</div>
                    <div className="stat-value">{selectedStaff.username}</div>
                  </div>
                  <div>
                    <div className="stat-label">Email</div>
                    <input
                      type="email"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      className="input"
                      placeholder="email@domain.com"
                    />
                  </div>
                  <div>
                    <div className="stat-label">Role</div>
                    <select
                      value={selectedStaff.role}
                      onChange={(e) => handleChangeRole(selectedStaff, e.target.value)}
                      className="select"
                    >
                      <option value="operator">operator</option>
                      <option value="agent">agent</option>
                      <option value="distributor">distributor</option>
                      <option value="cashier">cashier</option>
                    </select>
                  </div>
                  <div>
                    <div className="stat-label">Status</div>
                    <button className="btn btn-ghost" onClick={() => handleToggleActive(selectedStaff)}>
                      {selectedStaff.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="panel-title">Permissions</div>
                  <div className="panel-subtitle">
                    Role defaults are applied when custom permissions are empty.
                  </div>
                </div>

                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="stat-label" style={{ marginBottom: 8 }}>
                      {group.label}
                    </div>
                    <div className="inline">
                      {group.perms.map((perm) => (
                        <label key={perm} className="tag" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={permissionsDraft.includes(perm)}
                            onChange={() => togglePermission(perm)}
                            style={{ marginRight: 6 }}
                          />
                          {perm}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="inline">
                  <button className="btn btn-secondary" onClick={handleSaveEmail}>
                    Save Email
                  </button>
                  <button className="btn btn-primary" onClick={handleSavePermissions}>
                    Save Permissions
                  </button>
                  <span className="tag tag-blue">Effective perms: {permissionsDraft.length}</span>
                </div>

                <form className="form-grid" onSubmit={handleResetPassword}>
                  <div className="field">
                    <label>Reset Password</label>
                    <input
                      type="password"
                      value={resetPasswordValue}
                      onChange={(e) => setResetPasswordValue(e.target.value)}
                      placeholder="New password"
                      className="input"
                    />
                  </div>
                  <div className="field" style={{ alignSelf: "end" }}>
                    <button className="btn btn-secondary" type="submit">
                      Reset
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Create Staff User</h3>
                <p className="panel-subtitle">Provision a new staff identity.</p>
              </div>
            </div>
            <form className="form-grid" onSubmit={handleCreate}>
              <div className="field">
                <label>Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input"
                  placeholder="email@domain.com"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div className="field">
                <label>Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="select"
                >
                  <option value="operator">operator</option>
                  <option value="agent">agent</option>
                  <option value="distributor">distributor</option>
                  <option value="cashier">cashier</option>
                </select>
              </div>
              <div className="field" style={{ justifyContent: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={newActive}
                    onChange={(e) => setNewActive(e.target.checked)}
                  />
                  Active
                </label>
              </div>
              <div className="field" style={{ alignSelf: "end" }}>
                <button type="submit" className="btn btn-primary">
                  Create Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
