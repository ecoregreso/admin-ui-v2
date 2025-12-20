import api from "./client";

export async function listTransactions({ type = "", from = "", to = "", userId = "", limit = 100 } = {}) {
  const res = await api.get("/api/v1/admin/transactions", {
    params: { type, from, to, userId, limit },
  });
  return res.data;
}
