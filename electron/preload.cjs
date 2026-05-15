const { contextBridge } = require("electron");

const DEFAULT_API =
  process.env.AI_CANVAS_API_BASE_URL?.trim() || "http://127.0.0.1:13555";

contextBridge.exposeInMainWorld("desktopAPI", {
  getApiBaseUrl: () => DEFAULT_API.replace(/\/$/, ""),
});
