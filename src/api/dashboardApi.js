import api from "./client";

// Fetch range report; defaults to last 7 days if no dates provided
export async function fetchDashboard({ start, end } = {}) {
  const params = {};
  if (start) params.start = start;
  if (end) params.end = end;
  const res = await api.get("/api/v1/admin/reports/range", { params });
  return res.data;
}
