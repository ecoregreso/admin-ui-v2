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

// Attach token automatically if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ptu_staff_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
