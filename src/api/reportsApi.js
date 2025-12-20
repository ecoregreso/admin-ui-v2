// src/api/reportsApi.js
import api from "./client";

/**
 * GET /api/v1/admin/reports/range?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function fetchRangeReport({ from, to }) {
  const res = await api.get("/api/v1/admin/reports/range", {
    params: { from, to },
  });
  return res.data;
}
