import api from "./client";

export async function fetchAnalyticsOverview(params) {
  const res = await api.get("/api/v1/admin/analytics/overview", { params });
  return res.data;
}

export async function fetchAnalyticsRevenue(params) {
  const res = await api.get("/api/v1/admin/analytics/revenue", { params });
  return res.data;
}

export async function fetchAnalyticsPlayers(params) {
  const res = await api.get("/api/v1/admin/analytics/players", { params });
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

export async function runAnalyticsAudit(params) {
  const res = await api.get("/api/v1/admin/audit/run", { params });
  return res.data;
}
