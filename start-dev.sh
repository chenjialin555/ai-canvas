#!/usr/bin/env bash
# 同时启动：前端 Vite（默认 5173）+ 后端 FastAPI（端口见 .env 的 API_PORT，默认 13555）
# 本脚本为「无热更新」模式：改代码后需 Ctrl+C 停掉再重新运行本脚本；浏览器也需刷新。
# 若需要保存即热更新，请用：npm run dev
# 依赖：已安装 Node/npm、uv，并已 npm install、uv sync

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

echo "启动 AI Canvas（无热更新）：Vite 5173 + uvicorn 默认 13555（.env 可设 API_PORT）"
echo "改代码后请：1) Ctrl+C 结束  2) 再运行 ./start-dev.sh  3) 浏览器刷新"
exec npm run dev:no-reload

