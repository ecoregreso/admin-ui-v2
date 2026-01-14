import api from "./client";

export async function getTenantConfig(tenantId) {
  const params = tenantId ? { tenantId } : undefined;
  const res = await api.get("/api/v1/config", params ? { params } : undefined);
  return res.data;
}
