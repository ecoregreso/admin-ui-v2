function setVar(root, key, value) {
  if (value === undefined || value === null || value === "") return;
  root.style.setProperty(key, String(value));
}

export function applyBrandToCssVars(brand) {
  if (!brand || typeof document === "undefined") return;
  const root = document.documentElement;

  setVar(root, "--pt-brand-name", brand?.name || "PlayTime USA");
  setVar(root, "--pt-logo-url", brand?.logoUrl || "");

  const c = brand?.colors || {};
  setVar(root, "--pt-bg", c.bg);
  setVar(root, "--pt-panel", c.panel ?? c.surface);
  setVar(root, "--pt-panel-strong", c.panelStrong ?? c.surfaceStrong);
  setVar(root, "--pt-panel-glass", c.panelGlass ?? c.surfaceGlass);
  setVar(root, "--pt-text", c.text);
  setVar(root, "--pt-text-muted", c.textMuted ?? c.mutedText);
  setVar(root, "--pt-text-faint", c.textFaint ?? c.faintText);
  setVar(root, "--pt-accent", c.accent ?? c.primary);
  setVar(root, "--pt-accent-soft", c.accentSoft);
  setVar(root, "--pt-danger", c.danger);
  setVar(root, "--pt-danger-soft", c.dangerSoft);
  setVar(root, "--pt-border", c.border);
  setVar(root, "--pt-border-strong", c.borderStrong);
  setVar(root, "--pt-border-rail", c.borderRail);
  setVar(root, "--pt-steel-1", c.steel1);
  setVar(root, "--pt-steel-2", c.steel2);
  setVar(root, "--pt-steel-3", c.steel3);
  setVar(root, "--pt-steel-4", c.steel4);
  setVar(root, "--bg-obsidian", c.bgObsidian);
  setVar(root, "--bg-metal", c.bgMetal);
  setVar(root, "--bg-panel", c.panel ?? c.surface);
  setVar(root, "--bg-panel-strong", c.panelStrong ?? c.surfaceStrong);
  setVar(root, "--bg-panel-glass", c.panelGlass ?? c.surfaceGlass);
  setVar(root, "--text-primary", c.text);
  setVar(root, "--text-muted", c.textMuted ?? c.mutedText);
  setVar(root, "--text-faint", c.textFaint ?? c.faintText);
  setVar(root, "--neon-blue", c.accent ?? c.primary);
  setVar(root, "--neon-blue-soft", c.accentSoft);
  setVar(root, "--neon-red", c.danger);
  setVar(root, "--neon-red-soft", c.dangerSoft);
  setVar(root, "--neon-purple", c.purple);
  setVar(root, "--border-glass", c.border);
  setVar(root, "--border-strong", c.borderStrong);
  setVar(root, "--border-rail", c.borderRail);
  setVar(root, "--steel-1", c.steel1);
  setVar(root, "--steel-2", c.steel2);
  setVar(root, "--steel-3", c.steel3);
  setVar(root, "--steel-4", c.steel4);

  const f = brand?.fonts || {};
  setVar(root, "--pt-font-base", f.base);
  setVar(root, "--pt-font-display", f.display);

  const r = brand?.radius || brand?.ui || {};
  setVar(root, "--pt-radius", r.radius ?? r.lg);
  setVar(root, "--pt-radius-lg", r.lg ?? r.radius);
  setVar(root, "--pt-radius-xl", r.xl);
  setVar(root, "--pt-radius-pill", r.pill);

  const g = brand?.glow || brand?.ui || {};
  setVar(root, "--pt-glow", g.accent ?? g.glow);
  setVar(root, "--pt-glow-danger", g.danger);
  setVar(root, "--pt-shadow-soft", g.soft);
  setVar(root, "--pt-shadow-strong", g.strong);
  setVar(root, "--shadow-glow-blue", g.accent ?? g.glow);
  setVar(root, "--shadow-glow-red", g.danger);
  setVar(root, "--shadow-soft", g.soft);
  setVar(root, "--shadow-strong", g.strong);
}
