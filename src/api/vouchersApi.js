// src/api/vouchersApi.js
import api from "./client";

export async function listVouchers({ limit = 200 } = {}) {
  const res = await api.get(`/api/v1/vouchers?limit=${limit}`);
  return res.data; // array
}

export async function createVoucher({ amount, bonusAmount = 0, currency = "FUN" }) {
  const res = await api.post("/api/v1/vouchers", { amount, bonusAmount, currency });
  return res.data; // { voucher, pin, userCode, qr }
}
