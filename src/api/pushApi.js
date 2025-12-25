import api from "./client";

export async function getVapidPublicKey() {
  const res = await api.get("/api/v1/staff/push/vapid-public");
  return res.data;
}

export async function listPushDevices() {
  const res = await api.get("/api/v1/staff/push/devices");
  return res.data;
}

export async function registerPushDevice(payload) {
  const res = await api.post("/api/v1/staff/push/register", payload);
  return res.data;
}

export async function deletePushDevice(id) {
  const res = await api.delete(`/api/v1/staff/push/devices/${id}`);
  return res.data;
}

export async function sendPushTest() {
  const res = await api.post("/api/v1/staff/push/test");
  return res.data;
}
