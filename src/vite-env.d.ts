/// <reference types="vite/client" />

/** 可选：生产/桌面直连后端，例如 https://api.example.com 或 http://127.0.0.1:13555 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
