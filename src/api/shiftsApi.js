import api from "./client";

export async function fetchShiftSummary(date) {
  const res = await api.get("/api/v1/admin/shifts/summary", { params: { date } });
  return res.data?.data || res.data;
}

export async function closeShift(payload) {
  const res = await api.post("/api/v1/admin/shifts/close", payload);
  return res.data?.data || res.data;
}
