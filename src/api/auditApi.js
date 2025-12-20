import api from "./client";

export async function listAuditEvents({ limit = 120 } = {}) {
  const res = await api.get("/api/v1/admin/audit", {
    params: { limit },
  });
  return res.data;
}
