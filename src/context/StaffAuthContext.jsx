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

  // Boot session from localStorage on first mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("ptu_staff_token");
      const savedStaff = localStorage.getItem("ptu_staff_payload");

      if (savedToken && savedStaff) {
        const parsedStaff = JSON.parse(savedStaff);
        setToken(savedToken);
        setStaff(parsedStaff);
        api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
      }
    } catch (e) {
      console.error("[StaffAuth] failed to restore session:", e);
    } finally {
      setLoading(false);
    }
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

      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      return true;
    } catch (err) {
      console.error("[StaffAuth] login error:", err);
      setError("Invalid username or password");
      return false;
    }
  }

  async function logout() {
    try {
      await api.post("/api/v1/staff/logout");
    } catch {
      // ignore logout errors
    }
    setStaff(null);
    setToken(null);
    setError("");
    localStorage.removeItem("ptu_staff_token");
    localStorage.removeItem("ptu_staff_payload");
    localStorage.removeItem("ptu_tenant_id");
    delete api.defaults.headers.common.Authorization;
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
