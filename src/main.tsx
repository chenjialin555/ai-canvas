import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { initPlatform } from "./platform";
import "./styles/editor.css";

initPlatform();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
