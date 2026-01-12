// src/api/vouchersApi.js
import api from "./client";

export async function listVouchers({ limit = 200 } = {}) {
  const res = await api.get(`/api/v1/vouchers?limit=${limit}`);
  return res.data; // array
}

export async function createVoucher({
  amount,
  bonusAmount = 0,
  currency = "FUN",
  tenantId,
} = {}) {
  const payload = { amount, bonusAmount, currency };
  if (tenantId) {
    payload.tenantId = tenantId;
  }
  const res = await api.post("/api/v1/vouchers", payload);
  return res.data; // { voucher, pin, userCode, qr }
}
