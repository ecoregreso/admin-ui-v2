import api from "./client";

export async function getOwnerAddress() {
  const res = await api.get("/api/v1/purchase-orders/owner-address");
  return res.data; // { ok, ownerBtcAddress }
}

export async function setOwnerAddress(ownerBtcAddress) {
  const res = await api.post("/api/v1/purchase-orders/owner-address", { ownerBtcAddress });
  return res.data; // { ok, ownerBtcAddress }
}

export async function createOrder(payload) {
  const res = await api.post("/api/v1/purchase-orders", payload);
  return res.data; // { ok, order }
}

export async function listOrders() {
  const res = await api.get("/api/v1/purchase-orders");
  return res.data; // { ok, orders }
}

export async function listMessages(orderId) {
  const res = await api.get(`/api/v1/purchase-orders/${orderId}/messages`);
  return res.data; // { ok, messages }
}

export async function postMessage(orderId, body) {
  const res = await api.post(`/api/v1/purchase-orders/${orderId}/messages`, { body });
  return res.data; // { ok, message }
}
