// Lightweight client-side store for Funcoin purchase requests.
// This is a placeholder until a backend endpoint is available.

const STORAGE_KEY = "funcoin_purchase_orders";
const OWNER_ADDR_KEY = "funcoin_owner_btc_address";

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function saveAll(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    /* ignore storage failures */
  }
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `po-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function listOrders() {
  return loadAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getOwnerBtcAddress() {
  try {
    return localStorage.getItem(OWNER_ADDR_KEY) || "";
  } catch {
    return "";
  }
}

export function setOwnerBtcAddress(addr) {
  try {
    localStorage.setItem(OWNER_ADDR_KEY, addr || "");
  } catch {
    /* ignore */
  }
}

export async function createOrder({
  funAmount,
  btcAmount,
  btcRate,
  note,
  requestedBy,
  ownerBtcAddress,
}) {
  const now = new Date().toISOString();
  const order = {
    id: uid(),
    funAmount,
    btcAmount,
    btcRate,
    note: note || "",
    ownerBtcAddress: ownerBtcAddress || getOwnerBtcAddress() || "",
    requestedBy,
    createdAt: now,
    updatedAt: now,
  };

  const current = loadAll();
  current.push(order);
  saveAll(current);
  return order;
}

export async function updateOrderStatus(id, nextStatus, approver, ownerBtcAddress) {
  const list = loadAll();
  const idx = list.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error("Order not found");

  list[idx] = {
    ...list[idx],
    status: nextStatus,
    approvedBy: approver || list[idx].approvedBy,
    ownerBtcAddress: ownerBtcAddress || list[idx].ownerBtcAddress,
    updatedAt: new Date().toISOString(),
  };
  saveAll(list);
  return list[idx];
}
