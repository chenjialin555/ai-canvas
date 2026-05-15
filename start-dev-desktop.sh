#!/usr/bin/env bash
# 【源码开发】同时启动：FastAPI + Vite + Electron 开发窗口（从源码跑 Electron，不是已安装的 .exe）
#
# 若你已安装打包好的桌面客户端：请用 ./start-backend.sh 只起后端，再自己双击打开客户端；
# 不要用本脚本（本脚本会再起一套 Vite + 开发用 Electron）。
#
# 与 ./start-dev.sh 不同：本脚本会打开 Electron；与 ./start-web.sh 不同：本脚本用桌面壳而非浏览器。
# 依赖：Node/npm、uv，npm install、uv sync；electron、wait-on（npm install 已包含）

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

for cmd in npm uv; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "未找到命令: $cmd，请先安装后再运行本脚本。" >&2
    exit 1
  fi
done

if [[ ! -d node_modules ]]; then
  echo "正在安装前端依赖 (npm install)..."
  npm install
fi

if [[ ! -d .venv ]]; then
  echo "正在创建 Python 虚拟环境并安装依赖 (uv sync)..."
  uv sync
fi

echo "启动 AI Canvas 桌面版（开发）：uvicorn + Vite(5173) + Electron"
echo "API 地址见 preload（默认 http://127.0.0.1:13555），与 .env 中 API_PORT 对齐。"
exec npm run dev:desktop+api
