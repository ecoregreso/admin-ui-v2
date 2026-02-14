import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { StaffAuthProvider } from "./context/StaffAuthContext.jsx";
import { loadBrand } from "./brand/loadBrand";
import { applyBrandToCssVars } from "./brand/applyBrand";
import { applyThemeSettings, readThemeSettings } from "./utils/themeSettings";

async function bootstrap() {
  applyThemeSettings(readThemeSettings());

  try {
    const brand = await loadBrand();
    applyBrandToCssVars(brand);
  } catch {
    // Keep defaults if brand load fails.
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <StaffAuthProvider>
        <App />
      </StaffAuthProvider>
    </React.StrictMode>
  );
}

bootstrap();
