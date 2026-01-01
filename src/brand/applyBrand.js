const applyBrandToCssVars = (brand) => {
  if (!brand || typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const setVar = (name, value) => {
    if (value !== undefined && value !== null && value !== "") {
      root.style.setProperty(name, value);
    }
  };

  setVar("--pt-bg", brand.colors?.bg);
  setVar("--pt-panel", brand.colors?.panel);
  setVar("--pt-panel-strong", brand.colors?.panelStrong);
  setVar("--pt-panel-glass", brand.colors?.panelGlass);
  setVar("--pt-text", brand.colors?.text);
  setVar("--pt-text-muted", brand.colors?.textMuted);
  setVar("--pt-text-faint", brand.colors?.textFaint);
  setVar("--pt-accent", brand.colors?.accent);
  setVar("--pt-accent-soft", brand.colors?.accentSoft);
  setVar("--pt-danger", brand.colors?.danger);
  setVar("--pt-danger-soft", brand.colors?.dangerSoft);
  setVar("--pt-border", brand.colors?.border);
  setVar("--pt-border-strong", brand.colors?.borderStrong);
  setVar("--pt-border-rail", brand.colors?.borderRail);
  setVar("--pt-radius", brand.radius?.lg);
  setVar("--pt-radius-lg", brand.radius?.lg);
  setVar("--pt-radius-xl", brand.radius?.xl);
  setVar("--pt-radius-pill", brand.radius?.pill);
  setVar("--pt-font-base", brand.fonts?.base);
  setVar("--pt-font-display", brand.fonts?.display);
  setVar("--pt-glow", brand.glow?.accent);
  setVar("--pt-glow-danger", brand.glow?.danger);
  setVar("--pt-shadow-soft", brand.glow?.soft);
  setVar("--pt-shadow-strong", brand.glow?.strong);

  setVar("--bg-void", brand.colors?.bg);
  setVar("--bg-obsidian", brand.colors?.bgObsidian);
  setVar("--bg-metal", brand.colors?.bgMetal);
  setVar("--bg-panel", brand.colors?.panel);
  setVar("--bg-panel-strong", brand.colors?.panelStrong);
  setVar("--bg-panel-glass", brand.colors?.panelGlass);
  setVar("--text-primary", brand.colors?.text);
  setVar("--text-muted", brand.colors?.textMuted);
  setVar("--text-faint", brand.colors?.textFaint);
  setVar("--neon-blue", brand.colors?.accent);
  setVar("--neon-blue-soft", brand.colors?.accentSoft);
  setVar("--neon-red", brand.colors?.danger);
  setVar("--neon-red-soft", brand.colors?.dangerSoft);
  setVar("--neon-purple", brand.colors?.purple);
  setVar("--border-glass", brand.colors?.border);
  setVar("--border-strong", brand.colors?.borderStrong);
  setVar("--border-rail", brand.colors?.borderRail);
  setVar("--steel-1", brand.colors?.steel1);
  setVar("--steel-2", brand.colors?.steel2);
  setVar("--steel-3", brand.colors?.steel3);
  setVar("--steel-4", brand.colors?.steel4);
  setVar("--shadow-glow-blue", brand.glow?.accent);
  setVar("--shadow-glow-red", brand.glow?.danger);
  setVar("--shadow-soft", brand.glow?.soft);
  setVar("--shadow-strong", brand.glow?.strong);
  setVar("--radius-lg", brand.radius?.lg);
  setVar("--radius-xl", brand.radius?.xl);
  setVar("--radius-pill", brand.radius?.pill);
};

export default applyBrandToCssVars;
