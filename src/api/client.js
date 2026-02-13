// src/api/client.js
const TOKEN_KEY = "ptu_staff_token";
const STAFF_KEY = "ptu_staff_payload";
const TENANT_KEY = "ptu_tenant_id";

// Normalize provided base URL to avoid accidental double "/api/v1" paths.
const rawBase =
  typeof import.meta.env.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : "";
const defaultBase = import.meta.env.DEV ? "http://localhost:3000" : "";
const resolvedBase = rawBase || defaultBase;

// If someone sets the env to ".../api/v1" we strip that suffix,
// because all requests already prefix "/api/v1/...".
const baseURL = resolvedBase.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");

export function getApiBaseUrl() {
  return baseURL;
}

export function buildApiUrl(path = "") {
  if (!path) return baseURL;
  if (/^https?:\/\//i.test(path)) return path;
  if (!baseURL) return path;
  return `${baseURL}${path.startsWith("/") ? "" : "/"}${path}`;
}

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

function clearAuthStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STAFF_KEY);
  localStorage.removeItem(TENANT_KEY);
}

function handleUnauthorized(path) {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  if (path && String(path).includes("/api/v1/staff/login")) return;
  clearAuthStorage();
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

function buildUrl(path, params) {
  const isAbsolute = /^https?:\/\//i.test(path);
  if (!isAbsolute && !baseURL) {
    throw new Error("VITE_API_BASE_URL is not configured.");
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(isAbsolute ? path : `${baseURL}${normalizedPath}`);
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, String(v)));
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function request(method, path, config = {}) {
  const url = buildUrl(path, config.params);
  const headers = { ...(config.headers || {}) };
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body = config.body;
  if (body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body,
      credentials: "omit",
    });
  } catch (err) {
    const error = new Error("Network error");
    error.cause = err;
    throw error;
  }

  let data = null;
  if (res.status !== 204) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => "");
    }
  }

  const normalized = normalizeErrorPayload(data);
  const unwrapped = unwrapOkPayload(normalized);

  if (!res.ok) {
    const message =
      typeof normalized === "string"
        ? normalized
        : normalized?.error || normalized?.message || `Request failed (${res.status})`;
    const error = new Error(typeof message === "string" ? message : "Request failed");
    error.response = { status: res.status, data: normalized };
    error.status = res.status;
    if (res.status === 401) {
      handleUnauthorized(path);
    }
    throw error;
  }

  return { data: unwrapped, status: res.status, ok: res.ok, headers: res.headers };
}

const api = {
  get(path, config) {
    return request("GET", path, config);
  },
  post(path, body, config = {}) {
    return request("POST", path, { ...config, body });
  },
  put(path, body, config = {}) {
    return request("PUT", path, { ...config, body });
  },
  patch(path, body, config = {}) {
    return request("PATCH", path, { ...config, body });
  },
  delete(path, config = {}) {
    const { data, ...rest } = config;
    return request("DELETE", path, { ...rest, body: data });
  },
};

export default api;
