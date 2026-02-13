import api from "./client";

export async function getTenantConfig(tenantId) {
  const params = tenantId ? { tenantId } : undefined;
  const res = await api.get("/api/v1/config", params ? { params } : undefined);
  return res.data;
}

export async function getVoucherWinCapOptions(tenantId) {
  const params = tenantId ? { tenantId } : undefined;
  const res = await api.get(
    "/api/v1/config/voucher-win-cap/options",
    params ? { params } : undefined
  );
  return res.data;
}

export async function updateVoucherWinCapPolicy({
  tenantId,
  voucherWinCapPolicy,
}) {
  const payload = { voucherWinCapPolicy };
  if (tenantId) {
    payload.tenantId = tenantId;
  }
  const res = await api.put("/api/v1/config/voucher-win-cap/policy", payload);
  return res.data;
}
