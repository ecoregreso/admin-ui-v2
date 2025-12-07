// src/api/reportsApi.js

// Backend base URL; you can also set this in a .env file as VITE_API_BASE_URL
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * Returns Authorization header if an access token is stored in localStorage.
 * Adjust this if you keep tokens somewhere else.
 */
function getAuthHeader() {
  const token = localStorage.getItem("accessToken");
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Fetch aggregated report for a given date range.
 * Expects your backend route:
 *   GET /admin/reports/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function fetchRangeReport(start, end) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);

  const res = await fetch(
    `${BASE_URL}/admin/reports/range?${params.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...getAuthHeader(),
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}
