import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { initPlatform } from "./shared/platform";
import { initUiTheme } from "./shared/lib/uiTheme";
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
