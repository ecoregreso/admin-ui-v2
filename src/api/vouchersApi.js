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
  maxCashout,
  winCapMode,
  winCapPercent,
} = {}) {
  const payload = { amount, bonusAmount, currency };
  if (tenantId) {
    payload.tenantId = tenantId;
  }
  if (maxCashout !== undefined && maxCashout !== null && maxCashout !== "") {
    payload.maxCashout = maxCashout;
  }
  if (winCapMode) {
    payload.winCapMode = winCapMode;
  }
  if (winCapPercent !== undefined && winCapPercent !== null && winCapPercent !== "") {
    payload.winCapPercent = winCapPercent;
  }
  const res = await api.post("/api/v1/vouchers", payload);
  return res.data; // { voucher, pin, userCode, qr }
}
