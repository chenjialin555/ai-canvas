#!/usr/bin/env bash
# 同时启动：FastAPI + Vite，在浏览器打开 http://127.0.0.1:5173 使用网页版。
# 与已安装桌面客户端无关；开发网页或纯浏览器使用本脚本。
# 热更新：npm run dev（等价于本脚本）；无热更新见 ./start-dev.sh
# 依赖：npm、uv，并已 npm install、uv sync

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

echo "启动网页版：Vite(5173) + uvicorn。请在浏览器打开 http://127.0.0.1:5173"
exec npm run dev
