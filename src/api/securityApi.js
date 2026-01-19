import api from "./client";

export async function runSecurityProbes(body, headers = {}) {
  const res = await api.post("/api/v1/admin/security/probes", body, { headers });
  return res.data;
}

export async function fetchSecurityStatus() {
  const res = await api.get("/api/v1/admin/security/probes/status");
  return res.data;
}
