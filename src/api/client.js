// src/api/client.js
import axios from "axios";

// Normalize provided base URL to avoid accidental double "/api/v1" paths.
const rawBase =
  typeof import.meta.env.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL
    : "http://localhost:3000";

// If someone sets the env to ".../api/v1" we strip that suffix,
// because all requests already prefix "/api/v1/...".
const baseURL = rawBase.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");

const api = axios.create({
  baseURL,
});

function normalizeErrorPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.ok === false && payload.error && typeof payload.error === "object") {
    const message = payload.error.message || payload.error.code || "Request failed";
    return {
      ...payload,
      error: message,
      errorDetails: payload.error,
    };
  }
  return payload;
}

function unwrapOkPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  if (payload.ok === true && "data" in payload) {
    const { ok, data, ...rest } = payload;
    if (Object.keys(rest).length === 0) {
      if (data && typeof data === "object" && !("ok" in data)) {
        data.ok = ok;
      }
      return data;
    }
  }
  return payload;
}

// Attach token automatically if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ptu_staff_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const normalized = normalizeErrorPayload(response.data);
    response.data = unwrapOkPayload(normalized);
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    if (error?.response?.data) {
      const normalized = normalizeErrorPayload(error.response.data);
      error.response.data = normalized;
      if (normalized?.error && typeof normalized.error === "string") {
        error.message = normalized.error;
      }
    }
    if (status === 501 && (!error?.message || error.message === "Network Error")) {
      error.message = "Not implemented";
    }
    if (status === 401) {
      localStorage.removeItem("ptu_staff_token");
      localStorage.removeItem("ptu_staff_payload");
      delete api.defaults.headers.common.Authorization;
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
