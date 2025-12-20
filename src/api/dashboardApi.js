import api from "./client";

export async function fetchDashboard() {
  const res = await api.get("/api/v1/admin/dashboard");
  return res.data;
}
