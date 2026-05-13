#!/usr/bin/env bash
# 同时启动：前端 Vite（默认 5173）+ 后端 FastAPI（端口见 .env 的 API_PORT，默认 13555）
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

echo "启动 AI Canvas：Vite（5173）+ uvicorn（默认端口 13555，可在 .env 设 API_PORT）"
exec npm run dev
