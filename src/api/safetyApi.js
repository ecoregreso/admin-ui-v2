import api from "./client";

export async function fetchSafetySummary(params) {
  const res = await api.get("/api/v1/admin/safety/summary", { params });
  return res.data;
}

export async function fetchSafetyActions(params) {
  const res = await api.get("/api/v1/admin/safety/actions", { params });
  return res.data;
}
