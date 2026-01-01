import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { StaffAuthProvider } from "./context/StaffAuthContext.jsx";
import loadBrand from "./brand/loadBrand.js";
import applyBrandToCssVars from "./brand/applyBrand.js";

const root = ReactDOM.createRoot(document.getElementById("root"));

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <StaffAuthProvider>
        <App />
      </StaffAuthProvider>
    </React.StrictMode>
  );
};

const bootstrap = async () => {
  try {
    const brand = await loadBrand();
    applyBrandToCssVars(brand);
  } catch {
    // Fall back to CSS defaults.
  }

  renderApp();
};

bootstrap();
