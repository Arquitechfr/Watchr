import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PWAUpdateHandler } from "./components/PWAUpdateHandler";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PWAUpdateHandler />
    <App />
  </StrictMode>,
);
