import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { initPlatform } from "./platform";
import { initUiTheme } from "./lib/uiTheme";
import "./styles/editor.css";
import "./styles/themes.css";
import "./styles/skin-intuly.css";
import "./styles/theme-bridge.css";
import "./styles/pro-tool-ui.css";

initUiTheme();
initPlatform();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
