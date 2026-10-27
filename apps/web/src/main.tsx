import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./auth";
import { I18nProvider } from "./i18n";
import { CityProvider } from "./city";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("root em falta");
createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <CityProvider>
            <App />
          </CityProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
