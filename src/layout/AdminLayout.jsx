import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";

function NavItem({ to, label, disabled }) {
  const location = useLocation();
  const safeTo = disabled ? location.pathname : to;

  return (
    <NavLink
      to={safeTo}
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
      className={({ isActive }) =>
        `nav-link${isActive ? " active" : ""}${disabled ? " disabled" : ""}`
      }
      aria-disabled={disabled}
    >
      <span className="nav-dot" />
      {label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { staff, logout } = useStaffAuth();
  const perms = staff?.permissions || [];
  const can = (perm) => perms.includes(perm);

  const sections = [
    {
      title: "Overview",
      items: [{ to: "/dashboard", label: "Dashboard", perms: ["finance:read"] }],
    },
    {
      title: "Operations",
      items: [
        { to: "/players", label: "Players", perms: ["player:read"] },
        { to: "/vouchers", label: "Vouchers", perms: ["voucher:read"] },
        { to: "/reports", label: "Reports", perms: ["finance:read"] },
      ],
    },
    {
      title: "Finance",
      items: [
        { to: "/transactions", label: "Transactions", perms: ["finance:read"] },
        { to: "/purchase-orders", label: "Funcoin Orders", perms: ["finance:read"] },
        { to: "/finance-queue", label: "Finance Queue", perms: ["finance:write", "finance:read"] },
      ],
    },
    {
      title: "Security",
      items: [
        { to: "/pam", label: "PAM / Staff", perms: ["staff:manage"] },
        { to: "/sessions", label: "Sessions", perms: ["staff:manage", "player:read"] },
        { to: "/audit", label: "Audit Log", perms: ["staff:manage"] },
      ],
    },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-row">
            <div className="logo-img-wrap">
              <img className="logo-img" src="/favicon.png" alt="PlayTime USA logo" />
            </div>
            <div>
              <div className="logo-title">PlayTime USA</div>
              <div className="logo-subtitle">Admin Core</div>
            </div>
          </div>
        </div>

        <div className="sidebar-status">
          <div className="status-label">System</div>
          <div className="status-value">
            <span className="status-dot" />
            Live secure channel
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="nav-section">{section.title}</div>
              {section.items.map((item) => {
                const required = item.perms || [];
                const allowed = required.length === 0 ? true : required.some(can);
                return (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    disabled={!allowed}
                  />
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {staff && (
            <div className="user-chip">
              <div className="user-avatar">
                {staff.username ? staff.username.slice(0, 1).toUpperCase() : "S"}
              </div>
              <div className="user-meta">
                <strong>{staff.username}</strong>
                <span>Role: {staff.role}</span>
              </div>
            </div>
          )}
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div>
            <h1 className="topbar-title">Operations Console</h1>
            <p className="topbar-subtitle">Real-time telemetry and control surface</p>
          </div>
          <div className="topbar-right">
            <span className="status-pill live">
              <span className="status-dot" /> Secure
            </span>
          </div>
          <div className="status-pill">Secure Session</div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
