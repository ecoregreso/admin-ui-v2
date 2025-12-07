// src/context/StaffAuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const StaffAuthContext = createContext(null);

export function StaffAuthProvider({ children }) {
  const [staff, setStaff] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("ptu_staff_token");
    const savedStaff = localStorage.getItem("ptu_staff_payload");

    if (savedToken && savedStaff) {
      try {
        setToken(savedToken);
        setStaff(JSON.parse(savedStaff));
      } catch {
        localStorage.removeItem("ptu_staff_token");
        localStorage.removeItem("ptu_staff_payload");
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await api.post("/api/v1/staff/login", { username, password });
    if (!res.data.ok) {
      throw new Error(res.data.error || "Login failed");
    }

    const { token: jwt, staff: staffData } = res.data;

    localStorage.setItem("ptu_staff_token", jwt);
    localStorage.setItem("ptu_staff_payload", JSON.stringify(staffData));

    setToken(jwt);
    setStaff(staffData);
    return staffData;
  };

  const logout = () => {
    localStorage.removeItem("ptu_staff_token");
    localStorage.removeItem("ptu_staff_payload");
    setToken(null);
    setStaff(null);
  };

  const value = {
    staff,
    token,
    isAuthenticated: !!token && !!staff,
    login,
    logout,
    loading,
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
