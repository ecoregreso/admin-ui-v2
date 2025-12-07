// src/layout/AdminLayout.jsx
import React from "react";
import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div
          style={{
            padding: "18px 18px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#4fd1ff",
            }}
          >
            Playtime USA
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "rgba(161,172,199,0.8)",
              marginTop: 4,
            }}
          >
            Admin backoffice
          </div>
        </div>

        <nav style={{ padding: "14px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          <SidebarLink to="/">Dashboard</SidebarLink>
          <SidebarLink to="/reports">Reports</SidebarLink>
          {/* add more links as you add more sections */}
        </nav>
      </aside>

      {/* Main content */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        "sidebar-link" + (isActive ? " sidebar-link-active" : "")
      }
      style={({ isActive }) => ({
        display: "block",
        padding: "8px 10px",
        borderRadius: 999,
        fontSize: "0.82rem",
        color: isActive ? "#4fd1ff" : "rgba(228,233,255,0.86)",
        textDecoration: "none",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        opacity: isActive ? 1 : 0.85,
        background: isActive
          ? "linear-gradient(120deg, rgba(79,209,255,0.16), rgba(255,77,189,0.1))"
          : "transparent",
        border: isActive
          ? "1px solid rgba(79,209,255,0.6)"
          : "1px solid transparent",
        transition:
          "background 0.18s ease-out, color 0.18s ease-out, border-color 0.18s ease-out, transform 0.12s ease-out",
      })}
    >
      {({ isActive }) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transform: isActive ? "translateX(2px)" : "translateX(0)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: isActive ? "#4fd1ff" : "rgba(255,255,255,0.22)",
            }}
          />
          {children}
        </span>
      )}
    </NavLink>
  );
}
