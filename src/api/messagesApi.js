// src/api/messagesApi.js
import api from "./client";

export async function savePublicKey(publicKey, encryptedPrivateKey) {
  const res = await api.post("/api/v1/staff/messaging/keys", { publicKey, encryptedPrivateKey });
  return res.data;
}

export async function fetchPublicKey(username) {
  const res = await api.get(`/api/v1/staff/messaging/keys/${encodeURIComponent(username)}`);
  return res.data;
}

export async function fetchSelfKey() {
  const res = await api.get("/api/v1/staff/messaging/keys/self");
  return res.data;
}

export async function sendMessage({ to, ciphertext, type = "text", threadId = null }) {
  const res = await api.post("/api/v1/staff/messaging/messages", {
    to,
    ciphertext,
    type,
    threadId,
  });
  return res.data;
}

export async function listMessages({ withUser, threadId } = {}) {
  const params = {};
  if (withUser) params.with = withUser;
  if (threadId) params.threadId = threadId;
  const res = await api.get("/api/v1/staff/messaging/messages", { params });
  return res.data;
}

export async function markMessageRead(id) {
  const res = await api.post(`/api/v1/staff/messaging/messages/${id}/read`);
  return res.data;
}

export async function deleteMessage(id) {
  const res = await api.delete(`/api/v1/staff/messaging/messages/${id}`);
  return res.data;
}
