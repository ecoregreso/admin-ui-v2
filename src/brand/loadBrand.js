import api from "../api/client";
import { DefaultBrand } from "./defaultBrand";
import { BrandPresets } from "./presets";

function deepMerge(base, override) {
  if (!override) return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v && typeof v === "object" && !Array.isArray(v) && base?.[k] && typeof base[k] === "object") {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function tryGet(path) {
  try {
    const res = await api.get(path, { timeout: 5000 });
    const data = res?.data ?? null;
    return data && data.brand ? data.brand : data;
  } catch {
    return null;
  }
}

// Loads brand config.
// Priority:
// 1) ?brand=presetName (demo mode)
// 2) backend endpoint (/public/brand OR /api/v1/public/brand)
// 3) DefaultBrand fallback
export async function loadBrand() {
  let preset = null;
  try {
    const url = new URL(window.location.href);
    preset = url.searchParams.get("brand");
  } catch {
    preset = null;
  }
  if (preset && BrandPresets[preset]) return BrandPresets[preset];

  const fromPublic = await tryGet("/public/brand");
  if (fromPublic) return deepMerge(DefaultBrand, fromPublic);

  const fromV1 = await tryGet("/api/v1/public/brand");
  if (fromV1) return deepMerge(DefaultBrand, fromV1);

  return DefaultBrand;
}
