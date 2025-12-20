import api from "./client";

// GET /api/v1/admin/staff
export async function listStaff() {
  const res = await api.get("/api/v1/admin/staff");
  return res.data; // { ok, staff: [...] }
}

// POST /api/v1/admin/staff
export async function createStaff({ username, password, role, isActive, permissions }) {
  const res = await api.post("/api/v1/admin/staff", {
    username,
    password,
    role,
    isActive,
    permissions,
  });
  return res.data; // { ok, staff }
}

// PATCH /api/v1/admin/staff/:id
export async function updateStaff(id, { role, isActive, permissions }) {
  const res = await api.patch(`/api/v1/admin/staff/${id}`, {
    role,
    isActive,
    permissions,
  });
  return res.data; // { ok, staff }
}

// PATCH /api/v1/admin/staff/:id/password
export async function resetStaffPassword(id, { password }) {
  const res = await api.patch(`/api/v1/admin/staff/${id}/password`, {
    password,
  });
  return res.data; // { ok: true }
}
