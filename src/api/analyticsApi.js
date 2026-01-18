import api from "./client";

function normalizeRangeParams(params = {}) {
  const out = { ...params };
  const normalizeDate = (value) => {
    if (!value) return value;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value);
  };
  if (out.from) out.from = normalizeDate(out.from);
  if (out.to) out.to = normalizeDate(out.to);
  if (out.start) out.start = normalizeDate(out.start);
  if (out.end) out.end = normalizeDate(out.end);
  return out;
}

export async function fetchAnalyticsOverview(params) {
  const res = await api.get("/api/v1/admin/analytics/overview", { params });
  return res.data;
}

export async function fetchAnalyticsRevenue(params) {
  const res = await api.get("/api/v1/admin/analytics/revenue", { params });
  return res.data;
}

const normalizeParams = (params = {}) => {
  const out = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (value instanceof Date) {
      out[key] = value.toISOString().slice(0, 10);
      return;
    }
    out[key] = value;
  });
  return normalizeRangeParams(out);
};

export async function fetchAnalyticsPlayers(params) {
  const res = await api.get("/api/v1/admin/analytics/players", {
    params: normalizeParams(params),
  });
  return res.data;
}

export async function fetchAnalyticsGames(params) {
  const res = await api.get("/api/v1/admin/analytics/games", { params });
  return res.data;
}

export async function fetchAnalyticsOps(params) {
  const res = await api.get("/api/v1/admin/analytics/ops", { params });
  return res.data;
}

export async function fetchAnalyticsFunnel(params) {
  const res = await api.get("/api/v1/admin/analytics/funnel", { params });
  return res.data;
}

export async function fetchAnalyticsLtv(params) {
  const res = await api.get("/api/v1/admin/analytics/ltv", { params });
  return res.data;
}

export async function fetchAnalyticsAttribution(params) {
  const res = await api.get("/api/v1/admin/analytics/attribution", { params });
  return res.data;
}

export async function fetchJackpotsSummary(params) {
  const res = await api.get("/api/v1/admin/jackpots/summary", { params });
  return res.data;
}

export async function runAnalyticsAudit(params) {
  const res = await api.get("/api/v1/admin/audit/run", {
    params: normalizeRangeParams(params),
  });
  return res.data;
}
