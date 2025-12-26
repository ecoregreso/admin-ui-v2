// src/api/reportsApi.js
import api from "./client";

/**
 * GET /api/v1/admin/reports/range?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function fetchRangeReport({ from, to }) {
  const res = await api.get("/api/v1/admin/reports/range", {
    params: { from, to, start: from, end: to },
  });
  return res.data;
}

export async function fetchDailyReport({ from, to }) {
  const res = await api.get("/api/v1/admin/reports/daily", {
    params: { from, to, start: from, end: to },
  });
  return res.data;
}

export async function fetchBehaviorReport({ from, to }) {
  const res = await api.get("/api/v1/admin/reports/behavior", {
    params: { from, to, start: from, end: to },
  });
  return res.data;
}
