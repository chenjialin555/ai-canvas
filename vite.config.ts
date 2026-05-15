import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** 默认与 package.json 里 uvicorn 端口一致，避免与本机已占用的 8000 冲突 */
const DEFAULT_API_PORT = "13555";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.API_PORT || DEFAULT_API_PORT;
  /** start-dev.sh 会设 DEV_NO_RELOAD=1：不监听文件、不 HMR，改代码需重启进程 */
  const noReload = process.env.DEV_NO_RELOAD === "1";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      hmr: noReload ? false : undefined,
      watch: noReload ? null : undefined,
      proxy: {
        "/api": {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
