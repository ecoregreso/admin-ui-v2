import api from "./client";

export async function listPlayers({ search = "", status = "", limit = 200 } = {}) {
  const res = await api.get("/api/v1/admin/players", {
    params: { search, status, limit },
  });
  return res.data;
}

export async function getPlayer(id) {
  const res = await api.get(`/api/v1/admin/players/${id}`);
  return res.data;
}

export async function adjustPlayerBalance(id, { amount, reason, currency } = {}) {
  const res = await api.post(`/api/v1/admin/players/${id}/adjust`, {
    amount,
    reason,
    currency,
  });
  return res.data;
}

export async function getPlayerTransactions(id, { limit = 50, all = false } = {}) {
  const params = { limit };
  if (all) params.all = 1;
  const res = await api.get(`/api/v1/admin/players/${id}/transactions`, {
    params,
  });
  return res.data;
}

export async function getPlayerRounds(id, { limit = 50, all = false } = {}) {
  const params = { limit };
  if (all) params.all = 1;
  const res = await api.get(`/api/v1/admin/players/${id}/rounds`, {
    params,
  });
  return res.data;
}

export async function getPlayerSessions(id, { limit = 200 } = {}) {
  const res = await api.get(`/api/v1/admin/players/${id}/sessions`, {
    params: { limit },
  });
  return res.data;
}
