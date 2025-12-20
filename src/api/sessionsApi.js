import api from "./client";

export async function listSessions({ actorType = "all", status = "all", limit = 100 } = {}) {
  const res = await api.get("/api/v1/admin/sessions", {
    params: { actorType, status, limit },
  });
  return res.data;
}

export async function revokeSession(id) {
  const res = await api.post(`/api/v1/admin/sessions/${id}/revoke`);
  return res.data;
}
