const THEME_SETTINGS_KEY = "ptu_admin_theme_settings";

const DEFAULT_THEME_SETTINGS = {
  mode: "dark",
  highContrast: false,
  compactDensity: false,
  neonAccents: true,
};

function normalizeMode(rawMode) {
  const mode = String(rawMode || "").toLowerCase();
  if (mode === "light" || mode === "dark" || mode === "auto") return mode;
  return DEFAULT_THEME_SETTINGS.mode;
}

function normalizeThemeSettings(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  return {
    mode: normalizeMode(input.mode),
    highContrast: Boolean(input.highContrast),
    compactDensity: Boolean(input.compactDensity),
    neonAccents: input.neonAccents == null ? DEFAULT_THEME_SETTINGS.neonAccents : Boolean(input.neonAccents),
  };
}

function resolveTheme(mode, win = window) {
  if (mode === "auto") {
    return win.matchMedia && win.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode === "light" ? "light" : "dark";
}

function readThemeSettings() {
  if (typeof window === "undefined") return { ...DEFAULT_THEME_SETTINGS };
  try {
    const raw = localStorage.getItem(THEME_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_THEME_SETTINGS };
    return normalizeThemeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_THEME_SETTINGS };
  }
}

function saveThemeSettings(rawSettings) {
  if (typeof window === "undefined") return normalizeThemeSettings(rawSettings);
  const settings = normalizeThemeSettings(rawSettings);
  try {
    localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore localStorage failures
  }
  return settings;
}

function applyThemeSettings(rawSettings, win = window) {
  if (!win || !win.document || !win.document.documentElement) {
    return { settings: normalizeThemeSettings(rawSettings), resolvedTheme: "dark" };
  }

  const root = win.document.documentElement;
  const settings = normalizeThemeSettings(rawSettings);
  const resolvedTheme = resolveTheme(settings.mode, win);

  root.setAttribute("data-theme-mode", settings.mode);
  root.setAttribute("data-theme", resolvedTheme);
  root.setAttribute("data-theme-contrast", settings.highContrast ? "high" : "normal");
  root.setAttribute("data-theme-density", settings.compactDensity ? "compact" : "comfortable");
  root.setAttribute("data-theme-neon", settings.neonAccents ? "on" : "off");

  return { settings, resolvedTheme };
}

export {
  THEME_SETTINGS_KEY,
  DEFAULT_THEME_SETTINGS,
  normalizeThemeSettings,
  readThemeSettings,
  saveThemeSettings,
  applyThemeSettings,
};
