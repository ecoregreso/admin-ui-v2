// src/context/StaffAuthContext.jsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const StaffAuthContext = createContext(null);

export function StaffAuthProvider({ children }) {
  const [staff, setStaff] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // session bootstrap
  const [error, setError] = useState("");

  function clearSession() {
    setStaff(null);
    setToken(null);
    setError("");
    localStorage.removeItem("ptu_staff_token");
    localStorage.removeItem("ptu_staff_payload");
    localStorage.removeItem("ptu_tenant_id");
  }

  // Boot session from localStorage on first mount + validate token
  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const savedToken = localStorage.getItem("ptu_staff_token");
        const savedStaff = localStorage.getItem("ptu_staff_payload");

        if (savedToken && active) {
          setToken(savedToken);
        }

        if (savedToken && savedStaff) {
          const parsedStaff = JSON.parse(savedStaff);
          if (active) {
            setStaff(parsedStaff);
          }
        }

        if (savedToken) {
          const res = await api.get("/api/v1/staff/me");
          const staffPayload = res.data?.staff;
          if (!staffPayload) {
            throw new Error("Invalid session");
          }
          if (active) {
            setStaff(staffPayload);
            localStorage.setItem("ptu_staff_payload", JSON.stringify(staffPayload));
          }
        }
      } catch (e) {
        console.error("[StaffAuth] failed to restore session:", e);
        if (active) {
          clearSession();
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function login({ username, password, tenantId = null }) {
    setError("");

    try {
      const payload = { username, password };
      if (tenantId) payload.tenantId = tenantId;

      const res = await api.post("/api/v1/staff/login", payload);

      const accessToken = res.data?.token || res.data?.tokens?.accessToken;
      const staffPayload = res.data?.staff;

      if (!res.data || !res.data.ok || !accessToken || !staffPayload) {
        throw new Error("Unexpected login response");
      }

      setToken(accessToken);
      setStaff(staffPayload);

      localStorage.setItem("ptu_staff_token", accessToken);
      localStorage.setItem("ptu_staff_payload", JSON.stringify(staffPayload));
      if (tenantId) localStorage.setItem("ptu_tenant_id", String(tenantId));
      else localStorage.removeItem("ptu_tenant_id");

      return true;
    } catch (err) {
      console.error("[StaffAuth] login error:", err);
      if (err?.response?.status === 401) {
        setError("Invalid username or password");
      } else {
        const message = err?.response?.data?.error || err?.message || "";
        setError(message || "Login failed");
      }
      return false;
    }
  }

  async function logout() {
    try {
      await api.post("/api/v1/staff/logout");
    } catch {
      // ignore logout errors
    }
    clearSession();
  }

  const value = {
    staff,
    token,
    loading, // session loading (used by PrivateRoute)
    error,
    isAuthenticated: !!staff && !!token,
    login,
    logout,
  };

  return (
    <StaffAuthContext.Provider value={value}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) {
    throw new Error("useStaffAuth must be used within StaffAuthProvider");
  }
  return ctx;
}
