import { DefaultBrand } from "./defaultBrand";

export const BrandPresets = {
  neon: {
    ...DefaultBrand,
    name: "Neon Night",
    colors: {
      ...DefaultBrand.colors,
      bg: "#040508",
      panel: "rgba(8, 14, 22, 0.82)",
      panelStrong: "rgba(6, 10, 16, 0.92)",
      text: "#f5f7ff",
      textMuted: "rgba(197, 208, 230, 0.7)",
      accent: "#3ff6ff",
      accentSoft: "rgba(63, 246, 255, 0.35)",
      danger: "#ff3c6f",
      dangerSoft: "rgba(255, 60, 111, 0.35)",
      borderRail: "rgba(63, 246, 255, 0.32)",
    },
    glow: {
      ...DefaultBrand.glow,
      accent: "0 0 24px rgba(63, 246, 255, 0.38)",
      danger: "0 0 24px rgba(255, 60, 111, 0.38)",
    },
  },

  luxe: {
    ...DefaultBrand,
    name: "Luxe Gold",
    colors: {
      ...DefaultBrand.colors,
      bg: "#0a0806",
      panel: "rgba(16, 12, 10, 0.84)",
      panelStrong: "rgba(12, 9, 7, 0.92)",
      text: "#f5f1e8",
      textMuted: "rgba(210, 202, 188, 0.7)",
      textFaint: "rgba(210, 202, 188, 0.5)",
      accent: "#f7c35f",
      accentSoft: "rgba(247, 195, 95, 0.32)",
      danger: "#e26a5b",
      dangerSoft: "rgba(226, 106, 91, 0.32)",
      border: "rgba(255, 255, 255, 0.06)",
      borderStrong: "rgba(255, 255, 255, 0.12)",
      borderRail: "rgba(247, 195, 95, 0.28)",
      steel1: "#f1eadc",
      steel2: "#d2c7b5",
      steel3: "#a89c88",
      steel4: "#7a6f5d",
    },
    glow: {
      ...DefaultBrand.glow,
      accent: "0 0 20px rgba(247, 195, 95, 0.35)",
      danger: "0 0 20px rgba(226, 106, 91, 0.35)",
    },
  },
};
