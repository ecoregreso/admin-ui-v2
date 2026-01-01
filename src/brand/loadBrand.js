import DefaultBrand from "./defaultBrand.js";
import { presets } from "./presets.js";

const mergeSection = (base, override) => ({
  ...base,
  ...(override || {})
});

const mergeBrand = (base, override) => {
  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    colors: mergeSection(base.colors, override.colors),
    fonts: mergeSection(base.fonts, override.fonts),
    radius: mergeSection(base.radius, override.radius),
    glow: mergeSection(base.glow, override.glow)
  };
};

const getBrandFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("brand");
    if (key && presets[key]) {
      return presets[key];
    }
  } catch {
    return null;
  }

  return null;
};

const fetchBrand = async (url) => {
  try {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data && data.brand ? data.brand : data;
  } catch {
    return null;
  }
};

const loadBrand = async () => {
  const preset = getBrandFromUrl();
  if (preset) {
    return mergeBrand(DefaultBrand, preset);
  }

  const remote = (await fetchBrand("/public/brand")) || (await fetchBrand("/api/v1/public/brand"));
  return mergeBrand(DefaultBrand, remote || {});
};

export default loadBrand;
