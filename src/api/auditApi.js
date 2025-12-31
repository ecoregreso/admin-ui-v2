import api from "./client";

function normalizeDate(value) {
  if (!value) return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

export async function listAuditEvents({ limit = 120, from, to } = {}) {
  const params = {
    limit: Number(limit) || 120,
  };
  if (from) params.from = normalizeDate(from);
  if (to) params.to = normalizeDate(to);

  const res = await api.get("/api/v1/admin/audit", { params });
  return res.data || {};
}
